"""
storage_service.py

Service for managing storage cluster connections, scanning buckets for files,
and discovering unmanaged datasets for Data Passport generation.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.db.models import Dataset
from app.schemas.storage import (
    DiscoveredDataset,
    StorageConnectionResponse,
    StorageScanResponse,
)

# Standard registered storage endpoints
STORAGE_CONNECTIONS = [
    {
        "id": "STR-01",
        "name": "Local MinIO Storage",
        "provider": "MinIO",
        "endpoint": "http://localhost:9000 (Local S3 API)",
        "bucket_count": 4,
        "status": "CONNECTED",
        "is_local": True,
        "notes": "Primary local object storage cluster. Contains staging and raw ingestion buckets.",
    },
    {
        "id": "STR-02",
        "name": "AWS S3 Enterprise Lake",
        "provider": "AWS S3",
        "endpoint": "s3://datatether-corp-data-lake-prod",
        "bucket_count": 0,
        "status": "DISCONNECTED",
        "is_local": False,
        "notes": "Production cloud connection disabled in local development mode. Credentials not configured.",
    },
]

# Simulated storage objects found in MinIO cluster
KNOWN_STORAGE_OBJECTS = [
    {
        "file_path": "minio-local/data-raw/crm/customer_profiles.csv",
        "bucket": "data-raw",
        "file_name": "customer_profiles.csv",
        "file_format": "CSV",
        "size_bytes": 44236800,
        "record_count": 125000,
        "suggested_columns": ["customer_id", "name", "email", "location", "signup_timestamp"],
        "suggested_classification": "CONFIDENTIAL",
    },
    {
        "file_path": "minio-local/data-raw/ecom/purchase_history.csv",
        "bucket": "data-raw",
        "file_name": "purchase_history.csv",
        "file_format": "CSV",
        "size_bytes": 154618880,
        "record_count": 1480000,
        "suggested_columns": ["transaction_id", "customer_id", "product", "purchase_date", "amount"],
        "suggested_classification": "INTERNAL",
    },
    {
        "file_path": "minio-local/hr-secure/vault/employee_records.csv",
        "bucket": "hr-secure",
        "file_name": "employee_records.csv",
        "file_format": "CSV",
        "size_bytes": 6291456,
        "record_count": 4200,
        "suggested_columns": ["employee_id", "full_name", "department", "salary", "ssn", "performance_rating"],
        "suggested_classification": "RESTRICTED",
    },
    {
        "file_path": "minio-local/clinical/trial_telemetry_q3.parquet",
        "bucket": "clinical",
        "file_name": "trial_telemetry_q3.parquet",
        "file_format": "PARQUET",
        "size_bytes": 28400000,
        "record_count": 92000,
        "suggested_columns": ["patient_id", "trial_cohort", "dosage_mg", "blood_pressure", "adverse_reaction"],
        "suggested_classification": "RESTRICTED",
    },
]


def list_storage_connections() -> list[StorageConnectionResponse]:
    """Return all known storage cluster connections."""
    return [StorageConnectionResponse(**conn) for conn in STORAGE_CONNECTIONS]


def scan_storage_connection(db: Session, connection_id: str) -> StorageScanResponse:
    """
    Scan the specified storage connection for objects.
    Cross-references each file against datasets already registered in SQLite
    so the user sees which are newly discovered vs already governed.
    """
    conn = next((c for c in STORAGE_CONNECTIONS if c["id"] == connection_id), None)
    if not conn:
        raise ValueError(f"Storage connection '{connection_id}' not found.")

    # Retrieve all existing dataset sources to check for registration
    existing_datasets = db.query(Dataset).all()
    # Map by source and by name for fuzzy checking
    source_map = {ds.source.strip().casefold(): ds.id for ds in existing_datasets if ds.source}
    name_map = {ds.name.strip().casefold(): ds.id for ds in existing_datasets if ds.name}

    discovered_items: list[DiscoveredDataset] = []
    new_unregistered_count = 0

    if conn["status"] == "CONNECTED":
        for item in KNOWN_STORAGE_OBJECTS:
            path_key = item["file_path"].strip().casefold()
            name_key = item["file_name"].strip().casefold()

            already_registered = False
            reg_id = None

            if path_key in source_map:
                already_registered = True
                reg_id = source_map[path_key]
            elif name_key in name_map:
                already_registered = True
                reg_id = name_map[name_key]

            if not already_registered:
                new_unregistered_count += 1

            discovered_items.append(DiscoveredDataset(
                file_path=item["file_path"],
                bucket=item["bucket"],
                file_name=item["file_name"],
                file_format=item["file_format"],
                size_bytes=item["size_bytes"],
                record_count=item["record_count"],
                suggested_columns=item["suggested_columns"],
                suggested_classification=item["suggested_classification"],
                is_already_registered=already_registered,
                registered_dataset_id=reg_id,
            ))

    now_iso = datetime.now(timezone.utc).isoformat()
    return StorageScanResponse(
        connection_id=connection_id,
        scanned_at=now_iso,
        files_found=len(discovered_items),
        new_unregistered_count=new_unregistered_count,
        items=discovered_items,
    )
