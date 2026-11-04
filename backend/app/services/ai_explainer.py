"""
ai_explainer.py

AI interpretation and explainability engine for DataTether.
Synthesizes verified findings from Phases 1-5 into plain-English explanations,
uncertainty caveats, and actionable DPO recommendations.

Dual-mode architecture:
1. Meta AI API: Attempts live inference with model muse-spark-1.3 if MODEL_API_KEY
   (or fallback META_AI_API_KEY) is configured.
2. Deterministic Fallback: Generates evidence-grounded synthesis if no API key is provided
   or if network/model call fails. No hallucinations, no fabricated claims.
"""

import json
import os
import urllib.request
import urllib.error
from app.schemas.investigation import AIModelInfo


def _call_meta_ai(prompt: str, api_key: str, endpoint: str | None = None) -> list[str] | None:
    """
    Safely query Meta AI endpoint (muse-spark-1.3).
    Returns list of interpretation bullet points, or None if the call fails.
    Catches 401, 403, 429, timeouts, network errors, and malformed responses without leaking secrets.
    """
    raw_url = endpoint or os.getenv("META_AI_ENDPOINT", "https://api.meta.ai/v1/chat/completions")
    url = raw_url if raw_url.startswith("https://") else raw_url.replace("http://", "https://")
    payload = {
        "model": "muse-spark-1.3",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the DataTether AI Governance Explainer. Your job is to explain "
                    "verified security, privacy, and policy findings to a Data Protection Officer. "
                    "Rules: Never invent dataset attributes or facts. Never claim a data breach "
                    "without proof. Distinguish detected facts from potential risks. "
                    "Output a valid JSON array of strings explaining the key findings in plain English."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            if not isinstance(body, dict) or "choices" not in body or not body["choices"]:
                return None
            message = body["choices"][0].get("message", {})
            content = message.get("content")
            if not content:
                return None
            try:
                parsed = json.loads(content)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed if item]
            except Exception:
                pass
            return [content]
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, Exception):
        # Gracefully handle 401, 403, 429, connection errors, timeouts, or invalid payloads without logging or exposing secrets
        return None


def _generate_deterministic_interpretation(
    objective: str,
    datasets: list,
    combination_result: dict | None,
    privacy_result: dict | None,
    policy_results: list[dict],
    lineage_results: list[dict]
) -> list[str]:
    """
    Deterministic synthesis grounded 100% in backend facts.
    """
    interpretations = []

    # 1. Dataset Scope Synthesis
    names = [ds.name for ds in datasets]
    classifications = sorted(set(ds.classification for ds in datasets))
    interpretations.append(
        f"Investigation evaluated {len(datasets)} dataset(s): {', '.join(names)} "
        f"carrying sensitivity classification(s) [{', '.join(classifications)}]."
    )

    # 2. Combination & Governance Interpretation
    if combination_result:
        dec = combination_result.get("decision")
        findings = combination_result.get("findings", [])
        if dec == "RESTRICTED":
            interpretations.append(
                f"Combination Governance Engine determined state RESTRICTED: The proposed purpose conflicts "
                f"with negative covenants or sharing prohibitions in the registered Data Passports."
            )
        elif dec == "REQUIRES_REVIEW":
            interpretations.append(
                f"Combination Governance Engine determined state REQUIRES_REVIEW: Purpose is unlisted or "
                f"governance asymmetries (classification, encryption, or region) were detected."
            )
        else:
            interpretations.append(
                "Combination Governance Engine determined state PERMITTED: Data Passports indicate full "
                "purpose alignment across all candidate datasets."
            )

        for f in findings:
            cat = f.category if hasattr(f, "category") else f.get("category", "")
            detail = f.detail if hasattr(f, "detail") else f.get("detail", "")
            if cat == "Classification Mismatch":
                interpretations.append(
                    f"Asymmetric sensitivity: Combining these datasets elevates the aggregate classification "
                    f"to the most restrictive level, requiring heightened access controls."
                )
            elif cat == "Encryption Mismatch":
                interpretations.append(
                    f"Cryptographic exposure: Mixing encrypted with unencrypted sources risks exposing protected "
                    f"attributes in intermediate transit or unencrypted cache memory."
                )

    # 3. Privacy Risks Interpretation
    if privacy_result:
        risks = privacy_result.get("risks", [])

        # Specifically evaluate Sensitive Attribute finding for actual attribute count and names
        sens_risk = next((r for r in risks if (r.risk_type if hasattr(r, 'risk_type') else r.get('risk_type')) == "Sensitive Attribute"), None)
        if sens_risk:
            sens_evidence = (sens_risk.evidence if hasattr(sens_risk, 'evidence') else sens_risk.get('evidence')) or []
            if sens_evidence:
                interpretations.append(
                    f"Direct Privacy Exposure: {len(sens_evidence)} sensitive attribute(s) detected in schema ({', '.join(sens_evidence)}). "
                    f"Exposing these attributes under unapproved processing creates regulatory non-compliance."
                )

        # Specifically evaluate Cross-Dataset Linkage Risk as a distinct surface
        link_risk = next((r for r in risks if (r.risk_type if hasattr(r, 'risk_type') else r.get('risk_type')) == "Cross-Dataset Linkage Risk"), None)
        if link_risk:
            link_keys = (link_risk.evidence if hasattr(link_risk, 'evidence') else link_risk.get('evidence')) or []
            if link_keys:
                interpretations.append(
                    f"Cross-Dataset Linkage Surface: Shared key(s) [{', '.join(link_keys)}] permit relational joining across boundaries."
                )

        potential_count = sum(1 for r in risks if (r.status if hasattr(r, 'status') else r.get('status')) == "POTENTIAL")
        if potential_count > 0:
            interpretations.append(
                f"Re-identification Surface: Accumulation of indirect identifiers (e.g. demographic or location attributes) "
                f"creates a potential linkage surface that could narrow down individual identities."
            )

    # 4. Policy & Operation Interpretation
    for pol in policy_results:
        violated = pol.get("violated_rules", [])
        ds_name = pol.get("dataset_name")
        if violated:
            prefix = f"Policy Gate Blocked ({ds_name})" if ds_name else "Policy Gate Blocked"
            interpretations.append(
                f"{prefix}: {violated[0]}"
            )

    # 5. Lineage Synthesis
    if lineage_results:
        downstream_total = sum(l.get("downstream_count", 0) for l in lineage_results)
        if downstream_total > 0:
            interpretations.append(
                f"Downstream Lineage Impact: Found {downstream_total} dependent derived dataset(s) "
                f"that would inherit any policy or sensitivity restrictions."
            )

    # Deduplicate while strictly preserving insertion order
    return list(dict.fromkeys(interpretations))


