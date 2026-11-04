"""
test_orchestrator_storage_evidence.py

Focused tests for the storage-evidence corrections in investigation_orchestrator.py.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

TESTS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.investigation_orchestrator import run_investigation
from app.schemas.investigation import InvestigationRequest, AIModelInfo


class _Dataset:
    def __init__(self, id, name, source, classification, encrypted=True, columns=None):
        self.id = id
        self.name = name
        self.source = source
        self.classification = classification
        self.encrypted = encrypted
        self.columns = columns or []


_DEMO_DATASETS = [
    _Dataset(
        id="05c565c9-c866-46e5-8b3d-a0549f8508d6",
        name="DEMO - Customer Records",
        source="minio-demo/customer-vault/demo_customer_records.csv",
        classification="CONFIDENTIAL",
        encrypted=True,
    ),
    _Dataset(
        id="fa2285d0-2917-4930-bf1d-5699fbdde667",
        name="DEMO - Purchase History",
        source="minio-demo/analytics/demo_purchase_history.parquet",
        classification="INTERNAL",
        encrypted=False,
    ),
]

_MOCK_AI_MODEL_INFO = AIModelInfo(
    provider="DETERMINISTIC_FALLBACK",
    model_name="Deterministic Governance Explainer",
    is_live_call=False,
    fallback_reason="No API key configured in test environment",
)


def _make_request():
    return InvestigationRequest(
        dataset_ids=[ds.id for ds in _DEMO_DATASETS],
        objective="Evaluate AI Training",
        proposed_purpose="analytics",
        operation="READ",
        requester_role="data_scientist",
        target_region="EU",
    )


def _run(datasets=None):
    if datasets is None:
        datasets = _DEMO_DATASETS

    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = datasets

    minimal_lineage = MagicMock()
    minimal_lineage.upstream_count = 0
    minimal_lineage.downstream_count = 0
    minimal_lineage.nodes = []
    minimal_lineage.edges = []

    with (
        patch("app.services.investigation_orchestrator.get_dataset_lineage",
              return_value=minimal_lineage),
        patch("app.services.investigation_orchestrator.analyse_combination",
              return_value={
                  "decision": "RESTRICTED",
                  "reason": "Cross-dataset identity linkage detected.",
                  "findings": [],
              }),
        patch("app.services.investigation_orchestrator.analyse_privacy",
              return_value={"risks": [], "overall_risk": "HIGH"}),
        patch("app.services.investigation_orchestrator.evaluate_usage",
              return_value={
                  "decision": "RESTRICTED",
                  "violated_rules": ["EU GDPR Article 5(1)(b) - Purpose Limitation"],
                  "missing_information": [],
                  "recommendations": [],
              }),
        patch("app.services.investigation_orchestrator.explain_investigation",
              return_value=(
                  ["Deterministic explanation."],
                  _MOCK_AI_MODEL_INFO,
              )),
    ):
        return run_investigation(db, _make_request())


class TestQuadrant1StorageLabel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.response = _run()
        cls.observed = cls.response.observed_facts

    def test_no_legacy_storage_source_label(self):
        """Legacy 'Storage source(s):' label must not appear in Quadrant 1."""
        for fact in self.observed:
            self.assertNotIn("Storage source(s):", fact,
                             msg=f"Legacy label found in: {fact!r}")

    def test_registered_passport_source_label_present(self):
        """'Registered Data Passport source(s):' label must appear in Quadrant 1."""
        found = any("Registered Data Passport source(s):" in f for f in self.observed)
        self.assertTrue(found, msg=f"Label not found: {self.observed}")

    def test_declared_metadata_qualifier_present(self):
        """'declared database metadata' qualifier must appear in Quadrant 1."""
        found = any("declared database metadata" in f for f in self.observed)
        self.assertTrue(found, msg=f"Qualifier not found: {self.observed}")

    def test_not_independently_verified_qualifier_present(self):
        """'not independently verified by this investigation' disclaimer must appear."""
        found = any("not independently verified by this investigation" in f for f in self.observed)
        self.assertTrue(found, msg=f"Disclaimer not found: {self.observed}")

    def test_source_paths_still_included(self):
        """Both registered source paths must still appear verbatim."""
        combined = " ".join(self.observed)
        self.assertIn("minio-demo/customer-vault/demo_customer_records.csv", combined)
        self.assertIn("minio-demo/analytics/demo_purchase_history.parquet", combined)

    def test_classifications_still_present(self):
        """Classifications must remain in Quadrant 1."""
        combined = " ".join(self.observed)
        self.assertIn("CONFIDENTIAL", combined)
        self.assertIn("INTERNAL", combined)


class TestQuadrant4StorageVerificationGap(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.response = _run()
        cls.unknown = cls.response.unknown_information

    def test_gap_present_for_each_dataset(self):
        """Every dataset must have a storage verification gap entry."""
        for ds in _DEMO_DATASETS:
            found = any(ds.name in item for item in self.unknown)
            self.assertTrue(found,
                            msg=f"No gap entry for '{ds.name}':\n{self.unknown}")

    def test_not_independently_verified_phrase(self):
        """'has not independently verified' must appear in Quadrant 4."""
        combined = " ".join(self.unknown)
        self.assertIn("has not independently verified", combined,
                      msg=f"Phrase missing: {self.unknown}")

    def test_no_persisted_scan_evidence_claimed(self):
        """Investigation must state it does not consume persisted scan evidence."""
        combined = " ".join(self.unknown)
        self.assertIn("does not consume persisted storage scan evidence", combined,
                      msg=f"Phrase missing: {self.unknown}")

    def test_source_paths_labelled_as_declared_metadata(self):
        """Source paths in Quadrant 4 must be framed as declared database metadata."""
        combined = " ".join(self.unknown)
        self.assertIn("declared database metadata", combined,
                      msg=f"Label missing: {self.unknown}")

    def test_legacy_paths_in_unknown(self):
        """Legacy MinIO paths must appear in Quadrant 4 (labelled, not verified)."""
        combined = " ".join(self.unknown)
        self.assertIn("minio-demo/customer-vault/demo_customer_records.csv", combined)
        self.assertIn("minio-demo/analytics/demo_purchase_history.parquet", combined)


class TestDPOVerifiedEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.response = _run()
        cls.evidence = cls.response.dpo_audit_notes.verified_evidence

    def test_evidence_count_matches_dataset_count(self):
        """One verified_evidence entry per dataset."""
        self.assertEqual(len(self.evidence), len(_DEMO_DATASETS))

    def test_dataset_ids_present(self):
        """Both dataset UUIDs must appear in verified_evidence."""
        combined = " ".join(self.evidence)
        self.assertIn("05c565c9-c866-46e5-8b3d-a0549f8508d6", combined)
        self.assertIn("fa2285d0-2917-4930-bf1d-5699fbdde667", combined)

    def test_classifications_present(self):
        """Dataset classifications must be in verified_evidence."""
        combined = " ".join(self.evidence)
        self.assertIn("CONFIDENTIAL", combined)
        self.assertIn("INTERNAL", combined)

    def test_encryption_metadata_present(self):
        """Encryption facts must appear in verified_evidence."""
        combined = " ".join(self.evidence)
        self.assertIn("Encrypted", combined)
        self.assertIn("Unencrypted", combined)

    def test_source_labelled_as_declared_metadata(self):
        """DPO evidence must label source as 'declared metadata only'."""
        combined = " ".join(self.evidence)
        self.assertIn("declared metadata only", combined,
                      msg=f"Label missing: {self.evidence}")

    def test_no_physical_verification_claimed(self):
        """DPO evidence must not assert physical storage has been verified."""
        forbidden = [
            "physical storage verified",
            "confirmed at storage",
            "aws object verified",
            "s3 object confirmed",
        ]
        combined = " ".join(self.evidence).lower()
        for phrase in forbidden:
            self.assertNotIn(phrase, combined,
                             msg=f"Forbidden phrase found: {phrase!r}")

    def test_not_independently_verified_disclaimer(self):
        """DPO evidence must carry 'not independently verified by this investigation'."""
        combined = " ".join(self.evidence)
        self.assertIn("not independently verified by this investigation", combined,
                      msg=f"Disclaimer missing: {self.evidence}")

    def test_evidence_not_verbatim_slice_of_observed_facts(self):
        """DPO evidence must NOT be a verbatim slice of observed_facts."""
        overlap = set(self.evidence) & set(self.response.observed_facts)
        self.assertEqual(len(overlap), 0,
                         msg=f"DPO evidence is verbatim copy of observed_facts: {overlap}")

    def test_source_paths_present_for_audit(self):
        """Registered paths must still appear in DPO evidence for auditability."""
        combined = " ".join(self.evidence)
        self.assertIn("minio-demo/customer-vault/demo_customer_records.csv", combined)
        self.assertIn("minio-demo/analytics/demo_purchase_history.parquet", combined)


class TestExistingFunctionalityPreserved(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.response = _run()

    def test_investigation_id_generated(self):
        self.assertTrue(self.response.id.startswith("INV-"))

    def test_status_blocked_on_restriction(self):
        """RESTRICTED decision must produce BLOCKED overall status."""
        self.assertEqual(self.response.status, "BLOCKED")

    def test_human_review_pending(self):
        self.assertEqual(self.response.human_review_status, "PENDING_DPO_APPROVAL")

    def test_five_stages(self):
        self.assertEqual(len(self.response.stages), 5)

    def test_ai_interpretation_non_empty(self):
        self.assertGreater(len(self.response.ai_interpretation), 0)

    def test_tool_analysis_non_empty(self):
        self.assertGreater(len(self.response.tool_analysis), 0)

    def test_dpo_scope_includes_objective(self):
        self.assertIn("Evaluate AI Training",
                      self.response.dpo_audit_notes.investigation_scope)

    def test_datasets_involved_non_empty(self):
        self.assertGreater(len(self.response.dpo_audit_notes.datasets_involved), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
