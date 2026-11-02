from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class DatasetCreate(BaseModel):
    name: str
    source: str
    classification: str
    owner: str | None = None

    allowed_purposes: list[str] = []
    restricted_purposes: list[str] = []
    region: str | None = None
    encrypted: bool = False
    retention_days: int | None = None
    sharing_allowed: bool = False

    # Privacy metadata
    columns: list[str] = []
    sensitive_attributes: list[str] = []
    data_description: str | None = None


class DatasetUpdate(BaseModel):
    name: str | None = None
    source: str | None = None
    classification: str | None = None
    owner: str | None = None

    allowed_purposes: list[str] | None = None
    restricted_purposes: list[str] | None = None
    region: str | None = None
    encrypted: bool | None = None
    retention_days: int | None = None
    sharing_allowed: bool | None = None

    # Privacy metadata — None means "not provided", leave existing value unchanged
    columns: list[str] | None = None
    sensitive_attributes: list[str] | None = None
    data_description: str | None = None


class DatasetResponse(BaseModel):
    id: str
    name: str
    source: str
    classification: str
    owner: str | None = None

    allowed_purposes: list[str] = []
    restricted_purposes: list[str] = []
    region: str | None = None
    encrypted: bool = False
    retention_days: int | None = None
    sharing_allowed: bool = False

    # Privacy metadata
    columns: list[str] = []
    sensitive_attributes: list[str] = []
    data_description: str | None = None

    created_at: datetime | None = None

    @field_validator("allowed_purposes", "restricted_purposes", "columns", "sensitive_attributes", mode="before")
    @classmethod
    def convert_none_to_list(cls, v):
        """
        Columns added by migration start as NULL in the database.
        This converts NULL to an empty list so the response never fails
        validation for existing records that predate these fields.
        """
        return v if v is not None else []

    @field_validator("encrypted", "sharing_allowed", mode="before")
    @classmethod
    def convert_none_to_bool(cls, v):
        return bool(v) if v is not None else False

    model_config = ConfigDict(from_attributes=True)
