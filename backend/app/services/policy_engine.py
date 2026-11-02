"""
policy_engine.py

Deterministic evaluation engine for intended dataset usage proposals.
Compares proposed purpose, operation, requester role, and destination region
against the dataset's Data Passport rules.
"""

from datetime import datetime, timezone


def evaluate_usage(
    dataset,
    proposed_purpose: str,
    operation: str = "READ",
    requester_role: str | None = None,
    target_region: str | None = None
) -> dict:
    """
    Evaluate proposed dataset usage against its Data Passport governance attributes.

    Returns:
        dict with:
          - decision: "PERMITTED" | "RESTRICTED" | "REQUIRES_REVIEW"
          - reason: summary string
          - policy_notes: list of context notes
          - violated_rules: list of violated policy clauses
          - missing_information: list of missing documents or validations
          - recommendations: actionable recommendations
          - evaluated_at: UTC timestamp ISO string
    """
    purpose = proposed_purpose.strip().casefold()
    op = (operation or "READ").strip().upper()
    classification = (dataset.classification or "INTERNAL").strip().upper()

    allowed = [p.strip().casefold() for p in (dataset.allowed_purposes or [])]
    restricted = [p.strip().casefold() for p in (dataset.restricted_purposes or [])]

    policy_notes: list[str] = []
    violated_rules: list[str] = []
    missing_information: list[str] = []
    recommendations: list[str] = []

    # 1. Dataset Classification Note
    policy_notes.append(
        f"Dataset '{dataset.name}' is classified as {classification}."
    )
    if dataset.owner:
        policy_notes.append(f"Data steward / owner: {dataset.owner}.")

    # 2. Check Purpose Restrictions and Allowances
    purpose_is_restricted = any(r in purpose or purpose in r for r in restricted)
    purpose_is_allowed = any(a in purpose or purpose in a for a in allowed)

    if purpose_is_restricted:
        violated_rules.append(
            f"Purpose '{proposed_purpose}' matches an explicitly restricted purpose in the Data Passport."
        )
    elif purpose_is_allowed:
        policy_notes.append(
            f"Purpose '{proposed_purpose}' matches an approved allowed purpose in the Data Passport."
        )
    else:
        policy_notes.append(
            f"Purpose '{proposed_purpose}' is unlisted (neither explicitly allowed nor restricted)."
        )
        missing_information.append(
            "Proof of business justification or consent approval for secondary purpose processing."
        )

    # 3. Operation-specific checks
    if op == "EXPORT":
        if not dataset.sharing_allowed:
            violated_rules.append(
                "Operation 'EXPORT' is forbidden: this dataset has sharing_allowed set to False."
            )
            recommendations.append(
                "Process data within the local security boundary or request a signed Data Transfer Agreement (DTA)."
            )
        else:
            policy_notes.append("Operation 'EXPORT' conforms with sharing permission.")

    elif op == "RETRAIN_MODEL":
        if classification in ("RESTRICTED", "CONFIDENTIAL"):
            violated_rules.append(
                f"Operation 'RETRAIN_MODEL' on {classification} data risks ingesting sensitive attributes or PII into model parameters."
            )
            recommendations.append(
                "Apply pseudonymization, differential privacy, or feature masking before model ingestion."
            )
            missing_information.append(
                "Data Protection Officer (DPO) countersignature for model training."
            )
        else:
            policy_notes.append("Operation 'RETRAIN_MODEL' permitted on non-restricted dataset.")

    # 4. Region Boundary Check
    if target_region and dataset.region:
        if target_region.strip().casefold() != dataset.region.strip().casefold():
            violated_rules.append(
                f"Target region '{target_region}' does not match dataset residency region '{dataset.region}'."
            )
            recommendations.append(
                f"Execute workloads in the origin region ({dataset.region}) to preserve data residency compliance."
            )

    # 5. Encryption Notice
    if not dataset.encrypted and classification in ("CONFIDENTIAL", "RESTRICTED"):
        missing_information.append(
            "Dataset storage is currently unencrypted. At-rest encryption validation required."
        )

    # 6. Synthesise Final Decision and Reason
    now_iso = datetime.now(timezone.utc).isoformat()

    if violated_rules:
        decision = "RESTRICTED"
        reason = (
            f"Intended usage is RESTRICTED due to {len(violated_rules)} policy violation(s). "
            f"See violated rules and recommended remediations."
        )
        if not recommendations:
            recommendations.append(
                "Consult the dataset owner or compliance steward to request a policy review."
            )
    elif missing_information or not purpose_is_allowed:
        decision = "REQUIRES_REVIEW"
        reason = (
            f"Intended usage REQUIRES_REVIEW. The proposed purpose or operation requires "
            f"human sign-off or additional compliance documentation."
        )
        recommendations.append(
            "Submit an exception or governance review request to the Data Protection Officer."
        )
    else:
        decision = "PERMITTED"
        reason = (
            f"Intended usage is fully PERMITTED. Purpose, operation '{op}', and governance rules "
            f"are compliant with the Data Passport."
        )
        recommendations.append(
            "Ensure standard audit logging is maintained during processing."
        )

    return {
        "decision": decision,
        "reason": reason,
        "policy_notes": policy_notes,
        "violated_rules": violated_rules,
        "missing_information": missing_information,
        "recommendations": recommendations,
        "evaluated_at": now_iso,
    }