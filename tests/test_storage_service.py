"""
test_storage_service.py

Unit tests for storage_service.py.

All tests use mocked boto3 clients — no real AWS or MinIO requests are ever made.
Environment variables are patched per-test so nothing leaks between tests.
The existing demo datasets in SQLite are never touched.
"""

import sys
import os
import types
from unittest.mock import MagicMock, patch, PropertyMock

import pytest

# ── Ensure the backend package is importable ──────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services import storage_service as svc
from app.schemas.storage import DiscoveredDataset, StorageScanResponse


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _make_db(existing_datasets=None):
    """Return a minimal SQLAlchemy Session mock with no registered datasets."""
    db = MagicMock()
    db.query.return_value.all.return_value = existing_datasets or []
    return db


def _make_s3_object(key: str, size: int = 1024):
    """Build a dict that mimics a boto3 ListObjectsV2 Contents entry."""
    return {"Key": key, "Size": size, "ETag": '"abc123"'}


def _make_paginator(pages: list[list[dict]]):
    """
    Return a mock paginator whose paginate() yields one page per inner list.
    Each page has a 'Contents' key containing the provided object dicts.
    """
    paginator = MagicMock()
    paginator.paginate.return_value = [
        {"Contents": page} for page in pages
    ]
    return paginator


# ── Test: list_storage_connections (no boto3 call, env-based status) ──────────

class TestListStorageConnections:

    def test_no_credentials_minio_is_simulated(self, monkeypatch):
        """Without credentials, local MinIO should report SIMULATED."""
        monkeypatch.delenv("MINIO_ACCESS_KEY", raising=False)
        monkeypatch.delenv("MINIO_SECRET_KEY", raising=False)
        connections = svc.list_storage_connections()
        minio = next(c for c in connections if c.id == "STR-01")
        assert minio.status == "SIMULATED"

    def test_no_credentials_aws_is_disconnected(self, monkeypatch):
        """Without credentials, AWS S3 should report DISCONNECTED."""
        monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
        monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
        connections = svc.list_storage_connections()
        aws = next(c for c in connections if c.id == "STR-02")
        assert aws.status == "DISCONNECTED"

    def test_credentials_present_returns_configured(self, monkeypatch):
        """When credentials are present, status should be CONFIGURED (not yet confirmed live)."""
        monkeypatch.setenv("MINIO_ACCESS_KEY", "minioadmin")
        monkeypatch.setenv("MINIO_SECRET_KEY", "minioadmin")
        connections = svc.list_storage_connections()
        minio = next(c for c in connections if c.id == "STR-01")
        assert minio.status == "CONFIGURED"

    def test_response_never_contains_credentials(self, monkeypatch):
        """Connection responses must not leak any credential values."""
        monkeypatch.setenv("MINIO_ACCESS_KEY", "super-secret-key")
        monkeypatch.setenv("MINIO_SECRET_KEY", "another-secret")
        for conn in svc.list_storage_connections():
            for field_value in [conn.endpoint, conn.notes, conn.status]:
                assert "super-secret-key" not in field_value
                assert "another-secret" not in field_value


# ── Test: scan_storage_connection — DISCONNECTED path ─────────────────────────

class TestScanDisconnected:

    def test_aws_no_credentials_returns_disconnected(self, monkeypatch):
        """Scanning AWS S3 without credentials must return status=DISCONNECTED, not an error."""
        monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
        monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
        db = _make_db()
        result = svc.scan_storage_connection(db, "STR-02")
        assert result.status == "DISCONNECTED"
        assert result.files_found == 0
        assert result.items == []

    def test_disconnected_status_detail_is_helpful(self, monkeypatch):
        monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
        monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
        db = _make_db()
        result = svc.scan_storage_connection(db, "STR-02")
        assert "AWS_ACCESS_KEY_ID" in result.status_detail or "credentials" in result.status_detail.lower()

    def test_unknown_connection_raises_value_error(self):
        db = _make_db()
        with pytest.raises(ValueError, match="not found"):
            svc.scan_storage_connection(db, "STR-INVALID")


# ── Test: scan_storage_connection — SIMULATED path ───────────────────────────

