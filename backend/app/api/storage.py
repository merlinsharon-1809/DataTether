import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db.models import Dataset
from app.schemas.dataset import DatasetResponse
from app.schemas.storage import (
    RegisterDiscoveredRequest,
    StorageConnectionResponse,
    StorageScanResponse,
)
from app.services.storage_service import (
    list_storage_connections,
    scan_storage_connection,
)

router = APIRouter(prefix="/api/storage", tags=["Storage & Object Discovery"])


@router.get("/connections", response_model=list[StorageConnectionResponse])
def get_storage_connections():
    """
    List all configured storage cluster endpoints (MinIO, S3, Data Lakes).
    """
    return list_storage_connections()


@router.post("/scan/{connection_id}", response_model=StorageScanResponse)
def scan_storage_cluster(
    connection_id: str,
    db: Session = Depends(get_db)
):
    """
    Scan a storage cluster for bucket files and evaluate registration status.
    """
    try:
        return scan_storage_connection(db, connection_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/register-dataset", response_model=DatasetResponse, status_code=201)
def register_discovered_dataset(
    request: RegisterDiscoveredRequest,
    db: Session = Depends(get_db)
):
    """
    Register a discovered object storage file into the official Data Passport registry.
    """
    # Check if a dataset with this exact name or source already exists
    existing = (
        db.query(Dataset)
        .filter((Dataset.name == request.name) | (Dataset.source == request.source))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Dataset '{request.name}' or source '{request.source}' is already registered (ID: {existing.id})."
        )

    new_dataset = Dataset(
        id=str(uuid.uuid4()),
        name=request.name,
        source=request.source,
        classification=request.classification,
        owner=request.owner,
        allowed_purposes=request.allowed_purposes,
        restricted_purposes=request.restricted_purposes,
        region=request.region,
        encrypted=request.encrypted,
        retention_days=request.retention_days,
        sharing_allowed=request.sharing_allowed,
        columns=request.columns,
        sensitive_attributes=request.sensitive_attributes,
        data_description=request.data_description,
    )

    try:
        db.add(new_dataset)
        db.commit()
        db.refresh(new_dataset)
    except Exception:
        db.rollback()
        raise

    return new_dataset
