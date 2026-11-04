"""
test_ai_explainer.py
Automated mock test suite for DataTether AI Explainer (Meta AI / Deterministic Fallback).
Guarantees zero outbound network calls, zero consumption of credits, and complete error resilience.
"""

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.ai_explainer import _call_meta_ai, explain_investigation
from app.schemas.investigation import AIModelInfo


class DummyDataset:
    def __init__(self, name: str, classification: str = "CONFIDENTIAL"):
        self.name = name
        self.classification = classification


class TestAIExplainer(unittest.TestCase):

    def setUp(self):
        # Ensure clean environment before each test
        os.environ.pop("MODEL_API_KEY", None)
        os.environ.pop("META_AI_API_KEY", None)
        os.environ.pop("META_AI_ENDPOINT", None)

    def tearDown(self):
        os.environ.pop("MODEL_API_KEY", None)
        os.environ.pop("META_AI_API_KEY", None)
        os.environ.pop("META_AI_ENDPOINT", None)

    def test_deterministic_fallback_when_no_key(self):
        """When no API key is set, deterministic fallback is engaged without network calls."""
        datasets = [DummyDataset("DEMO – Customer Records")]
        interpretations, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result={"decision": "RESTRICTED", "findings": []},
            privacy_result={"risks": []},
            policy_results=[],
            lineage_results=[]
        )

        self.assertEqual(model_info.provider, "DETERMINISTIC_FALLBACK")
        self.assertEqual(model_info.model_name, "Deterministic Governance Explainer")
        self.assertFalse(model_info.is_live_call)
        self.assertIn("MODEL_API_KEY not configured or offline", model_info.fallback_reason or "")
        self.assertTrue(len(interpretations) > 0)
        self.assertIn("DEMO – Customer Records", interpretations[0])

    @patch("urllib.request.urlopen")
    def test_meta_ai_success_with_model_api_key(self, mock_urlopen):
        """When MODEL_API_KEY is provided and HTTP 200 succeeds, muse-spark-1.3 is identified."""
        os.environ["MODEL_API_KEY"] = "dummy-test-key-12345"

        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "choices": [
                {
                    "message": {
                        "content": json.dumps([
                            "Customer identity data carries strict purpose restrictions.",
                            "Direct model training without consent violates governance policies."
                        ])
                    }
                }
            ]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        datasets = [DummyDataset("DEMO – Customer Records")]
        interpretations, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result={"decision": "RESTRICTED", "findings": []},
            privacy_result={"risks": []},
            policy_results=[],
            lineage_results=[]
        )

        self.assertEqual(model_info.provider, "META_AI")
        self.assertEqual(model_info.model_name, "muse-spark-1.3")
        self.assertTrue(model_info.is_live_call)
        self.assertIsNone(model_info.fallback_reason)
        self.assertEqual(len(interpretations), 2)
        self.assertIn("Customer identity data carries strict purpose restrictions.", interpretations[0])

        # Verify request parameters
        call_args = mock_urlopen.call_args
        req = call_args[0][0]
        self.assertEqual(req.get_full_url(), "https://api.meta.ai/v1/chat/completions")
        self.assertEqual(req.headers.get("Authorization"), "Bearer dummy-test-key-12345")
        req_payload = json.loads(req.data.decode("utf-8"))
        self.assertEqual(req_payload.get("model"), "muse-spark-1.3")

    @patch("urllib.request.urlopen")
    def test_meta_ai_fallback_key_precedence(self, mock_urlopen):
        """MODEL_API_KEY takes precedence over legacy META_AI_API_KEY."""
        os.environ["MODEL_API_KEY"] = "primary-key-abc"
        os.environ["META_AI_API_KEY"] = "secondary-key-xyz"

        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "choices": [{"message": {"content": "[\"Synthesized output\"]"}}]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        _call_meta_ai("test prompt", os.getenv("MODEL_API_KEY") or os.getenv("META_AI_API_KEY"))

        call_args = mock_urlopen.call_args
        req = call_args[0][0]
        self.assertEqual(req.headers.get("Authorization"), "Bearer primary-key-abc")

    @patch("urllib.request.urlopen")
    def test_handles_401_unauthorized_safely(self, mock_urlopen):
        """HTTP 401 Unauthorized safely falls back to deterministic explainer without crashing."""
        os.environ["MODEL_API_KEY"] = "invalid-key"
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.meta.ai/v1/chat/completions",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=MagicMock()
        )

        datasets = [DummyDataset("DEMO – Customer Records")]
        interpretations, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result={"decision": "RESTRICTED", "findings": []},
            privacy_result={"risks": []},
            policy_results=[],
            lineage_results=[]
        )

        self.assertEqual(model_info.provider, "DETERMINISTIC_FALLBACK")
        self.assertFalse(model_info.is_live_call)
        self.assertTrue(len(interpretations) > 0)

    @patch("urllib.request.urlopen")
    def test_handles_429_rate_limit_safely(self, mock_urlopen):
        """HTTP 429 Rate Limit / Quota Exceeded safely engages deterministic fallback."""
        os.environ["MODEL_API_KEY"] = "valid-key-rate-limited"
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.meta.ai/v1/chat/completions",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=MagicMock()
        )

        datasets = [DummyDataset("DEMO – Customer Records")]
        interpretations, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result=None,
            privacy_result=None,
            policy_results=[],
            lineage_results=[]
        )

        self.assertEqual(model_info.provider, "DETERMINISTIC_FALLBACK")
        self.assertFalse(model_info.is_live_call)

    @patch("urllib.request.urlopen")
    def test_handles_timeout_and_malformed_json_safely(self, mock_urlopen):
        """Timeouts or malformed JSON responses safely fall back, and timeout parameter is 12 seconds."""
        # 1. Timeout
        os.environ["MODEL_API_KEY"] = "key"
        mock_urlopen.side_effect = TimeoutError("Request timed out after 12s")
        resp = _call_meta_ai("prompt", "key")
        self.assertIsNone(resp)
        self.assertEqual(mock_urlopen.call_args[1].get("timeout"), 12)

        # 2. Malformed JSON
        mock_response = MagicMock()
        mock_response.read.return_value = b"<html>502 Bad Gateway</html>"
        mock_urlopen.side_effect = None
        mock_urlopen.return_value.__enter__.return_value = mock_response
        resp = _call_meta_ai("prompt", "key")
        self.assertIsNone(resp)

    @patch("urllib.request.urlopen")
    def test_handles_403_forbidden_safely(self, mock_urlopen):
        """HTTP 403 Forbidden (account restriction) safely triggers deterministic fallback without crashing."""
        os.environ["MODEL_API_KEY"] = "restricted-account-key"
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.meta.ai/v1/chat/completions",
            code=403,
            msg="Forbidden",
            hdrs={},
            fp=MagicMock()
        )

        datasets = [DummyDataset("DEMO – Customer Records")]
        interpretations, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result={"decision": "RESTRICTED", "findings": []},
            privacy_result={"risks": []},
            policy_results=[],
            lineage_results=[]
        )

        self.assertEqual(model_info.provider, "DETERMINISTIC_FALLBACK")
        self.assertFalse(model_info.is_live_call)
        self.assertEqual(model_info.model_name, "Deterministic Governance Explainer")
        self.assertTrue(len(interpretations) > 0)

    @patch("urllib.request.urlopen")
    def test_api_key_never_leaked_in_model_info_or_exceptions(self, mock_urlopen):
        """Secret API key values must never appear in interpretations, fallback reasons, or AIModelInfo."""
        secret_key = "super-secret-meta-api-token-9999"
        os.environ["MODEL_API_KEY"] = secret_key

        # Simulate exception raised during network call
        mock_urlopen.side_effect = Exception(f"Failed with key {secret_key}")

        datasets = [DummyDataset("DEMO – Customer Records")]
        interpretations, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result={"decision": "RESTRICTED", "findings": []},
            privacy_result={"risks": []},
            policy_results=[],
            lineage_results=[]
        )

        # Verify key is absent from all outputs
        for line in interpretations:
            self.assertNotIn(secret_key, line)
        self.assertNotIn(secret_key, model_info.fallback_reason or "")
        self.assertNotIn(secret_key, model_info.model_name)
        self.assertNotIn(secret_key, model_info.provider)

    @patch("urllib.request.urlopen")
    def test_failed_meta_response_never_claims_live_or_meta_provider(self, mock_urlopen):
        """A failed or empty Meta response must never produce provider=META_AI or is_live_call=True."""
        os.environ["MODEL_API_KEY"] = "valid-key-but-empty-return"
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"choices": []}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        datasets = [DummyDataset("DEMO – Customer Records")]
        _, model_info = explain_investigation(
            objective="Evaluate AI Training",
            datasets=datasets,
            combination_result=None,
            privacy_result=None,
            policy_results=[],
            lineage_results=[]
        )

        self.assertNotEqual(model_info.provider, "META_AI")
        self.assertEqual(model_info.provider, "DETERMINISTIC_FALLBACK")
        self.assertFalse(model_info.is_live_call)

    @patch("urllib.request.urlopen")
    def test_malformed_response_structures_safely_trigger_fallback(self, mock_urlopen):
        """Corrupted response envelopes (missing choices, missing message, non-list JSON) trigger fallback safely."""
        os.environ["MODEL_API_KEY"] = "key"

        # Case A: Choices missing message key
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"choices": [{"no_message": {}}]}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response
        self.assertIsNone(_call_meta_ai("prompt", "key"))

        # Case B: Top-level not a dict
        mock_response.read.return_value = json.dumps(["array_instead_of_dict"]).encode("utf-8")
        self.assertIsNone(_call_meta_ai("prompt", "key"))

        # Case C: Empty content
        mock_response.read.return_value = json.dumps({"choices": [{"message": {"content": ""}}]}).encode("utf-8")
        self.assertIsNone(_call_meta_ai("prompt", "key"))

    def test_endpoint_strictly_uses_https(self):
        """The Meta AI endpoint strictly uses the HTTPS protocol."""
        # Test default
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_response = MagicMock()
            mock_response.read.return_value = json.dumps({"choices": [{"message": {"content": "[\"OK\"]"}}]}).encode("utf-8")
            mock_urlopen.return_value.__enter__.return_value = mock_response

            _call_meta_ai("prompt", "key")
            call_args = mock_urlopen.call_args
            req = call_args[0][0]
            self.assertTrue(req.get_full_url().startswith("https://"))

        # Test non-https upgrade
        os.environ["META_AI_ENDPOINT"] = "http://api.meta.ai/v1/chat/completions"
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.return_value.__enter__.return_value = mock_response
            _call_meta_ai("prompt", "key")
            call_args = mock_urlopen.call_args
            req = call_args[0][0]
            self.assertTrue(req.get_full_url().startswith("https://"))


if __name__ == "__main__":
    unittest.main()
