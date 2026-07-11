"""Run all .sql files in this directory, in filename order, against DATABASE_URL.

Usage (from backend/):  ..\.venv\Scripts\python.exe migrations\run_migration.py
"""
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

MIGRATIONS_DIR = Path(__file__).resolve().parent


def main() -> int:
    load_dotenv(MIGRATIONS_DIR.parent / ".env")
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set (expected in backend/.env)", file=sys.stderr)
        return 1

    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print("No .sql migration files found.")
        return 0

    with psycopg.connect(database_url) as conn:
        for path in sql_files:
            print(f"Applying {path.name} ...")
            sql = path.read_text(encoding="utf-8")
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            print(f"  done.")

    print("All migrations applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
