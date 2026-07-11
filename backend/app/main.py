from fastapi import FastAPI

from app.routers import devices, sync

app = FastAPI(title="ARQ Tally Connector API")
app.include_router(devices.router)
app.include_router(sync.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
