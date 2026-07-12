"""Vercel serverless entrypoint.

Vercel's Python runtime discovers `api/*.py` and looks for a module-level ASGI
`app`. The project root (backend/) is not on sys.path inside the lambda, so we
add it before importing the real FastAPI app.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402

__all__ = ["app"]
