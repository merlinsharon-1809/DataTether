"""
combination_engine.py

Pure analysis logic for dataset combination governance.

This module accepts a list of SQLAlchemy Dataset objects and a proposed
purpose, then examines their Data Passports together to identify
governance concerns.

No database calls are made here. The route handler is responsible for
fetching datasets and passing them in. This keeps the engine testable
in isolation.
"""

from app.schemas.combination import CombinationFinding, DatasetSummary
from app.services.privacy_engine import analyse_privacy


# Classification levels, ordered from least to most restrictive.
# A higher index means a stricter classification.
CLASSIFICATION_ORDER = ["public", "internal", "confidential", "restricted"]


def _classification_level(classification: str) -> int:
    """Return the severity index for a classification string.
    Unrecognised values are treated as the most restrictive."""
    return CLASSIFICATION_ORDER.index(classification.strip().casefold()) \
        if classification.strip().casefold() in CLASSIFICATION_ORDER \
        else len(CLASSIFICATION_ORDER)


def _casefold_list(items: list | None) -> set[str]:
    """Normalise a list of purpose strings to lowercase for comparison."""
    return {item.strip().casefold() for item in (items or [])}


def analyse_combination(
    datasets: list,
    proposed_purpose: str
) -> dict:
    """
    Analyse a list of Dataset objects together for governance concerns.

    Returns a dict with:
      - decision: "PERMITTED", "RESTRICTED", or "REQUIRES_REVIEW"
      - reason: plain-English summary of the decision
      - datasets: list of DatasetSummary for each dataset analysed
      - findings: list of CombinationFinding objects
    """

    findings: list[CombinationFinding] = []
    purpose = proposed_purpose.strip().casefold()

    # Normalize UI wording to the canonical Data Passport purpose.
    purpose = purpose.replace("ai model training", "ai training")

    # ------------------------------------------------------------------ #
    # 1. Build per-dataset purpose sets and governance attributes          #
    # ------------------------------------------------------------------ #
    dataset_summaries = [
        DatasetSummary(
            id=ds.id,
            name=ds.name,
            classification=ds.classification,
            allowed_purposes=ds.allowed_purposes or [],
            restricted_purposes=ds.restricted_purposes or [],
            region=ds.region,
            encrypted=bool(ds.encrypted),
            sharing_allowed=bool(ds.sharing_allowed),
        )
        for ds in datasets
    ]

    # ------------------------------------------------------------------ #
    # 2. Classification escalation                                         #
    # ------------------------------------------------------------------ #
    most_restrictive = max(datasets, key=lambda ds: _classification_level(ds.classification))
    most_restrictive_level = _classification_level(most_restrictive.classification)
    classifications = [ds.classification for ds in datasets]

    if len(set(c.strip().casefold() for c in classifications)) > 1:
        findings.append(CombinationFinding(
            category="Classification Mismatch",
            detail=(
                f"The datasets carry different classification levels: "
                f"{', '.join(sorted(set(classifications)))}. "
                f"The combined dataset must be treated as "
                f"'{most_restrictive.classification}' — the most restrictive "
                f"level present."
            ),
            severity="HIGH" if most_restrictive_level >= 3 else "MEDIUM",
        ))

    # ------------------------------------------------------------------ #
    # 3. Purpose conflict detection                                        #
    # ------------------------------------------------------------------ #
    # Collect the union of all restricted purposes across all datasets.
    all_restricted: set[str] = set()
    for ds in datasets:
        all_restricted |= _casefold_list(ds.restricted_purposes)

    # Collect the union of all allowed purposes across all datasets.
    all_allowed: set[str] = set()
    for ds in datasets:
        all_allowed |= _casefold_list(ds.allowed_purposes)

    # A purpose is in conflict if one dataset allows it but another restricts it.
    conflicted_purposes = all_allowed & all_restricted
    if conflicted_purposes:
        findings.append(CombinationFinding(
            category="Purpose Conflict",
            detail=(
                f"The following purpose(s) are explicitly allowed by at least "
                f"one dataset but explicitly restricted by at least one other: "
                f"{', '.join(sorted(conflicted_purposes))}. "
                f"These purposes cannot be used with this combination."
            ),
            severity="HIGH",
        ))

    # ------------------------------------------------------------------ #
    # 4. Evaluate the proposed purpose against the combined ruleset        #
    # ------------------------------------------------------------------ #
    purpose_is_restricted = purpose in all_restricted
    purpose_is_allowed = purpose in all_allowed and not purpose_is_restricted

    # ------------------------------------------------------------------ #
    # 5. Sharing restrictions                                              #
    # ------------------------------------------------------------------ #
    no_share_datasets = [ds for ds in datasets if not ds.sharing_allowed]
    if no_share_datasets:
        names = ", ".join(ds.name for ds in no_share_datasets)
        findings.append(CombinationFinding(
            category="Sharing Restriction",
            detail=(
                f"The following dataset(s) do not permit sharing: {names}. "
                f"The combined result must not be shared with third parties."
            ),
            severity="MEDIUM",
        ))

    # ------------------------------------------------------------------ #
    # 6. Encryption mismatch                                               #
    # ------------------------------------------------------------------ #
    encrypted_datasets = [ds for ds in datasets if ds.encrypted]
    unencrypted_datasets = [ds for ds in datasets if not ds.encrypted]
    if encrypted_datasets and unencrypted_datasets:
        enc_names = ", ".join(ds.name for ds in encrypted_datasets)
        unenc_names = ", ".join(ds.name for ds in unencrypted_datasets)
        findings.append(CombinationFinding(
            category="Encryption Mismatch",
            detail=(
                f"Some datasets are encrypted ({enc_names}) and others are not "
                f"({unenc_names}). Combining them in a pipeline may expose "
                f"encrypted data to unprotected storage or transit. "
                f"Ensure the combined output is encrypted end-to-end."
            ),
            severity="MEDIUM",
        ))

    # ------------------------------------------------------------------ #
    # 7. Region mixing                                                     #
    # ------------------------------------------------------------------ #
    regions = {ds.region for ds in datasets if ds.region}
    if len(regions) > 1:
        findings.append(CombinationFinding(
            category="Cross-Region Data Movement",
            detail=(
                f"The datasets originate from different regions: "
                f"{', '.join(sorted(regions))}. "
                f"Combining them may involve cross-region data transfer, "
                f"which can have compliance implications (e.g. GDPR data "
                f"residency requirements)."
            ),
            severity="MEDIUM",
        ))

    # ------------------------------------------------------------------ #
    # 8. Privacy Risk Analysis (Phase 2 integration)                       #
    # ------------------------------------------------------------------ #
    privacy_result = analyse_privacy(datasets, proposed_purpose)
    privacy_risks = privacy_result.get("risks", [])
    privacy_overall_risk = privacy_result.get("overall_risk", "NO_CONCERNS")

    # ------------------------------------------------------------------ #
    # 9. Overall decision                                                  #
    # ------------------------------------------------------------------ #
    if purpose_is_restricted:
        decision = "RESTRICTED"
        reason = (
            f"The proposed purpose '{proposed_purpose}' is explicitly restricted "
            f"by at least one dataset in this combination."
        )
    elif purpose in conflicted_purposes:
        decision = "RESTRICTED"
        reason = (
            f"The proposed purpose '{proposed_purpose}' is permitted by some "
            f"datasets in this combination but restricted by others. "
            f"It cannot be used with this combination."
        )
    elif purpose_is_allowed:
        if findings or privacy_overall_risk in ("HIGH", "MEDIUM"):
            decision = "REQUIRES_REVIEW"
            concerns = []
            if findings:
                concerns.append("governance concerns")
            if privacy_overall_risk in ("HIGH", "MEDIUM"):
                concerns.append(f"{privacy_overall_risk.lower()} privacy risks")
            reason = (
                f"The proposed purpose '{proposed_purpose}' is listed as allowed "
                f"across the combination, but {' and '.join(concerns)} were identified "
                f"that require human review before proceeding."
            )
        else:
            decision = "PERMITTED"
            reason = (
                f"The proposed purpose '{proposed_purpose}' is permitted by all "
                f"datasets in this combination and no governance conflicts or high-risk "
                f"privacy concerns were found."
            )
    else:
        decision = "REQUIRES_REVIEW"
        reason = (
            f"The proposed purpose '{proposed_purpose}' is not explicitly "
            f"listed as allowed or restricted in this combination. "
            f"Human review is required before proceeding."
        )

    return {
        "proposed_purpose": proposed_purpose,
        "decision": decision,
        "reason": reason,
        "datasets": dataset_summaries,
        "findings": findings,
        "privacy_risks": privacy_risks,
        "privacy_overall_risk": privacy_overall_risk,
    }

