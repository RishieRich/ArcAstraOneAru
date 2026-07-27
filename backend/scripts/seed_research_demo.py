"""Create an explicitly labelled, synthetic Research Agent demo tenant.

Run from backend with the normal DATABASE_URL configured. This never touches
an existing tenant and is intentionally separate from production migrations.
"""
from datetime import date, timedelta
from uuid import uuid4

from app.db import get_connection


def main():
    tenant_id, import_id = str(uuid4()), str(uuid4())
    products = [("Precision Valve Assembly", 14800, 9700), ("Industrial Pump Housing", 22600, 15900), ("Brass Fitting Set", 5200, 3300)]
    customers = ["Apex Process Systems", "Narmada Chemicals", "Surat Fluid Controls", "Vadodara Engineering Works", "Ankleshwar Utilities"]
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("insert into tenants (id,name,tally_company_guid) values (%s,%s,%s)", (tenant_id, "DEMO — ARQ Research Sample", f"demo-research-{tenant_id}"))
        cur.execute("""insert into financial_imports (id,tenant_id,uploaded_by,source_filename,file_sha256,detected_kind,classification_confidence,classification_reason,transaction_count,line_count)
            values (%s,%s,'demo-seed','synthetic-research-demo.csv',%s,'sales',1,'Synthetic demo data',%s,%s)""", (import_id, tenant_id, f"research-demo-{tenant_id}", len(customers) * len(products), len(customers) * len(products)))
        for month in range(12):
            for customer_index, customer in enumerate(customers):
                product, sale, _ = products[(month + customer_index) % len(products)]
                key = f"demo-{month}-{customer_index}"
                cur.execute("""insert into financial_transactions (tenant_id,latest_import_id,source_key,source_row,kind,txn_date,voucher_number,party_name,gross_amount,net_amount,tax_amount)
                    values (%s,%s,%s,%s,'sales',%s,%s,%s,%s,%s,0) returning id""", (tenant_id, import_id, key, month * 10 + customer_index, date.today() - timedelta(days=30 * (12 - month)), key, customer, sale, sale))
                (transaction_id,) = cur.fetchone()
                cur.execute("insert into financial_transaction_lines (tenant_id,transaction_id,line_type,name,amount,quantity,unit,rate) values (%s,%s,'item',%s,%s,10,'Nos',%s)", (tenant_id, transaction_id, product, sale, sale / 10))
        conn.commit()
    print(f"Created demo tenant: {tenant_id}. Grant a dashboard user access, then open Research Agent and generate its ICP.")


if __name__ == "__main__":
    main()
