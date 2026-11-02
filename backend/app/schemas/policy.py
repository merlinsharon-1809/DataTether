from datetime import datetime, timezone
from pydantic import BaseModel, field_validator


class PolicyEvaluationRequest(BaseModel):
    """
    Request body for evaluating whether a proposed usage of a dataset is compliant.

    dataset_id: ID of the dataset to evaluate against.
    proposed_purpose: Plain-text explanation of the intended use.
    operation: Intended operation type: 'READ', 'AGGREGATE', 'EXPORT', or 'RETRAIN_MODEL'.
    requester_role: Optional role or team requesting access (e.g. 'Data Science Team', 'Marketing').
    target_region: Optional destination cloud region where the data will be processed.
    """
    dataset_id: str
    proposed_purpose: str
    operation: str = "READ"
    requester_role: str | None = None
    target_region: str | None = None

    @field_validator("proposed_purpose")
    @classmethod
    def require_non_empty_purpose(cls, v):
        if not v.strip():
            raise ValueError("proposed_purpose must not be blank.")
        return v.strip()

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, v):
        valid = {"READ", "AGGREGATE", "EXPORT", "RETRAIN_MODEL"}
        op = v.strip().upper()
        if op not in valid:
            raise ValueError(f"operation must be one of: {', '.join(sorted(valid))}")
        return op


class PolicyEvaluationResponse(BaseModel):
    """
    Detailed governance evaluation result for the intended usage.

    decision: Overall outcome: 'PERMITTED', 'RESTRICTED', or 'REQUIRES_REVIEW'.
    reason: Executive summary of why the decision was reached.
    policy_notes: Contextual observations from the Data Passport.
    violated_rules: Explicit rule conflicts causing restrictions or flags.
    missing_information: Approvals, consent forms, or documentation needed.
    recommendations: Actionable remedies or compliant alternatives.
    evaluated_at: ISO-8601 UTC timestamp of evaluation.
    """
    dataset_id: str
    dataset_name: str
    proposed_purpose: str
    decision: str
    reason: str
    policy_notes: list[str] = []
    violated_rules: list[str] = []
    missing_information: list[str] = []
    recommendations: list[str] = []
    evaluated_at: str