class TestScanSimulated:

    def test_minio_no_credentials_returns_simulated(self, monkeypatch):
        """Without credentials, local MinIO scan must return SIMULATED — not ERROR or empty."""
        monkeypatch.delenv("MINIO_ACCESS_KEY", raising=False)
        monkeypatch.delenv("MINIO_SECRET_KEY", raising=False)
        db = _make_db()
        result = svc.scan_storage_connection(db, "STR-01")
        assert result.status == "SIMULATED"
        assert result.files_found > 0

    def test_simulated_items_are_labelled(self, monkeypatch):
        """All items returned in SIMULATED mode must have is_simulated=True."""
        monkeypatch.delenv("MINIO_ACCESS_KEY", raising=False)
        monkeypatch.delenv("MINIO_SECRET_KEY", raising=False)
        db = _make_db()
        result = svc.scan_storage_connection(db, "STR-01")
        for item in result.items:
            assert item.is_simulated is True, f"Expected is_simulated=True for {item.file_name}"

    def test_simulated_does_not_call_boto3(self, monkeypatch):
        """When credentials are absent, boto3.client must never be called."""
        monkeypatch.delenv("MINIO_ACCESS_KEY", raising=False)
        monkeypatch.delenv("MINIO_SECRET_KEY", raising=False)
        db = _make_db()
        with patch("boto3.client") as mock_boto3:
            svc.scan_storage_connection(db, "STR-01")
            mock_boto3.assert_not_called()


# ── Test: scan_storage_connection — CONNECTED path (successful live scan) ─────

class TestScanConnected:

    def _patch_env(self, monkeypatch):
        monkeypatch.setenv("MINIO_ACCESS_KEY", "minioadmin")
        monkeypatch.setenv("MINIO_SECRET_KEY", "minioadmin")
        monkeypatch.setenv("MINIO_ENDPOINT", "http://localhost:9000")
        monkeypatch.setenv("MINIO_BUCKET", "test-bucket")

    def test_successful_scan_returns_connected(self, monkeypatch):
        """A successful boto3 scan must return status=CONNECTED with real (non-simulated) items."""
        self._patch_env(monkeypatch)
        db = _make_db()

        mock_client = MagicMock()
        mock_client.get_paginator.return_value = _make_paginator([
            [_make_s3_object("data/records.csv", 50_000)],
        ])

        with patch.object(svc, "_make_s3_client", return_value=mock_client):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.status == "CONNECTED"
        assert result.files_found == 1
        assert result.items[0].is_simulated is False
        assert result.items[0].file_name == "records.csv"

    def test_real_items_have_correct_size(self, monkeypatch):
        self._patch_env(monkeypatch)
        db = _make_db()

        mock_client = MagicMock()
        mock_client.get_paginator.return_value = _make_paginator([
            [_make_s3_object("reports/annual.parquet", 99_000)],
        ])

        with patch.object(svc, "_make_s3_client", return_value=mock_client):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.items[0].size_bytes == 99_000
        assert result.items[0].file_format == "PARQUET"

    def test_pagination_collects_all_objects(self, monkeypatch):
        """Objects across multiple pages must all be collected."""
        self._patch_env(monkeypatch)
        db = _make_db()

        mock_client = MagicMock()
        mock_client.get_paginator.return_value = _make_paginator([
            [_make_s3_object("a.csv"), _make_s3_object("b.csv")],
            [_make_s3_object("c.json")],
        ])

        with patch.object(svc, "_make_s3_client", return_value=mock_client):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.files_found == 3

    def test_record_count_is_zero_no_file_download(self, monkeypatch):
        """
        record_count must always be 0 for real scans — reading file contents
        to count rows is explicitly forbidden.
        """
        self._patch_env(monkeypatch)
        db = _make_db()

        mock_client = MagicMock()
        mock_client.get_paginator.return_value = _make_paginator([
            [_make_s3_object("bigfile.csv", 500_000_000)],
        ])

        with patch.object(svc, "_make_s3_client", return_value=mock_client):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.items[0].record_count == 0


# ── Test: scan_storage_connection — ERROR path ────────────────────────────────

