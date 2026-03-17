import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is on sys.path for algoritmi / config imports
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from .models import HealthResponse
from .routes.stores import router as stores_router
from .routes.dashboard import router as dashboard_router
from .routes.alerts import router as alerts_router
from .routes.workflow import router as workflow_router

app = FastAPI(title="Stock Management API", version="1.0.0")

# CORS — accept comma-separated origins from env, default to wildcard for dev
_raw_origins = os.environ.get("CORS_ORIGINS", "*")
cors_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(stores_router)
app.include_router(dashboard_router)
app.include_router(alerts_router)
app.include_router(workflow_router)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")

