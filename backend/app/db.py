import os
import time
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
    url = get_database_url()
    # Neon suspends its free-tier compute after ~5 min idle; the first connect
    # during wake-up can fail transiently. Retry instead of crashing the
    # invocation (which surfaced to connectors as FUNCTION_INVOCATION_FAILED).
    last_error: psycopg.OperationalError | None = None
    for attempt in range(3):
        try:
            return psycopg.connect(url, connect_timeout=10)
        except psycopg.OperationalError as e:
            last_error = e
            time.sleep(1 + attempt)
    raise last_error
