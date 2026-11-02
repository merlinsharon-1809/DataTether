"""
privacy_engine.py

Deterministic, metadata-based privacy risk analysis for combinations of datasets.

Important limitations of this analysis:
- All findings are based on column names, sensitive_attributes lists,
  classifications, and data_description text only.
- We cannot inspect actual data values, row counts, or statistical distributions.
- Finding a sensitive column name indicates a POTENTIAL or DETECTED risk,
  not a confirmed privacy breach or a proven re-identification.
- Conclusions marked POTENTIAL require access to actual data to confirm.
- This engine does not use AI or machine learning. Every finding is
  produced by deterministic rules against available metadata.
"""

from app.schemas.privacy import AnalysedDatasetInfo, PrivacyRisk


# ---------------------------------------------------------------------------
# Known sensitive attribute name patterns.
# A column whose name contains any of these terms is treated as potentially
# sensitive. This list is intentionally conservative — it flags for review,
# not for automatic rejection.
# ---------------------------------------------------------------------------
SENSITIVE_PATTERNS = {
    # Health and medical
    "diagnosis", "condition", "disease", "medication", "prescription",
    "treatment", "symptom", "allergy", "disability", "mental_health",
    "health", "medical", "clinical", "patient", "icd",
    # Financial
    "salary", "income", "wage", "account", "balance", "credit", "debt",
    "tax", "bank", "payment", "transaction",
    # Identity
    "ssn", "national_id", "passport", "license", "nhs", "insurance_id",
    "date_of_birth", "dob", "birth_date",
    # Location (fine-grained)
    "gps", "latitude", "longitude", "coordinates", "exact_address",
    # Biometric / demographic
    "biometric", "fingerprint", "face", "retina", "religion", "ethnicity",
    "race", "political", "sexual_orientation", "gender_identity",
}

# ---------------------------------------------------------------------------
# Indirect identifier patterns.
# These fields are not sensitive alone but become identifying when combined.
# ---------------------------------------------------------------------------
INDIRECT_IDENTIFIER_PATTERNS = {
    "age", "postcode", "zip", "zipcode", "postal_code",
    "occupation", "employer", "job_title", "department",
    "nationality", "country", "city", "region", "state",
    "education", "marital_status", "household_size",
}

# ---------------------------------------------------------------------------
# Common linkage key patterns.
# If two datasets share a column matching one of these patterns, they can be
# joined — which can dramatically increase identifiability.
# ---------------------------------------------------------------------------
LINKAGE_KEY_PATTERNS = {
    "id", "customer_id", "user_id", "patient_id", "employee_id",
    "email", "phone", "mobile", "national_id", "ssn", "account_id",
    "member_id", "person_id", "subject_id",
}


def _normalise(name: str) -> str:
    """Lowercase and strip whitespace for consistent matching."""
    return name.strip().casefold()


def _matches_any(column: str, patterns: set[str]) -> bool:
    """
    Return True if the column name contains or exactly matches any pattern.
    This catches both exact matches ('age') and compound names ('patient_age').
    """
    col = _normalise(column)
    return any(pattern in col for pattern in patterns)


def _find_matches(columns: list[str], patterns: set[str]) -> list[str]:
    """Return all column names that match any pattern in the set."""
    return [c for c in columns if _matches_any(c, patterns)]


