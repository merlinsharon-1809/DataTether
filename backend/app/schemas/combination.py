from pydantic import BaseModel, field_validator
from app.schemas.privacy import PrivacyRisk


class CombinationRequest(BaseModel):
    """
    Sent by the caller when requesting a combination analysis.

    dataset_ids: A list of two or more dataset IDs to analyse together.
    proposed_purpose: What the caller intends to do with the combined data.
    """
    dataset_ids: list[str]
    proposed_purpose: str

    @field_validator("dataset_ids")
    @classmethod
    def require_at_least_two(cls, v):
        if len(v) < 2:
            raise ValueError(
                "Combination analysis requires at least two dataset IDs."
            )
        if len(set(v)) != len(v):
            raise ValueError(
                "Duplicate dataset IDs are not allowed."
            )
        return v

    @field_validator("proposed_purpose")
    @classmethod
    def require_non_empty_purpose(cls, v):
        if not v.strip():
            raise ValueError("proposed_purpose must not be blank.")
        return v


class DatasetSummary(BaseModel):
    """
    A brief summary of one dataset included in the combination.
    Returned inside CombinationResponse so the caller can see
    exactly which datasets were analysed and their key attributes.
    """
    id: str
    name: str
    classification: str
    allowed_purposes: list[str]
    restricted_purposes: list[str]
    region: str | None
    encrypted: bool
    sharing_allowed: bool


class CombinationFinding(BaseModel):
    """
    A single governance concern identified during combination analysis.

    category: A short label for the type of concern.
    detail: A plain-English explanation of what was found.
    severity: LOW, MEDIUM, or HIGH — indicates how serious the concern is.
    """
    category: str
    detail: str
    severity: str


class CombinationResponse(BaseModel):
    """
    The full result returned after analysing a dataset combination.

    decision: Overall governance outcome —
        PERMITTED, RESTRICTED, or REQUIRES_REVIEW.
    reason: A summary explanation of the decision.
    datasets: Summaries of each dataset that was analysed.
    findings: A list of specific governance concerns detected.
    proposed_purpose: The purpose that was evaluated.
    privacy_risks: A list of specific privacy risk findings detected.
    privacy_overall_risk: NO_CONCERNS, LOW, MEDIUM, or HIGH.
    """
    proposed_purpose: str
    decision: str
    reason: str
    datasets: list[DatasetSummary]
    findings: list[CombinationFinding]
    privacy_risks: list[PrivacyRisk] = []
    privacy_overall_risk: str = "NO_CONCERNS"