class TestScanErrors:

    def _patch_env(self, monkeypatch):
        monkeypatch.setenv("MINIO_ACCESS_KEY", "minioadmin")
        monkeypatch.setenv("MINIO_SECRET_KEY", "minioadmin")
        monkeypatch.setenv("MINIO_BUCKET", "test-bucket")

    def _make_client_error(self, code: str):
        """Create a botocore ClientError with the given error code."""
        import botocore.exceptions
        error_response = {"Error": {"Code": code, "Message": "mocked"}}
        return botocore.exceptions.ClientError(error_response, "ListBuckets")

    def test_access_denied_returns_error_not_simulated(self, monkeypatch):
        """An AccessDenied error must return status=ERROR — never fall back to simulated data."""
        self._patch_env(monkeypatch)
        db = _make_db()
        exc = self._make_client_error("AccessDenied")

        with patch.object(svc, "_make_s3_client", side_effect=exc):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.status == "ERROR"
        assert result.files_found == 0
        assert result.items == []

    def test_access_denied_message_is_helpful(self, monkeypatch):
        self._patch_env(monkeypatch)
        db = _make_db()
        exc = self._make_client_error("AccessDenied")

        with patch.object(svc, "_make_s3_client", side_effect=exc):
            result = svc.scan_storage_connection(db, "STR-01")

        assert "access" in result.status_detail.lower() or "permission" in result.status_detail.lower()

    def test_http_403_returns_error(self, monkeypatch):
        """HTTP 403 (mapped to AccessDenied) must produce status=ERROR."""
        self._patch_env(monkeypatch)
        db = _make_db()
        exc = self._make_client_error("403")

        with patch.object(svc, "_make_s3_client", side_effect=exc):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.status == "ERROR"

    def test_network_error_returns_error(self, monkeypatch):
        """A network/connection error must return status=ERROR."""
        self._patch_env(monkeypatch)
        db = _make_db()

        with patch.object(svc, "_make_s3_client", side_effect=ConnectionError("Failed to establish connection")):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.status == "ERROR"
        assert "endpoint" in result.status_detail.lower() or "reach" in result.status_detail.lower()

    def test_error_status_detail_never_contains_credentials(self, monkeypatch):
        """Error messages must never include any credential value."""
        monkeypatch.setenv("MINIO_ACCESS_KEY", "very-secret-key-xyz")
        monkeypatch.setenv("MINIO_SECRET_KEY", "another-secret-abc")
        monkeypatch.setenv("MINIO_BUCKET", "test-bucket")
        db = _make_db()
        exc = self._make_client_error("AccessDenied")

        with patch.object(svc, "_make_s3_client", side_effect=exc):
            result = svc.scan_storage_connection(db, "STR-01")

        assert "very-secret-key-xyz" not in result.status_detail
        assert "another-secret-abc" not in result.status_detail

    def test_invalid_key_returns_error(self, monkeypatch):
        self._patch_env(monkeypatch)
        db = _make_db()
        exc = self._make_client_error("InvalidAccessKeyId")

        with patch.object(svc, "_make_s3_client", side_effect=exc):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.status == "ERROR"

    def test_no_such_bucket_returns_error(self, monkeypatch):
        self._patch_env(monkeypatch)
        db = _make_db()
        exc = self._make_client_error("NoSuchBucket")

        with patch.object(svc, "_make_s3_client", side_effect=exc):
            result = svc.scan_storage_connection(db, "STR-01")

        assert result.status == "ERROR"
        assert "bucket" in result.status_detail.lower()


# ── Test: _classify_s3_error — message safety ─────────────────────────────────

class TestClassifyS3Error:

    def test_access_denied_message(self):
        import botocore.exceptions
        error_response = {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}}
        exc = botocore.exceptions.ClientError(error_response, "ListBuckets")
        msg = svc._classify_s3_error(exc)
        assert "access" in msg.lower() or "permission" in msg.lower()

    def test_no_credentials_error_message(self):
        """NoCredentialsError-style exception is handled without crashing."""
        class NoCredentialsError(Exception):
            pass
        exc = NoCredentialsError("No credentials found")
        msg = svc._classify_s3_error(exc)
        # Should not be the generic fallback
        assert msg  # any non-empty message is acceptable

    def test_generic_error_has_no_secrets(self):
        exc = ValueError("boom with key=SUPERSECRET123")
        msg = svc._classify_s3_error(exc)
        assert "SUPERSECRET123" not in msg


# ── Test: format inference ────────────────────────────────────────────────────

class TestInferFormat:
    def test_csv(self):      assert svc._infer_format("data/records.csv") == "CSV"
    def test_parquet(self):  assert svc._infer_format("data/records.parquet") == "PARQUET"
    def test_json(self):     assert svc._infer_format("data/records.json") == "JSON"
    def test_jsonl(self):    assert svc._infer_format("data/records.jsonl") == "JSON"
    def test_avro(self):     assert svc._infer_format("data/records.avro") == "AVRO"
    def test_orc(self):      assert svc._infer_format("data/records.orc") == "ORC"
    def test_tsv(self):      assert svc._infer_format("data/records.tsv") == "TSV"
    def test_unknown(self):  assert svc._infer_format("data/records.bin") == "UNKNOWN"
    def test_case_insensitive(self): assert svc._infer_format("DATA/RECORDS.CSV") == "CSV"


# ── Test: classification heuristic ────────────────────────────────────────────

class TestClassifyObject:
    def test_employee_is_restricted(self):
        assert svc._classify_object("hr/employee_records.csv", 1000) == "RESTRICTED"
    def test_patient_is_restricted(self):
        assert svc._classify_object("clinical/patient_data.csv", 1000) == "RESTRICTED"
    def test_customer_is_confidential(self):
        assert svc._classify_object("crm/customer_profiles.csv", 1000) == "CONFIDENTIAL"
    def test_email_is_confidential(self):
        assert svc._classify_object("marketing/email_list.csv", 1000) == "CONFIDENTIAL"
    def test_generic_is_internal(self):
        assert svc._classify_object("reports/quarterly_summary.csv", 1000) == "INTERNAL"
