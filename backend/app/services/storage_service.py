"""
storage_service.py

Service for managing S3-compatible storage connections (local MinIO or AWS S3),
scanning buckets for file metadata, and discovering unmanaged datasets for
Data Passport generation.

Design principles:
  - Uses boto3 for all S3-compatible operations (MinIO + AWS S3 share the same API).
  - Credentials are read exclusively from environment variables — never hardcoded.
  - Connection status is determined by attempting a real API call; no silent fallback.
  - Object metadata only is retrieved; file contents are never downloaded.
  - Simulated demo objects are returned ONLY for the demo MinIO connection when
    boto3 cannot reach the endpoint (i.e. local MinIO is not running), and the
    response is clearly labelled as simulated so the UI never misrepresents state.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Dataset
from app.schemas.storage import (
    DiscoveredDataset,
    StorageConnectionResponse,
    StorageScanResponse,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection registry
# ---------------------------------------------------------------------------
# Each entry describes one storage system.  Credentials and endpoint details
# are read from environment variables at runtime — nothing is stored here.

CONNECTION_REGISTRY: list[dict] = [
    {
        "id": "STR-01",
        "name": "Local MinIO Storage",
        "provider": "MinIO",
        # Where to connect: read from env, default to standard local MinIO port
        "endpoint_env": "MINIO_ENDPOINT",
        "endpoint_default": "http://localhost:9000",
        "region_env": "MINIO_REGION",
        "region_default": "us-east-1",
        "access_key_env": "MINIO_ACCESS_KEY",
        "secret_key_env": "MINIO_SECRET_KEY",
        "bucket_env": "MINIO_BUCKET",
        "bucket_default": "datatether-local-lake",
        "is_local": True,
        "notes": (
            "Primary local object storage cluster. "
            "Set MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY to enable "
            "live scanning. Simulated data is returned when MinIO is not reachable."
        ),
    },
    {
        "id": "STR-02",
        "name": "AWS S3 Enterprise Lake",
        "provider": "AWS S3",
        # Standard AWS env vars — boto3 picks these up automatically when set
        "endpoint_env": None,           # None → boto3 uses the standard AWS endpoint
        "endpoint_default": None,
        "region_env": "AWS_REGION",
        "region_default": "us-east-1",
        "access_key_env": "AWS_ACCESS_KEY_ID",
        "secret_key_env": "AWS_SECRET_ACCESS_KEY",
        "bucket_env": "AWS_S3_BUCKET",
        "bucket_default": None,
        "is_local": False,
        "notes": (
            "Production cloud connection. "
            "Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION / AWS_S3_BUCKET "
            "to enable live scanning. Currently disabled until credentials are provided."
        ),
    },
]


# ---------------------------------------------------------------------------
# Simulated demo objects (used ONLY when MinIO is unreachable, clearly labelled)
# ---------------------------------------------------------------------------
_DEMO_OBJECTS = [
    {
        "file_path": "minio-local/data-raw/crm/customer_profiles.csv",
        "bucket": "data-raw",
        "file_name": "customer_profiles.csv",
        "file_format": "CSV",
        "size_bytes": 44_236_800,
        "record_count": 125_000,
        "suggested_columns": ["customer_id", "name", "email", "location", "signup_timestamp"],
        "suggested_classification": "CONFIDENTIAL",
    },
    {
        "file_path": "minio-local/data-raw/ecom/purchase_history.csv",
        "bucket": "data-raw",
        "file_name": "purchase_history.csv",
        "file_format": "CSV",
        "size_bytes": 154_618_880,
        "record_count": 1_480_000,
        "suggested_columns": ["transaction_id", "customer_id", "product", "purchase_date", "amount"],
        "suggested_classification": "INTERNAL",
    },
    {
        "file_path": "minio-local/hr-secure/vault/employee_records.csv",
        "bucket": "hr-secure",
        "file_name": "employee_records.csv",
        "file_format": "CSV",
        "size_bytes": 6_291_456,
        "record_count": 4_200,
        "suggested_columns": ["employee_id", "full_name", "department", "salary", "ssn", "performance_rating"],
        "suggested_classification": "RESTRICTED",
    },
    {
        "file_path": "minio-local/clinical/trial_telemetry_q3.parquet",
        "bucket": "clinical",
        "file_name": "trial_telemetry_q3.parquet",
        "file_format": "PARQUET",
        "size_bytes": 28_400_000,
        "record_count": 92_000,
        "suggested_columns": ["patient_id", "trial_cohort", "dosage_mg", "blood_pressure", "adverse_reaction"],
        "suggested_classification": "RESTRICTED",
    },
]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_env(key: Optional[str], default: Optional[str] = None) -> Optional[str]:
    """Read an environment variable, returning default if absent or empty."""
    if key is None:
        return default
    return os.environ.get(key) or default


def _credentials_present(conn_def: dict) -> bool:
    """Return True only when both an access key and secret key are set."""
    access = _get_env(conn_def.get("access_key_env"))
    secret = _get_env(conn_def.get("secret_key_env"))
    return bool(access and secret)


def _make_s3_client(conn_def: dict):
    """
    Build a boto3 S3 client for the given connection definition.

    For MinIO: uses a custom endpoint_url so boto3 talks to localhost instead
    of AWS.  For AWS S3: endpoint_url is None and boto3 resolves the standard
    regional endpoint automatically.

    The client is created without any session-level credential caching so each
    call picks up the current environment variables.
    """
    import boto3  # imported here so the module loads even without boto3 installed

    endpoint_url = _get_env(conn_def.get("endpoint_env"), conn_def.get("endpoint_default"))
    region = _get_env(conn_def.get("region_env"), conn_def.get("region_default"))
    access_key = _get_env(conn_def.get("access_key_env"))
    secret_key = _get_env(conn_def.get("secret_key_env"))

    kwargs: dict = {
        "region_name": region,
    }
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key

    return boto3.client("s3", **kwargs)


def _infer_format(key: str) -> str:
    """Guess file format from the S3 object key extension."""
    key_lower = key.lower()
    if key_lower.endswith(".parquet"):
        return "PARQUET"
    if key_lower.endswith(".csv"):
        return "CSV"
    if key_lower.endswith(".json") or key_lower.endswith(".jsonl"):
        return "JSON"
    if key_lower.endswith(".avro"):
        return "AVRO"
    if key_lower.endswith(".orc"):
        return "ORC"
    if key_lower.endswith(".tsv"):
        return "TSV"
    return "UNKNOWN"


def _classify_object(key: str, size_bytes: int) -> str:
    """
    Suggest a data classification based on path keywords and size.
    This is a heuristic only — the user always confirms before registering.
    """
    key_lower = key.lower()
    if any(kw in key_lower for kw in ["ssn", "salary", "employee", "hr", "patient", "clinical", "medical"]):
        return "RESTRICTED"
    if any(kw in key_lower for kw in ["customer", "email", "personal", "pii", "crm", "contact"]):
        return "CONFIDENTIAL"
    return "INTERNAL"


def _scan_bucket_real(client, bucket: str, conn_def: dict) -> list[DiscoveredDataset]:
    """
    List all objects in *bucket* using the S3 ListObjectsV2 API, which returns
    only metadata (key name, size, last-modified, ETag).  No object data is
    ever downloaded.

    Pagination is handled automatically so large buckets are fully covered.
    Returns a list of DiscoveredDataset items.
    """
    items: list[DiscoveredDataset] = []
    paginator = client.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            key: str = obj["Key"]
            size: int = obj.get("Size", 0)
            file_name = key.split("/")[-1]
            file_format = _infer_format(key)
            suggested_class = _classify_object(key, size)
            file_path = f"{bucket}/{key}"

            items.append(DiscoveredDataset(
                file_path=file_path,
                bucket=bucket,
                file_name=file_name,
                file_format=file_format,
                size_bytes=size,
                record_count=0,          # Record count requires reading the file — we never do that
                suggested_columns=[],     # Column inference requires reading the file — we never do that
                suggested_classification=suggested_class,
                is_already_registered=False,
                registered_dataset_id=None,
                is_simulated=False,
            ))

    return items


def _list_all_buckets(client) -> list[str]:
    """Return bucket names accessible to the configured credentials."""
    response = client.list_buckets()
    return [b["Name"] for b in response.get("Buckets", [])]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_storage_connections() -> list[StorageConnectionResponse]:
    """
    Return all known storage cluster connections with live-evaluated status.

    Status is determined by whether credentials are present in the environment,
    NOT by attempting a network call (that happens only when the user requests a scan).
    """
    results: list[StorageConnectionResponse] = []
    for conn_def in CONNECTION_REGISTRY:
        has_creds = _credentials_present(conn_def)
        endpoint_val = _get_env(conn_def.get("endpoint_env"), conn_def.get("endpoint_default")) or "N/A"

        if has_creds:
            status = "CONFIGURED"   # Credentials present; scan required to confirm reachability
        elif conn_def["is_local"]:
            status = "SIMULATED"    # Local demo mode — no credentials, simulated data available
        else:
            status = "DISCONNECTED" # Cloud provider, no credentials configured

        results.append(StorageConnectionResponse(
            id=conn_def["id"],
            name=conn_def["name"],
            provider=conn_def["provider"],
            endpoint=endpoint_val,
            bucket_count=0,         # Known only after a successful scan
            status=status,
            is_local=conn_def["is_local"],
            notes=conn_def["notes"],
        ))

    return results


def scan_storage_connection(db: Session, connection_id: str) -> StorageScanResponse:
    """
    Scan the specified storage connection.

    Behaviour by connection state:
      CONFIGURED (credentials present):
        → Attempts real S3 ListBuckets + ListObjectsV2 via boto3.
        → Returns actual metadata; never downloads file contents.
        → On any error (auth failure, network error, etc.) returns status ERROR
          with an explanation. Never falls back to simulated data.

      SIMULATED (MinIO, no credentials):
        → Returns the curated demo dataset list, clearly labelled is_simulated=True.
        → Preserves demo functionality when MinIO Docker is not running.

      DISCONNECTED (cloud, no credentials):
        → Returns an empty scan immediately with an explanation.
    """
    conn_def = next((c for c in CONNECTION_REGISTRY if c["id"] == connection_id), None)
    if conn_def is None:
        raise ValueError(f"Storage connection '{connection_id}' not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    has_creds = _credentials_present(conn_def)

    # ── DISCONNECTED path (cloud, no credentials) ──────────────────────────
    if not has_creds and not conn_def["is_local"]:
        return StorageScanResponse(
            connection_id=connection_id,
            scanned_at=now_iso,
            status="DISCONNECTED",
            status_detail=(
                f"No credentials configured for {conn_def['provider']}. "
                f"Set {conn_def['access_key_env']} and {conn_def['secret_key_env']} "
                "in your .env file to enable live scanning."
            ),
            files_found=0,
            new_unregistered_count=0,
            items=[],
        )

    # ── CONFIGURED path (real boto3 call) ─────────────────────────────────
    if has_creds:
        try:
            client = _make_s3_client(conn_def)

            # Determine which bucket(s) to scan
            target_bucket = _get_env(conn_def.get("bucket_env"), conn_def.get("bucket_default"))
            if target_bucket:
                buckets = [target_bucket]
            else:
                buckets = _list_all_buckets(client)

            all_items: list[DiscoveredDataset] = []
            for bucket in buckets:
                all_items.extend(_scan_bucket_real(client, bucket, conn_def))

            # Cross-reference against registered datasets
            all_items = _mark_registered(db, all_items)
            new_count = sum(1 for it in all_items if not it.is_already_registered)

            return StorageScanResponse(
                connection_id=connection_id,
                scanned_at=now_iso,
                status="CONNECTED",
                status_detail=f"Live scan completed. {len(buckets)} bucket(s) scanned.",
                files_found=len(all_items),
                new_unregistered_count=new_count,
                items=all_items,
            )

        except Exception as exc:  # noqa: BLE001
            # Classify the error type for a useful frontend message
            error_msg = _classify_s3_error(exc)
            logger.warning("Storage scan failed for %s: %s", connection_id, error_msg)
            return StorageScanResponse(
                connection_id=connection_id,
                scanned_at=now_iso,
                status="ERROR",
                status_detail=error_msg,
                files_found=0,
                new_unregistered_count=0,
                items=[],
            )

    # ── SIMULATED path (local MinIO, no credentials) ──────────────────────
    demo_items = _build_demo_items()
    demo_items = _mark_registered(db, demo_items)
    new_count = sum(1 for it in demo_items if not it.is_already_registered)

    return StorageScanResponse(
        connection_id=connection_id,
        scanned_at=now_iso,
        status="SIMULATED",
        status_detail=(
            "MinIO credentials not configured. "
            "Showing curated demo dataset index. "
            "Set MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY for live scanning."
        ),
        files_found=len(demo_items),
        new_unregistered_count=new_count,
        items=demo_items,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _build_demo_items() -> list[DiscoveredDataset]:
    """Convert the static demo object list to DiscoveredDataset objects, labelled as simulated."""
    return [
        DiscoveredDataset(
            file_path=obj["file_path"],
            bucket=obj["bucket"],
            file_name=obj["file_name"],
            file_format=obj["file_format"],
            size_bytes=obj["size_bytes"],
            record_count=obj["record_count"],
            suggested_columns=obj["suggested_columns"],
            suggested_classification=obj["suggested_classification"],
            is_already_registered=False,
            registered_dataset_id=None,
            is_simulated=True,
        )
        for obj in _DEMO_OBJECTS
    ]


# ---------------------------------------------------------------------------
# Explicit alias map for verified demo S3 objects
# Case-sensitive exact full path mapping to existing demo dataset UUIDs.
# ---------------------------------------------------------------------------
_VERIFIED_DEMO_STORAGE_MAP: dict[str, str] = {
    "datatether-demo-merlin-01/demo/customer_records.csv": "05c565c9-c866-46e5-8b3d-a0549f8508d6",
    "datatether-demo-merlin-01/demo/purchase_history.csv": "fa2285d0-2917-4930-bf1d-5699fbdde667",
}


def _mark_registered(db: Session, items: list[DiscoveredDataset]) -> list[DiscoveredDataset]:
    """
    Cross-reference discovered items against datasets already registered in SQLite.
    Sets is_already_registered and registered_dataset_id on each item.
    """
    existing_datasets = db.query(Dataset).all()
    existing_ids = {ds.id for ds in existing_datasets}
    source_map = {ds.source.strip().casefold(): ds.id for ds in existing_datasets if ds.source}
    name_map = {ds.name.strip().casefold(): ds.id for ds in existing_datasets if ds.name}

    for item in items:
        raw_path = item.file_path.strip()
        path_key = raw_path.casefold()
        name_key = item.file_name.strip().casefold()

        # Priority 1: Exact existing dataset source match
        if path_key in source_map:
            item.is_already_registered = True
            item.registered_dataset_id = source_map[path_key]
        # Priority 2: Existing dataset name match
        elif name_key in name_map:
            item.is_already_registered = True
            item.registered_dataset_id = name_map[name_key]
        # Priority 3: Exact verified demo S3 object mapping (case-sensitive, verified ID exists in DB)
        elif raw_path in _VERIFIED_DEMO_STORAGE_MAP:
            target_id = _VERIFIED_DEMO_STORAGE_MAP[raw_path]
            if target_id in existing_ids:
                item.is_already_registered = True
                item.registered_dataset_id = target_id

    return items


def _classify_s3_error(exc: Exception) -> str:
    """
    Translate a boto3 / botocore exception into a plain-English message suitable
    for display in the UI and logging (never includes credentials).
    """
    exc_str = str(exc)
    exc_type = type(exc).__name__

    # botocore ClientError contains an error code we can inspect
    if hasattr(exc, "response"):
        code = exc.response.get("Error", {}).get("Code", "")  # type: ignore[attr-defined]
        if code in ("AccessDenied", "403"):
            return "Access denied. Check that your credentials have the required S3 permissions (s3:ListBucket, s3:ListObjects)."
        if code in ("NoSuchBucket",):
            return "The configured bucket does not exist. Verify the bucket name in your .env file."
        if code in ("InvalidAccessKeyId", "SignatureDoesNotMatch"):
            return "Authentication failed. The access key or secret key is incorrect."
        if code in ("RequestTimeout", "ConnectTimeout"):
            return "Connection timed out. Check that the endpoint URL is correct and the service is reachable."
        if code:
            return f"S3 API error ({code}). Check your storage configuration."

    # Network / DNS errors
    if "EndpointResolutionError" in exc_type or "ConnectionError" in exc_str or "Failed to establish" in exc_str:
        return "Cannot reach the storage endpoint. Check that the service is running and the endpoint URL is correct."

    if "NoCredentialsError" in exc_type or "CredentialsError" in exc_type:
        return "No credentials could be found. Set the required environment variables in your .env file."

    # Generic fallback — no credential details
    return f"Scan failed ({exc_type}). Check logs for details."
