import os
from pathlib import Path
from dotenv import load_dotenv

# Automatically load local .env located alongside backend
_backend_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_backend_env)
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.datasets import router as datasets_router
from app.api.policy import router as policy_router
from app.api.combination import router as combination_router
from app.api.privacy import router as privacy_router
from app.api.lineage import router as lineage_router
from app.api.storage import router as storage_router
from app.api.investigation import router as investigation_router

app = FastAPI(
    title="DataTether API",
    description="Intelligent Data Usage Governance Platform",
    version="0.1.0"
)
app.include_router(datasets_router)
app.include_router(policy_router)
app.include_router(combination_router)
app.include_router(privacy_router)
app.include_router(lineage_router)
app.include_router(storage_router)
app.include_router(investigation_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to DataTether API",
        "status": "running"
    }

@app.get("/api/health")
def health_check():
    return {
        "project": "DataTether",
        "status": "healthy",
        "environment": "local development"
    }
