import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from psycopg.types.json import Jsonb

from app.dashauth import ensure_dashboard_tenant_access, require_dashboard_user
from app.db import get_connection
from app.research import build_icp, feature_enabled, research_web

router = APIRouter(prefix="/research", tags=["research"])
CANDIDATE_STATUSES = {"all", "draft", "approved", "rejected", "delivered"}

def _enabled():
    if not feature_enabled(): raise HTTPException(status_code=404, detail="Research Agent is disabled")

def _access(cur, email, tenant_id):
    cur.execute("select 1 from tenants where id = %s", (tenant_id,))
    if cur.fetchone() is None: raise HTTPException(status_code=404, detail="No such company")
    ensure_dashboard_tenant_access(cur, email, tenant_id)

@router.post("/icp/generate")
def generate_icp(tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    _enabled()
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur, email, str(tenant_id)); profile, narrative, completeness = build_icp(cur, str(tenant_id))
        cur.execute("""insert into icp_profiles (tenant_id, profile_json, narrative, data_completeness)
          values (%s,%s,%s,%s) on conflict (tenant_id) do update set profile_json=excluded.profile_json,
          narrative=excluded.narrative, data_completeness=excluded.data_completeness, generated_at=now()
          returning profile_json,narrative,data_completeness,generated_at""", (str(tenant_id), Jsonb(profile), narrative, Jsonb(completeness)))
        p, n, c, at = cur.fetchone(); conn.commit()
    return {"profile": p, "narrative": n, "data_completeness": c, "generated_at": at.isoformat()}

@router.get("/icp")
def get_icp(tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    _enabled()
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur, email, str(tenant_id)); cur.execute("select profile_json,narrative,data_completeness,generated_at from icp_profiles where tenant_id=%s", (str(tenant_id),)); row=cur.fetchone()
    if not row: raise HTTPException(status_code=404, detail="Generate the ICP first")
    p,n,c,at=row; return {"profile":p,"narrative":n,"data_completeness":c,"generated_at":at.isoformat()}

