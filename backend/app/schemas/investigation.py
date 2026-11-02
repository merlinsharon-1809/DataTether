from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


# Explicit allowed status types
InvestigationStatus = Literal["UNDER_REVIEW", "ESCALATED", "APPROVED", "BLOCKED"]
HumanReviewStatus = Literal["PENDING_DPO_APPROVAL", "APPROVED_WITH_CONDITIONS", "REJECTED", "NOT_REQUIRED"]
StageStatus = Literal["COMPLETED", "IN_PROGRESS", "PENDING", "FAILED"]
AIProviderType = Literal["META_AI", "DETERMINISTIC_FALLBACK"]
DPODisposition = Literal["APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED", "ESCALATE_TO_BOARD"]


class InvestigationRequest(BaseModel):
    """
    Request payload to launch an AI-assisted investigation.

    objective: Plain-language inquiry (e.g. 'Can customer profiles and purchase history be combined for AI training?')
    dataset_ids: List of dataset IDs involved (at least one dataset required).
    proposed_purpose: Proposed activity or workload.
    operation: Intended operation type: 'READ', 'AGGREGATE', 'EXPORT', or 'RETRAIN_MODEL'.
    requester_role: Role or team seeking access.
    target_region: Target cloud processing region.
    """
    objective: str
    dataset_ids: list[str] = Field(alias="datasetIds", default=...)
    proposed_purpose: str = Field(alias="proposedPurpose", default=...)
    operation: str = "READ"
    requester_role: str | None = Field(default=None, alias="requesterRole")
    target_region: str | None = Field(default=None, alias="targetRegion")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("objective")
    @classmethod
    def require_objective(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Objective must not be blank.")
        return v.strip()

    @field_validator("dataset_ids")
    @classmethod
    def require_datasets(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("At least one dataset ID is required for an investigation.")
        if len(set(v)) != len(v):
            raise ValueError("Duplicate dataset IDs are not permitted.")
        return v

    @field_validator("proposed_purpose")
    @classmethod
    def require_purpose(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Proposed purpose must not be blank.")
        return v.strip()


class InvestigationStage(BaseModel):
    """
    Tracks a genuinely executed stage in the multi-stage investigation pipeline.
    """
    stage: int
    name: str
    status: StageStatus
    summary: str
    timestamp: datetime

    model_config = ConfigDict(populate_by_name=True)


class DPOAuditNotes(BaseModel):
    """
    Structured audit notes specifically formatted for Data Protection Officer (DPO) review.
    """
    investigation_scope: str = Field(alias="investigationScope")
    datasets_involved: list[str] = Field(alias="datasetsInvolved")
    policies_evaluated: list[str] = Field(alias="policiesEvaluated")
    verified_evidence: list[str] = Field(alias="verifiedEvidence")
    ai_interpretation_summary: str = Field(alias="aiInterpretationSummary")
    uncertainties_and_gaps: list[str] = Field(alias="uncertaintiesAndGaps")
    human_approval_required: bool = Field(alias="humanApprovalRequired")
    recommended_disposition: DPODisposition = Field(alias="recommendedDisposition")

    model_config = ConfigDict(populate_by_name=True)


class AIModelInfo(BaseModel):
    """
    Metadata about the AI engine used for interpretation.
    """
    provider: AIProviderType
    model_name: str = Field(alias="modelName")
    is_live_call: bool = Field(alias="isLiveCall")
    fallback_reason: str | None = Field(default=None, alias="fallbackReason")

    model_config = ConfigDict(populate_by_name=True)


class InvestigationResponse(BaseModel):
    """
    Full investigation dossier matching the 4-quadrant UI matrix and DPO review requirements.
    Supports both Python snake_case field access and TypeScript camelCase serialization.
    """
    id: str
    objective: str
    datasets: list[str]
    created_at: datetime = Field(alias="createdAt")
    status: InvestigationStatus
    human_review_status: HumanReviewStatus = Field(alias="humanReviewStatus")

    # Multi-stage audit trace
    stages: list[InvestigationStage]

    # The 4 strictly separated quadrants:
    observed_facts: list[str] = Field(
        alias="observedFacts",
        description="Quadrant 1: Verified database facts only (Data Passports, storage, classifications)."
    )
    tool_analysis: list[str] = Field(
        alias="toolAnalysis",
        description="Quadrant 2: Deterministic engine findings only (Combination, Privacy, Policy violations)."
    )
    ai_interpretation: list[str] = Field(
        alias="aiInterpretation",
        description="Quadrant 3: AI-generated reasoning and explanation only."
    )
    unknown_information: list[str] = Field(
        alias="unknownInformation",
        description="Quadrant 4: Missing metadata, unverified schemas, and residual ambiguity."
    )

    # Actionable guidance
    recommendations: list[str]

    # Compliance review dossier
    dpo_audit_notes: DPOAuditNotes = Field(alias="dpoAuditNotes")

    # Model transparency metadata
    ai_model_info: AIModelInfo = Field(alias="aiModelInfo")

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )
