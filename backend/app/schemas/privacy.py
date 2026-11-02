from pydantic import BaseModel, field_validator


class PrivacyAnalysisRequest(BaseModel):
    """
    Sent by the caller when requesting a privacy risk analysis.

    dataset_ids: Two or more dataset IDs to analyse together.
    proposed_purpose: What the caller intends to do with the data.
    """
    dataset_ids: list[str]
    proposed_purpose: str

    @field_validator("dataset_ids")
    @classmethod
    def require_at_least_two(cls, v):
        if len(v) < 2:
            raise ValueError(
                "Privacy analysis requires at least two dataset IDs."
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


class PrivacyRisk(BaseModel):
    """
    A single privacy concern identified during analysis.

    risk_type: The category of concern.
        Examples: "Sensitive Attribute", "Indirect Identifier",
                  "Sensitive Inference", "Identifiability Risk"

    status: How confidently the risk was identified.
        DETECTED  — directly supported by available metadata
                    (e.g. a column is named 'diagnosis').
        POTENTIAL — plausible based on patterns in the metadata,
                    but would need the actual data to confirm.
        UNKNOWN   — insufficient metadata to assess this risk.

    detail: A plain-English description of the concern.

    evidence: The specific attribute names, fields, or facts that
              support this finding. Empty list means no direct
              evidence was found.

    severity: LOW, MEDIUM, or HIGH — how serious the concern is
              if the risk is real.
    """
    risk_type: str
    status: str          # "DETECTED", "POTENTIAL", or "UNKNOWN"
    detail: str
    evidence: list[str]
    severity: str        # "LOW", "MEDIUM", or "HIGH"


class AnalysedDatasetInfo(BaseModel):
    """
    A summary of one dataset included in the privacy analysis.
    Returned so the caller can see which datasets were examined
    and what privacy metadata was available.
    """
    id: str
    name: str
    classification: str
    columns_available: bool       # True if the dataset has column metadata
    sensitive_attributes: list[str]
    data_description: str | None


class PrivacyAnalysisResponse(BaseModel):
    """
    The full result of a privacy risk analysis.

    proposed_purpose: The purpose that was evaluated.

    overall_risk: A summary risk level across all findings.
        NO_CONCERNS, LOW, MEDIUM, or HIGH.

    summary: A plain-English paragraph summarising the findings.

    datasets: Info about each dataset that was analysed.

    risks: The list of individual privacy risks found.

    limitation_notice: An honest statement of what this analysis
        can and cannot determine from metadata alone.
        Always included. Never omit this.
    """
    proposed_purpose: str
    overall_risk: str             # "NO_CONCERNS", "LOW", "MEDIUM", "HIGH"
    summary: str
    datasets: list[AnalysedDatasetInfo]
    risks: list[PrivacyRisk]
    limitation_notice: str