def explain_investigation(
    objective: str,
    datasets: list,
    combination_result: dict | None,
    privacy_result: dict | None,
    policy_results: list[dict],
    lineage_results: list[dict]
) -> tuple[list[str], AIModelInfo]:
    """
    Generates plain-English interpretation for the investigation.
    Returns (interpretations, ai_model_info).
    Supports MODEL_API_KEY (official) with META_AI_API_KEY as backward-compatible fallback.
    """
    # Official env var takes precedence, fallback to backward-compatible env var
    api_key = os.getenv("MODEL_API_KEY") or os.getenv("META_AI_API_KEY")

    if api_key and api_key.strip():
        # Attempt live Meta AI call
        prompt = (
            f"Objective: {objective}\n"
            f"Datasets: {[ds.name for ds in datasets]}\n"
            f"Governance Decision: {combination_result.get('decision') if combination_result else 'N/A'}\n"
            f"Governance Findings: {[f.detail if hasattr(f, 'detail') else f.get('detail') for f in (combination_result.get('findings') if combination_result else [])]}\n"
            f"Privacy Risks: {[r.detail if hasattr(r, 'detail') else r.get('detail') for r in (privacy_result.get('risks') if privacy_result else [])]}\n"
            f"Policy Violations: {[v for pol in policy_results for v in pol.get('violated_rules', [])]}"
        )
        ai_resp = _call_meta_ai(prompt, api_key.strip())
        if ai_resp:
            return ai_resp, AIModelInfo(
                provider="META_AI",
                model_name="muse-spark-1.3",
                is_live_call=True,
                fallback_reason=None
            )

    # Deterministic fallback
    deterministic_resp = _generate_deterministic_interpretation(
        objective=objective,
        datasets=datasets,
        combination_result=combination_result,
        privacy_result=privacy_result,
        policy_results=policy_results,
        lineage_results=lineage_results
    )
    fallback_reason = "MODEL_API_KEY not configured or offline; deterministic ground-truth synthesis engaged."
    return deterministic_resp, AIModelInfo(
        provider="DETERMINISTIC_FALLBACK",
        model_name="Deterministic Governance Explainer",
        is_live_call=False,
        fallback_reason=fallback_reason
    )
