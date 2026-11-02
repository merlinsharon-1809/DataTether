"""
investigation_orchestrator.py

Investigation orchestrator service for DataTether Phase 6.
Coordinates Phase 1-5 deterministic engines to assemble the 4-quadrant
evidence dossier, tracks genuine pipeline stages, enforces honest stage statuses,
and drafts DPO audit notes.

Rules enforced:
1. Observed facts come 100% from database records.
2. Tool analysis comes 100% from deterministic engines (Combination, Privacy, Policy).
3. If DPO review is needed, Stage 5 is IN_PROGRESS (never COMPLETED without human sign-off).
4. Deterministic engine decisions govern the final disposition; AI never overrides them.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.db.models import Dataset
from app.schemas.investigation import (
    AIModelInfo,
    DPOAuditNotes,
    InvestigationRequest,
    InvestigationResponse,
    InvestigationStage,
)
from app.services.combination_engine import analyse_combination
from app.services.privacy_engine import analyse_privacy
from app.services.policy_engine import evaluate_usage
from app.services.lineage_service import get_dataset_lineage
from app.services.ai_explainer import explain_investigation


class DatasetNotFoundError(Exception):
    def __init__(self, missing_ids: list[str]):
        self.missing_ids = missing_ids
        super().__init__(f"One or more dataset IDs were not found: {missing_ids}")


def run_investigation(db: Session, request: InvestigationRequest) -> InvestigationResponse:
    """
    Orchestrate a multi-vector investigation into a proposed dataset usage or combination.
    """
    inv_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    now_utc = datetime.now(timezone.utc)
    stages: list[InvestigationStage] = []

    # -------------------------------------------------------------------------
    # STAGE 1: Evidence Ingestion
    # Retrieve Data Passports in a single database query.
    # -------------------------------------------------------------------------
    datasets = (
        db.query(Dataset)
        .filter(Dataset.id.in_(request.dataset_ids))
        .all()
    )

    found_ids = {ds.id for ds in datasets}
    missing_ids = [ds_id for ds_id in request.dataset_ids if ds_id not in found_ids]

    if missing_ids:
        stages.append(InvestigationStage(
            stage=1,
            name="Evidence Ingestion",
            status="FAILED",
            summary=f"Missing dataset IDs: {', '.join(missing_ids)}.",
            timestamp=datetime.now(timezone.utc)
        ))
        raise DatasetNotFoundError(missing_ids)

    # Query lineage for each dataset (to know upstream origins and downstream impact)
    lineage_results = []
    lineage_parents = set()
    for ds in datasets:
        lin = get_dataset_lineage(db, ds.id, direction="both")
        lineage_results.append({
            "dataset_id": ds.id,
            "upstream_count": lin.upstream_count,
            "downstream_count": lin.downstream_count,
            "nodes": [n.name for n in lin.nodes],
            "edges": [e.transformation_type for e in lin.edges]
        })
        for node in lin.nodes:
            if node.id != ds.id:
                lineage_parents.add(node.name)

    stages.append(InvestigationStage(
        stage=1,
        name="Evidence Ingestion",
        status="COMPLETED",
        summary=f"Retrieved {len(datasets)} Data Passport(s) and queried lineage provenance topology.",
        timestamp=datetime.now(timezone.utc)
    ))

    # -------------------------------------------------------------------------
    # STAGE 2: Deterministic Risk Analysis
    # Runs Combination Engine (which includes privacy) or standalone Privacy Engine
    # -------------------------------------------------------------------------
    combination_result = None
    privacy_result = None

    if len(datasets) >= 2:
        combination_result = analyse_combination(datasets, request.proposed_purpose)
        privacy_result = analyse_privacy(datasets, request.proposed_purpose)
    else:
        privacy_result = analyse_privacy(datasets, request.proposed_purpose)

    stages.append(InvestigationStage(
        stage=2,
        name="Deterministic Risk Analysis",
        status="COMPLETED",
        summary="Evaluated combination governance constraints and multi-vector privacy risks.",
        timestamp=datetime.now(timezone.utc)
    ))

    # -------------------------------------------------------------------------
    # STAGE 3: Policy Evaluation
    # Evaluates intended operation (READ, EXPORT, RETRAIN_MODEL) and target region
    # -------------------------------------------------------------------------
    policy_results = []
    for ds in datasets:
        pol = evaluate_usage(
            dataset=ds,
            proposed_purpose=request.proposed_purpose,
            operation=request.operation,
            requester_role=request.requester_role,
            target_region=request.target_region
        )
        policy_results.append(pol)

    stages.append(InvestigationStage(
        stage=3,
        name="Policy Evaluation",
        status="COMPLETED",
        summary=f"Evaluated operation '{request.operation}' and governance restrictions for {len(datasets)} dataset(s).",
        timestamp=datetime.now(timezone.utc)
    ))

    # -------------------------------------------------------------------------
    # STAGE 4: AI Interpretation & Synthesis
    # Synthesizes findings using Meta AI or Deterministic Fallback Explainer
    # -------------------------------------------------------------------------
    ai_interpretation, ai_model_info = explain_investigation(
        objective=request.objective,
        datasets=datasets,
        combination_result=combination_result,
        privacy_result=privacy_result,
        policy_results=policy_results,
        lineage_results=lineage_results
    )

    stages.append(InvestigationStage(
        stage=4,
        name="AI Interpretation",
        status="COMPLETED",
        summary=f"Risk vectors and policy explanations synthesized using {ai_model_info.model_name}.",
        timestamp=datetime.now(timezone.utc)
    ))

    # -------------------------------------------------------------------------
    # QUADRANT 1: Observed Facts (100% Verified DB Attributes)
    # -------------------------------------------------------------------------
    observed_facts = [
        f"Target dataset(s): {', '.join(ds.name for ds in datasets)}.",
        f"Storage source(s): {', '.join(ds.source for ds in datasets)}.",
        f"Classification(s): {', '.join(f'{ds.name} ({ds.classification})' for ds in datasets)}.",
        f"At-rest encryption: {', '.join(('Encrypted' if ds.encrypted else 'Unencrypted') for ds in datasets)}.",
    ]
    if lineage_parents:
        observed_facts.append(f"Lineage provenance indicates upstream derivation from: {', '.join(sorted(lineage_parents))}.")

    # -------------------------------------------------------------------------
    # QUADRANT 2: Tool-Generated Analysis (Deterministic Engine Findings)
    # -------------------------------------------------------------------------
    tool_analysis = []
    if combination_result:
        tool_analysis.append(f"Combination Engine Decision: {combination_result['decision']} - {combination_result['reason']}")
        for f in combination_result.get("findings", []):
            cat = f.category if hasattr(f, 'category') else f.get('category')
            sev = f.severity if hasattr(f, 'severity') else f.get('severity')
            det = f.detail if hasattr(f, 'detail') else f.get('detail')
            tool_analysis.append(f"[{sev}] Governance Finding ({cat}): {det}")

    if privacy_result:
        for r in privacy_result.get("risks", []):
            rt = r.risk_type if hasattr(r, 'risk_type') else r.get('risk_type')
            st = r.status if hasattr(r, 'status') else r.get('status')
            sev = r.severity if hasattr(r, 'severity') else r.get('severity')
            det = r.detail if hasattr(r, 'detail') else r.get('detail')
            tool_analysis.append(f"[{st}] [{sev}] Privacy Finding ({rt}): {det}")

    for pol in policy_results:
        for viol in pol.get("violated_rules", []):
            tool_analysis.append(f"Policy Rule Violation: {viol}")

    # -------------------------------------------------------------------------
    # QUADRANT 4: Unknown Information & Gaps
    # -------------------------------------------------------------------------
    unknown_information = []
    for ds in datasets:
        if not ds.columns:
            unknown_information.append(f"Dataset '{ds.name}' has no registered columns in Data Passport; internal schema unverified.")
    for pol in policy_results:
        unknown_information.extend(pol.get("missing_information", []))
    if not unknown_information:
        unknown_information.append("All primary governance metadata fields present and accounted for.")

    # -------------------------------------------------------------------------
    # Recommendations (Deduplicated actionable advice from engines)
    # -------------------------------------------------------------------------
    recommendations = []
    if combination_result and combination_result["decision"] == "RESTRICTED":
        recommendations.append("Reject raw combination in current proposed configuration due to explicit policy restriction.")
    for pol in policy_results:
        recommendations.extend(pol.get("recommendations", []))
    if not recommendations:
        recommendations.append("Maintain standard access audits and monitor processing telemetry.")

    def dedupe(items: list[str]) -> list[str]:
        seen = set()
        return [x for x in items if not (x in seen or seen.add(x))]

    observed_facts = dedupe(observed_facts)
    tool_analysis = dedupe(tool_analysis)
    unknown_information = dedupe(unknown_information)
    recommendations = dedupe(recommendations)

    # -------------------------------------------------------------------------
    # Disposition & Decision Determination
    # Deterministic decisions govern the outcome. AI never overrides.
    # -------------------------------------------------------------------------
    has_hard_restriction = (
        (combination_result and combination_result["decision"] == "RESTRICTED") or
        any(p["decision"] == "RESTRICTED" for p in policy_results)
    )
    has_review_trigger = (
        (combination_result and combination_result["decision"] == "REQUIRES_REVIEW") or
        any(p["decision"] == "REQUIRES_REVIEW" for p in policy_results) or
        (privacy_result and privacy_result.get("overall_risk") in ("HIGH", "MEDIUM"))
    )

    if has_hard_restriction:
        overall_status = "BLOCKED"
        human_review_status = "PENDING_DPO_APPROVAL"
        recommended_disposition = "REJECTED"
        stage5_status = "PENDING"
        stage5_summary = "Policy restrictions triggered. Awaiting formal review or exception determination by Data Protection Officer."
    elif has_review_trigger:
        overall_status = "UNDER_REVIEW"
        human_review_status = "PENDING_DPO_APPROVAL"
        recommended_disposition = "APPROVED_WITH_CONDITIONS"
        stage5_status = "PENDING"
        stage5_summary = "Awaiting formal determination from Data Protection Officer regarding pseudonymization and conditional access."
    else:
        overall_status = "APPROVED"
        human_review_status = "NOT_REQUIRED"
        recommended_disposition = "APPROVED"
        stage5_status = "COMPLETED"
        stage5_summary = "All governance rules verified. Compliant with Data Passport requirements. No human review required."

    # -------------------------------------------------------------------------
    # STAGE 5: Human Review & DPO Sign-Off
    # Enforce rule: Never COMPLETED if DPO approval is pending.
    # -------------------------------------------------------------------------
    stages.append(InvestigationStage(
        stage=5,
        name="Human Review & DPO Sign-Off",
        status=stage5_status,
        summary=stage5_summary,
        timestamp=datetime.now(timezone.utc)
    ))

    # Draft DPO Audit Notes
    dpo_notes = DPOAuditNotes(
        investigation_scope=f"Evaluation of objective '{request.objective}' for purpose '{request.proposed_purpose}'.",
        datasets_involved=[f"{ds.name} (ID: {ds.id}, Classification: {ds.classification})" for ds in datasets],
        policies_evaluated=[
            "Data Passport Purpose Covenant Check",
            "Classification Escalation Rule",
            "Operation Scope Validation (READ/EXPORT/RETRAIN)",
            "Cross-Region Residency Check"
        ],
        verified_evidence=observed_facts[:3],
        ai_interpretation_summary=(
            f"Evaluated by {ai_model_info.model_name}. "
            + ("Restrictions found; raw processing denied." if has_hard_restriction else "Processing permissible with recommended governance conditions.")
        ),
        uncertainties_and_gaps=unknown_information,
        human_approval_required=(has_hard_restriction or has_review_trigger),
        recommended_disposition=recommended_disposition
    )

    return InvestigationResponse(
        id=inv_id,
        objective=request.objective,
        datasets=[f"{ds.name} ({ds.id})" for ds in datasets],
        created_at=now_utc,
        status=overall_status,
        human_review_status=human_review_status,
        stages=stages,
        observed_facts=observed_facts,
        tool_analysis=tool_analysis,
        ai_interpretation=ai_interpretation,
        unknown_information=unknown_information,
        recommendations=recommendations,
        dpo_audit_notes=dpo_notes,
        ai_model_info=ai_model_info
    )
