from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.schemas.investigation import (
    InvestigationRequest,
    InvestigationResponse,
)
from app.services.investigation_orchestrator import (
    DatasetNotFoundError,
    run_investigation,
)

router = APIRouter(prefix="/api/investigation", tags=["AI Investigation & Explainability"])


@router.post("/run", response_model=InvestigationResponse)
def execute_investigation(
    request: InvestigationRequest,
    db: Session = Depends(get_db)
):
    """
    Execute a multi-vector investigation into a proposed dataset usage or combination.

    Orchestrates:
    - Stage 1: Evidence Ingestion (Data Passports, Lineage relations)
    - Stage 2: Deterministic Risk Analysis (Combination Engine, Privacy Engine)
    - Stage 3: Policy Evaluation (Operations, Regions, Access)
    - Stage 4: AI Interpretation & Synthesis (Meta AI / Deterministic Explainer)
    - Stage 5: Human Review & DPO Sign-Off (IN_PROGRESS if review required)
    """
    try:
        return run_investigation(db, request)
    except DatasetNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "One or more dataset IDs were not found.",
                "missing_ids": e.missing_ids
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation execution failed: {str(e)}")