def _run(tenant_id, email, kind, params):
    _enabled()
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur,email,tenant_id)
        cur.execute(
            "select pg_advisory_xact_lock(hashtextextended(cast(%s as text), 17))",
            (tenant_id,),
        )
        cur.execute(
            """
            select 1 from research_runs
            where tenant_id = %s and created_at > now() - interval '45 seconds'
            limit 1
            """,
            (tenant_id,),
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=429,
                detail="Please wait 45 seconds before starting another research run",
            )
        if kind == "customer":
            cur.execute("select profile_json from icp_profiles where tenant_id=%s",(tenant_id,)); row=cur.fetchone()
            if not row: raise HTTPException(status_code=409, detail="Generate an ICP before customer research")
            product_terms=[x["name"] for x in row[0].get("top_products",[])][:3]
            industry = str(params.get("industry") or "").strip()
            terms = ([industry] if industry else []) + product_terms
            if not terms:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Tell the Agent what product or industry you sell to first. "
                        "You can also upload an item-level sales book so ARQ fills this in."
                    ),
                )
        else:
            product=str(params.get("product","")).strip(); baseline=params.get("baseline")
            if not product or baseline is None: raise HTTPException(status_code=422, detail="Product and current cost baseline are required")
            terms=[product]
        provider = "tavily" if os.environ.get("TAVILY_API_KEY") else "guidance"
        cur.execute("insert into research_runs (tenant_id,type,status,params_json,provider) values (%s,%s,'running',%s,%s) returning id",(tenant_id,kind,Jsonb(params),provider)); (run_id,)=cur.fetchone()
        try: found, summary = research_web(kind, terms, params)
        except Exception as exc:
            cur.execute("update research_runs set status='failed' where id=%s",(run_id,)); conn.commit(); raise HTTPException(status_code=503,detail=f"Research provider unavailable: {exc}") from exc
        cur.executemany("""insert into research_candidates (tenant_id,run_id,type,name,location,contact,source_url,retrieved_at,fit_score,fit_reason,enrichment_json)
          values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",[(tenant_id,str(run_id),kind,x["name"],x["location"],x["contact"],x["source_url"],x["retrieved_at"],x["fit_score"],x["fit_reason"],Jsonb(x["enrichment"])) for x in found])
        stored_params = {**params, "research_summary": summary}
        cur.execute("update research_runs set status='completed', params_json=%s where id=%s",(Jsonb(stored_params),run_id)); conn.commit()
    return {"run_id":str(run_id),"status":"completed","candidates_created":len(found),"research_summary":summary}

@router.post("/customers/run")
async def run_customers(request: Request, tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    try:
        params = await request.json()
    except Exception:
        params = {}
    return _run(str(tenant_id),email,"customer",params)

@router.post("/materials/run")
async def run_materials(request: Request, tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    return _run(str(tenant_id),email,"material",await request.json())

@router.get("/latest")
def latest_runs(tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    """Restore the latest completed customer and supplier work after a refresh."""
    _enabled()
    restored = {}
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur, email, str(tenant_id))
        cur.execute(
            """
            with ranked as (
              select id, type, params_json, created_at,
                     row_number() over (
                       partition by type order by created_at desc, id desc
                     ) as run_rank
              from research_runs
              where tenant_id = %s and status = 'completed'
            )
            select id, type, params_json, created_at
            from ranked
            where run_rank = 1
            """,
            (str(tenant_id),),
        )
        for run_id, kind, params, created_at in cur.fetchall():
            cur.execute(
                """
                select id,name,location,contact,source_url,retrieved_at,
                       fit_score,fit_reason,status,enrichment_json
                from research_candidates
                where tenant_id=%s and run_id=%s
                order by fit_score desc
                """,
                (str(tenant_id), str(run_id)),
            )
            candidates = [
                {
                    "id": str(candidate_id),
                    "name": name,
                    "location": location,
                    "contact": contact,
                    "source_url": source_url,
                    "retrieved_at": retrieved_at.isoformat(),
                    "fit_score": fit_score,
                    "fit_reason": fit_reason,
                    "status": status,
                    "enrichment": enrichment,
                }
                for (
                    candidate_id, name, location, contact, source_url,
                    retrieved_at, fit_score, fit_reason, status, enrichment,
                ) in cur.fetchall()
            ]
            restored["customers" if kind == "customer" else "suppliers"] = {
                "run_id": str(run_id),
                "completed_at": created_at.isoformat(),
                "summary": (params or {}).get("research_summary"),
                "candidates": candidates,
            }
    return {"runs": restored}


def _candidate_rows(cur, tenant_id: str, run_id: str, status: str):
    if status not in CANDIDATE_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid candidate status")
    query = """
        select id,name,location,contact,source_url,retrieved_at,
               fit_score,fit_reason,status,enrichment_json
        from research_candidates
        where tenant_id=%s and run_id=%s
    """
    params = [tenant_id, run_id]
    if status != "all":
        query += " and status=%s"
        params.append(status)
    query += " order by fit_score desc"
    cur.execute(query, params)
    return cur.fetchall()

@router.get("/runs/{run_id}/candidates")
def list_candidates(run_id: UUID, tenant_id: UUID = Query(), status: str = Query(default="draft"), email: str = Depends(require_dashboard_user)):
    _enabled()
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur,email,str(tenant_id)); rows = _candidate_rows(cur, str(tenant_id), str(run_id), status)
    return [{"id":str(i),"name":n,"location":l,"contact":c,"source_url":u,"retrieved_at":at.isoformat(),"fit_score":s,"fit_reason":r,"status":st,"enrichment":enrichment} for i,n,l,c,u,at,s,r,st,enrichment in rows]

@router.patch("/candidates/{candidate_id}")
async def update_candidate(candidate_id: UUID, request: Request, tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    _enabled(); status=(await request.json()).get("status")
    if status not in {"approved","rejected"}: raise HTTPException(status_code=422,detail="Status must be approved or rejected")
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur,email,str(tenant_id)); cur.execute("update research_candidates set status=%s where id=%s and tenant_id=%s returning id",(status,str(candidate_id),str(tenant_id)))
        if not cur.fetchone(): raise HTTPException(status_code=404,detail="Candidate not found")
        conn.commit()
    return {"id":str(candidate_id),"status":status}

@router.post("/candidates/deliver")
async def deliver(request: Request, tenant_id: UUID = Query(), email: str = Depends(require_dashboard_user)):
    _enabled(); body=await request.json(); ids=body.get("candidate_ids",[]); limit=min(max(int(body.get("limit",5)),1),20)
    with get_connection() as conn, conn.cursor() as cur:
        _access(cur,email,str(tenant_id)); cur.execute("select id,name,location,contact,source_url,fit_reason from research_candidates where tenant_id=%s and id=any(%s) and status='approved' order by fit_score desc limit %s",(str(tenant_id),ids,limit)); rows=cur.fetchall()
        cur.execute("update research_candidates set status='delivered' where tenant_id=%s and id=any(%s) and status='approved'",(str(tenant_id),[str(x[0]) for x in rows])); conn.commit()
    block = "\n\n".join(
        f"*{name}*{(' — ' + location) if location else ''}\n"
        f"{reason}\n"
        f"{('Contact: ' + contact + chr(10)) if contact else ''}"
        f"Source: {source_url}"
        for _, name, location, contact, source_url, reason in rows
    )
    return {"delivered":len(rows),"message":block}
