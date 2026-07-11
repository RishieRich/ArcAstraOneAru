# Starts the ARQ backend API on http://127.0.0.1:8000
# Run from the backend\ folder:  .\start_backend.ps1
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000
