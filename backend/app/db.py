import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Local dev reads backend/.env. On Vercel there is no .env file — DATABASE_URL
# comes from the project's Environment Variables, so a missing file is fine.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set (backend/.env locally, "
            "or the Vercel project's Environment Variables in production)"
        )
    return url


def get_connection() -> psycopg.Connection:
    # Read at call time, not import time: on Vercel the module may be imported
    # during the build, before env vars are injected into the runtime.
    return psycopg.connect(get_database_url())
