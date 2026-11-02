from datetime import datetime
from pydantic import BaseModel, field_validator


class StorageConnectionResponse(BaseModel):
    """
    Metadata about a registered storage system or data lake connection.
    """
    id: str
    name: str
    provider: str  # 'MinIO', 'AWS S3', 'Google Cloud Storage', 'Azure Blob', 'LocalFS'
    endpoint: str
    bucket_count: int
    status: str    # 'CONNECTED', 'DISCONNECTED', 'DEGRADED'
    is_local: bool
    notes: str


class DiscoveredDataset(BaseModel):
    """
    A data file identified in an object storage bucket or cluster.
    """
    file_path: str
    bucket: str
    file_name: str
    file_format: str
    size_bytes: int
    record_count: int
    suggested_columns: list[str] = []
    suggested_classification: str = "INTERNAL"
    is_already_registered: bool = False
    registered_dataset_id: str | None = None


class StorageScanResponse(BaseModel):
    """
    Result of scanning a storage cluster for unmanaged or updated datasets.
    """
    connection_id: str
    scanned_at: str
    files_found: int
    new_unregistered_count: int
    items: list[DiscoveredDataset]


class RegisterDiscoveredRequest(BaseModel):
    """
    Request to register a discovered storage file as an official DataTether dataset.
    """
    name: str
    source: str
    classification: str
    owner: str | None = None
    allowed_purposes: list[str] = []
    restricted_purposes: list[str] = []
    region: str | None = "eu-central-1"
    encrypted: bool = True
    retention_days: int | None = 365
    sharing_allowed: bool = False
    columns: list[str] = []
    sensitive_attributes: list[str] = []
    data_description: str | None = None

    @field_validator("name")
    @classmethod
    def require_name(cls, v):
        if not v.strip():
            raise ValueError("Dataset name must not be blank.")
        return v.strip()
