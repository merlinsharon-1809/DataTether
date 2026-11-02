from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db.models import Dataset
from app.schemas.policy import (
    PolicyEvaluationRequest,
    PolicyEvaluationResponse
)
from app.services.policy_engine import evaluate_usage

router = APIRouter(prefix="/api/policy", tags=["Policy Evaluation"])


@router.post("/evaluate", response_model=PolicyEvaluationResponse)
def evaluate_policy(
    request: PolicyEvaluationRequest,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    result = evaluate_usage(
        dataset=dataset,
        proposed_purpose=request.proposed_purpose,
        operation=request.operation,
        requester_role=request.requester_role,
        target_region=request.target_region,
    )

    return {
        "dataset_id": dataset.id,
        "dataset_name": dataset.name,
        "proposed_purpose": request.proposed_purpose,
        **result
    }