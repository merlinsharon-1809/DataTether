import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db.models import Dataset, LineageRelationship
from app.schemas.lineage import (
    LineageCreate,
    LineageGraphResponse,
    LineageRelationshipResponse,
)
from app.services.lineage_service import get_dataset_lineage, would_create_cycle

router = APIRouter(prefix="/api/lineage", tags=["Data Lineage"])


@router.post("/relationships", response_model=LineageRelationshipResponse, status_code=201)
def create_lineage_relationship(
    request: LineageCreate,
    db: Session = Depends(get_db)
):
    """
    Record a provenance / derivation relationship between two datasets.

    source_dataset_id: The upstream (parent) dataset.
    target_dataset_id: The downstream (child / derived) dataset.
    """
    # 1. Verify both datasets exist in the database
    source_ds = db.query(Dataset).filter(Dataset.id == request.source_dataset_id).first()
    if not source_ds:
        raise HTTPException(
            status_code=404,
            detail=f"Source dataset with ID '{request.source_dataset_id}' not found."
        )

    target_ds = db.query(Dataset).filter(Dataset.id == request.target_dataset_id).first()
    if not target_ds:
        raise HTTPException(
            status_code=404,
            detail=f"Target dataset with ID '{request.target_dataset_id}' not found."
        )

    # 2. Check for duplicate relationship
    existing = (
        db.query(LineageRelationship)
        .filter(
            LineageRelationship.source_dataset_id == request.source_dataset_id,
            LineageRelationship.target_dataset_id == request.target_dataset_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A lineage relationship between these two datasets already exists."
        )

    # 3. Check for cycle formation in the DAG
    if would_create_cycle(db, request.source_dataset_id, request.target_dataset_id):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot create lineage relationship: adding an edge from '{source_ds.name}' "
                f"to '{target_ds.name}' would form a circular dependency cycle."
            )
        )

    # 4. Insert relationship
    rel = LineageRelationship(
        id=str(uuid.uuid4()),
        source_dataset_id=request.source_dataset_id,
        target_dataset_id=request.target_dataset_id,
        transformation_type=request.transformation_type,
        description=request.description,
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)

    return rel


@router.get("/relationships/all", response_model=list[LineageRelationshipResponse])
def list_all_relationships(db: Session = Depends(get_db)):
    """
    Retrieve all recorded lineage relationships across the system.
    """
    return db.query(LineageRelationship).all()


@router.get("/{dataset_id}", response_model=LineageGraphResponse)
def get_dataset_lineage_graph(
    dataset_id: str,
    direction: str = Query(
        default="both",
        pattern="^(upstream|downstream|both)$",
        description="Lineage traversal direction: 'upstream', 'downstream', or 'both'"
    ),
    db: Session = Depends(get_db)
):
    """
    Retrieve the lineage topology graph for a specific dataset.

    Returns the root dataset, all connected ancestor/descendant dataset nodes,
    and directed transformation edges.
    """
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset with ID '{dataset_id}' not found."
        )

    return get_dataset_lineage(db, dataset_id, direction=direction)
