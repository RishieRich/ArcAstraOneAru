import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_connection
from app.routers import ask, auth_dashboard, dashboard, devices, sync

app = FastAPI(title="ARQ Tally Connector API")

# The connector (a desktop exe) is not a browser and ignores CORS, but the
# planned JSX metrics dashboard is. Set CORS_ORIGINS in Vercel to a
# comma-separated list of dashboard origins once it exists; "*" until then.
_origins = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(sync.router)
app.include_router(dashboard.router)
app.include_router(ask.router)
app.include_router(auth_dashboard.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict:
    """Proves the deployment can actually reach Neon — check this first after deploying."""
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("select count(*) from tenants")
            (tenants,) = cur.fetchone()
        return {"status": "ok", "db": "reachable", "tenants": tenants}
    except Exception as e:
        return {"status": "error", "db": "unreachable", "detail": str(e)}
