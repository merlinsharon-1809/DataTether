from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db.models import Dataset
from app.schemas.privacy import PrivacyAnalysisRequest, PrivacyAnalysisResponse
from app.services.privacy_engine import analyse_privacy

router = APIRouter(prefix="/api/privacy", tags=["Privacy Risk Analysis"])


@router.post("/analyse", response_model=PrivacyAnalysisResponse)
def analyse_datasets_privacy(
    request: PrivacyAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyse two or more datasets for privacy risks when combined.

    Evaluates:
    - Registered sensitive attributes (e.g. diagnosis, salary)
    - Indirect identifier accumulation (e.g. age, postcode, job)
    - Cross-dataset linkage keys (e.g. shared patient_id, user_id)
    - Sensitive inference potential
    - Restricted data combined with sensitive purposes
    - Missing schema metadata
    """

    # Fetch all requested datasets in a single query
    datasets = (
        db.query(Dataset)
        .filter(Dataset.id.in_(request.dataset_ids))
        .all()
    )

    # Verify all requested IDs exist in database
    found_ids = {ds.id for ds in datasets}
    missing_ids = [ds_id for ds_id in request.dataset_ids if ds_id not in found_ids]

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "One or more dataset IDs were not found.",
                "missing_ids": missing_ids,
            }
        )

    # Execute deterministic privacy risk analysis
    result = analyse_privacy(datasets, request.proposed_purpose)

    return result