def analyse_privacy(datasets: list, proposed_purpose: str) -> dict:
    """
    Analyse a list of Dataset objects for privacy risks.

    Returns a dict matching the PrivacyAnalysisResponse schema:
      - proposed_purpose
      - overall_risk: "NO_CONCERNS", "LOW", "MEDIUM", or "HIGH"
      - summary
      - datasets: list of AnalysedDatasetInfo
      - risks: list of PrivacyRisk
      - limitation_notice
    """

    risks: list[PrivacyRisk] = []

    # ------------------------------------------------------------------
    # Build per-dataset info and collect column sets
    # ------------------------------------------------------------------
    dataset_infos: list[AnalysedDatasetInfo] = []
    all_columns_by_dataset: list[set[str]] = []

    for ds in datasets:
        cols = [_normalise(c) for c in (ds.columns or [])]
        all_columns_by_dataset.append(set(cols))

        dataset_infos.append(AnalysedDatasetInfo(
            id=ds.id,
            name=ds.name,
            classification=ds.classification,
            columns_available=len(cols) > 0,
            sensitive_attributes=[_normalise(a) for a in (ds.sensitive_attributes or [])],
            data_description=ds.data_description,
        ))

    # Combined column pool across all datasets
    all_columns: list[str] = []
    for cols in all_columns_by_dataset:
        all_columns.extend(cols)

    # ------------------------------------------------------------------
    # Check 1: Datasets with no column metadata
    # ------------------------------------------------------------------
    no_metadata_datasets = [
        info.name for info in dataset_infos if not info.columns_available
    ]
    if no_metadata_datasets:
        risks.append(PrivacyRisk(
            risk_type="Missing Metadata",
            status="UNKNOWN",
            detail=(
                f"The following dataset(s) have no column metadata registered "
                f"in their Data Passport: {', '.join(no_metadata_datasets)}. "
                f"Privacy risks for these datasets cannot be assessed from "
                f"metadata alone. A manual review of their actual schema is required."
            ),
            evidence=[],
            severity="MEDIUM",
        ))

    # ------------------------------------------------------------------
    # Check 2: Explicitly declared sensitive attributes
    # ------------------------------------------------------------------
    all_declared_sensitive: list[str] = []
    for info in dataset_infos:
        all_declared_sensitive.extend(info.sensitive_attributes)

    if all_declared_sensitive:
        unique_sensitive = sorted(set(all_declared_sensitive))
        risks.append(PrivacyRisk(
            risk_type="Sensitive Attribute",
            status="DETECTED",
            detail=(
                f"The following attributes are explicitly declared as sensitive "
                f"in one or more Data Passports: {', '.join(unique_sensitive)}. "
                f"Any processing of these attributes for the purpose "
                f"'{proposed_purpose}' must be assessed against applicable "
                f"data protection requirements."
            ),
            evidence=unique_sensitive,
            severity="HIGH",
        ))

    # ------------------------------------------------------------------
    # Check 3: Sensitive attributes detected by name pattern
    # (columns not in sensitive_attributes list but matching known patterns)
    # ------------------------------------------------------------------
    pattern_sensitive = _find_matches(all_columns, SENSITIVE_PATTERNS)
    # Exclude ones already declared as sensitive to avoid duplicating the finding
    already_declared = set(all_declared_sensitive)
    pattern_only_sensitive = [c for c in pattern_sensitive if c not in already_declared]

    if pattern_only_sensitive:
        unique_pattern = sorted(set(pattern_only_sensitive))
        risks.append(PrivacyRisk(
            risk_type="Potentially Sensitive Attribute",
            status="POTENTIAL",
            detail=(
                f"The following column name(s) match patterns commonly associated "
                f"with sensitive data, but are not explicitly declared as sensitive "
                f"in the Data Passport(s): {', '.join(unique_pattern)}. "
                f"These should be reviewed. If they contain sensitive information, "
                f"they should be added to the sensitive_attributes field."
            ),
            evidence=unique_pattern,
            severity="HIGH",
        ))

    # ------------------------------------------------------------------
    # Check 4: Indirect identifier accumulation
    # When combining datasets, indirect identifiers from multiple sources
    # accumulate, increasing the risk of narrowing down an individual.
    # ------------------------------------------------------------------
    indirect_matches = _find_matches(all_columns, INDIRECT_IDENTIFIER_PATTERNS)
    unique_indirect = sorted(set(indirect_matches))

    if len(unique_indirect) >= 2:
        risks.append(PrivacyRisk(
            risk_type="Indirect Identifier Accumulation",
            status="POTENTIAL",
            detail=(
                f"The combined datasets contain {len(unique_indirect)} field(s) "
                f"that can act as indirect identifiers: "
                f"{', '.join(unique_indirect)}. "
                f"Individually these may not identify a person, but in combination "
                f"they can significantly narrow down individuals — especially in "
                f"small populations. This cannot be confirmed without analysing "
                f"actual data distributions."
            ),
            evidence=unique_indirect,
            severity="MEDIUM",
        ))
    elif len(unique_indirect) == 1:
        risks.append(PrivacyRisk(
            risk_type="Indirect Identifier",
            status="POTENTIAL",
            detail=(
                f"The combined datasets contain one indirect identifier field: "
                f"'{unique_indirect[0]}'. On its own this is low risk, but "
                f"could contribute to identification when combined with other data."
            ),
            evidence=unique_indirect,
            severity="LOW",
        ))

    # ------------------------------------------------------------------
    # Check 5: Cross-dataset linkage via shared key columns
    # If two or more datasets share a column that can act as a join key,
    # they can be linked together, multiplying identifiability.
    # ------------------------------------------------------------------
    if len(all_columns_by_dataset) >= 2:
        shared_keys: set[str] = set()
        for i, cols_a in enumerate(all_columns_by_dataset):
            for j, cols_b in enumerate(all_columns_by_dataset):
                if i >= j:
                    continue
                # Find columns present in both datasets that match linkage patterns
                overlap = cols_a & cols_b
                linkage_overlap = {c for c in overlap if _matches_any(c, LINKAGE_KEY_PATTERNS)}
                shared_keys |= linkage_overlap

        if shared_keys:
            risks.append(PrivacyRisk(
                risk_type="Cross-Dataset Linkage Risk",
                status="DETECTED",
                detail=(
                    f"The following column(s) appear in more than one dataset "
                    f"and can be used as join keys: {', '.join(sorted(shared_keys))}. "
                    f"Linking datasets on these keys combines their attributes, "
                    f"which increases the overall identifiability of individuals "
                    f"in the combined dataset compared to either dataset alone."
                ),
                evidence=sorted(shared_keys),
                severity="HIGH",
            ))

    # ------------------------------------------------------------------
    # Check 6: Sensitive inference risk
    # Certain combinations of attribute types can allow inferring sensitive
    # information the person never explicitly disclosed.
    # ------------------------------------------------------------------
    has_health = bool(_find_matches(all_columns, {
        "diagnosis", "medication", "condition", "treatment", "health", "clinical"
    }))
    has_employment = bool(_find_matches(all_columns, {
        "employer", "job_title", "occupation", "department", "salary", "income"
    }))
    has_location = bool(_find_matches(all_columns, {
        "postcode", "zip", "zipcode", "postal_code", "address", "gps",
        "latitude", "longitude"
    }))
    has_identity = bool(all_declared_sensitive) or bool(
        _find_matches(all_columns, {"patient_id", "ssn", "national_id", "email"})
    )

    inference_pairs = []
    if has_health and has_employment:
        inference_pairs.append(
            "health-related attributes combined with employment data may allow "
            "inference of medical conditions from workplace patterns"
        )
    if has_location and has_health:
        inference_pairs.append(
            "fine-grained location data combined with health attributes may allow "
            "inference of medical facility visits or treatment locations"
        )

    if inference_pairs:
        risks.append(PrivacyRisk(
            risk_type="Sensitive Inference Risk",
            status="POTENTIAL",
            detail=(
                f"The attribute combination across these datasets creates conditions "
                f"where sensitive information may be inferred indirectly: "
                f"{'; '.join(inference_pairs)}. "
                f"This is a potential risk based on the types of attributes present. "
                f"Confirming it requires reviewing actual data values and distributions."
            ),
            evidence=[],
            severity="HIGH",
        ))

    # ------------------------------------------------------------------
    # Check 7: High classification with sensitive purpose
    # ------------------------------------------------------------------
    restricted_datasets = [
        info.name for info in dataset_infos
        if info.classification.strip().casefold() == "restricted"
    ]
    purpose_lower = proposed_purpose.strip().casefold()
    sensitive_purposes = {"profiling", "marketing", "advertising", "targeting", "scoring"}

    if restricted_datasets and purpose_lower in sensitive_purposes:
        risks.append(PrivacyRisk(
            risk_type="Restricted Data + Sensitive Purpose",
            status="DETECTED",
            detail=(
                f"The following dataset(s) are classified as Restricted: "
                f"{', '.join(restricted_datasets)}. "
                f"The proposed purpose '{proposed_purpose}' is considered "
                f"sensitive and typically requires explicit legal basis under "
                f"data protection frameworks. This combination warrants "
                f"formal review before any processing begins."
            ),
            evidence=restricted_datasets,
            severity="HIGH",
        ))

    # ------------------------------------------------------------------
    # Determine overall risk level
    # ------------------------------------------------------------------
    severities = [r.severity for r in risks]
    detected_statuses = [r.status for r in risks]

    if not risks:
        overall_risk = "NO_CONCERNS"
        summary = (
            "No privacy concerns were identified from the available metadata. "
            "However, this does not confirm the combination is risk-free — "
            "datasets without column metadata could not be assessed."
        )
    elif "HIGH" in severities and "DETECTED" in detected_statuses:
        overall_risk = "HIGH"
        summary = (
            f"High-severity privacy risks were detected in this combination "
            f"for the proposed purpose '{proposed_purpose}'. "
            f"Human review is required before any processing proceeds."
        )
    elif "HIGH" in severities:
        overall_risk = "HIGH"
        summary = (
            f"Potential high-severity privacy risks were identified. "
            f"These are based on metadata patterns and require verification "
            f"against actual data before conclusions can be drawn."
        )
    elif "MEDIUM" in severities:
        overall_risk = "MEDIUM"
        summary = (
            f"Medium-severity privacy concerns were identified for the proposed "
            f"purpose '{proposed_purpose}'. Review the findings before proceeding."
        )
    else:
        overall_risk = "LOW"
        summary = (
            f"Low-severity privacy observations were noted. "
            f"These are unlikely to require immediate action but should be "
            f"documented as part of the Data Passport."
        )

    limitation_notice = (
        "This analysis is based exclusively on dataset metadata: column names, "
        "declared sensitive attributes, classifications, and data descriptions. "
        "It does not inspect actual data values, row counts, statistical "
        "distributions, or re-identification rates. "
        "Findings marked POTENTIAL indicate plausible concerns that require "
        "access to actual data to confirm or dismiss. "
        "Findings marked UNKNOWN indicate insufficient metadata to assess the risk. "
        "This analysis does not constitute a formal Data Protection Impact "
        "Assessment (DPIA) and does not guarantee regulatory compliance."
    )

    return {
        "proposed_purpose": proposed_purpose,
        "overall_risk": overall_risk,
        "summary": summary,
        "datasets": dataset_infos,
        "risks": risks,
        "limitation_notice": limitation_notice,
    }
