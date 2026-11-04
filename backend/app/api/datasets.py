from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db.models import Dataset
from app.schemas.dataset import DatasetCreate, DatasetResponse, DatasetUpdate

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])


@router.get("/", response_model=list[DatasetResponse])
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()


@router.post("/", response_model=DatasetResponse, status_code=201)
def create_dataset(
    dataset: DatasetCreate,
    db: Session = Depends(get_db)
):
    # Check if a dataset with this exact name or source already exists
    existing = (
        db.query(Dataset)
        .filter((Dataset.name == dataset.name) | (Dataset.source == dataset.source))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Dataset with name '{dataset.name}' or source '{dataset.source}' already exists (ID: {existing.id})."
        )

    new_dataset = Dataset(
        id=str(uuid4()),
        name=dataset.name,
        source=dataset.source,
        classification=dataset.classification,
        owner=dataset.owner,
        allowed_purposes=dataset.allowed_purposes,
        restricted_purposes=dataset.restricted_purposes,
        region=dataset.region,
        encrypted=dataset.encrypted,
        retention_days=dataset.retention_days,
        sharing_allowed=dataset.sharing_allowed,
        columns=dataset.columns,
        sensitive_attributes=dataset.sensitive_attributes,
        data_description=dataset.data_description,
    )

    try:
        db.add(new_dataset)
        db.commit()
        db.refresh(new_dataset)
    except Exception:
        db.rollback()
        raise

    return new_dataset


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    return dataset


@router.patch("/{dataset_id}", response_model=DatasetResponse)
def update_dataset(
    dataset_id: str,
    updates: DatasetUpdate,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    # exclude_unset=True means only fields the caller explicitly sent
    # will be updated. Fields omitted from the PATCH body are left unchanged.
    update_data = updates.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(dataset, key, value)

    try:
        db.commit()
        db.refresh(dataset)
    except Exception:
        db.rollback()
        raise

    return dataset