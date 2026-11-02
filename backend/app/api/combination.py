from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db.models import Dataset
from app.schemas.combination import CombinationRequest, CombinationResponse
from app.services.combination_engine import analyse_combination

router = APIRouter(prefix="/api/combination", tags=["Dataset Combination"])


@router.post("/analyse", response_model=CombinationResponse)
def analyse_dataset_combination(
    request: CombinationRequest,
    db: Session = Depends(get_db)
):
    """
    Analyse two or more datasets for governance compatibility.

    Provide a list of dataset IDs and a proposed purpose.
    The endpoint retrieves each dataset's Data Passport, checks them
    together for conflicts, and returns a structured governance decision.

    Possible decisions:
    - PERMITTED: The purpose is allowed across all datasets with no conflicts.
    - RESTRICTED: The purpose is blocked by at least one dataset.
    - REQUIRES_REVIEW: The purpose is unlisted or concerns were found.
    """

    # Fetch all requested datasets from the database in one query.
    datasets = (
        db.query(Dataset)
        .filter(Dataset.id.in_(request.dataset_ids))
        .all()
    )

    # Check that every requested ID was found.
    # If any are missing, tell the caller exactly which ones.
    found_ids = {ds.id for ds in datasets}
    missing_ids = [id for id in request.dataset_ids if id not in found_ids]

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "One or more dataset IDs were not found.",
                "missing_ids": missing_ids,
            }
        )

    # Run the analysis engine with the real dataset objects.
    result = analyse_combination(datasets, request.proposed_purpose)

    return result
