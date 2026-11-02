from sqlalchemy import Column, String, DateTime, Boolean, Integer, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    # Dataset identity
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    source = Column(String, nullable=False)
    classification = Column(String, nullable=False)
    owner = Column(String, nullable=True)

    # Governance information
    allowed_purposes = Column(JSON, default=list)
    restricted_purposes = Column(JSON, default=list)
    region = Column(String, nullable=True)
    encrypted = Column(Boolean, default=False)
    retention_days = Column(Integer, nullable=True)
    sharing_allowed = Column(Boolean, default=False)

    # Privacy metadata
    columns = Column(JSON, default=list)
    sensitive_attributes = Column(JSON, default=list)
    data_description = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class LineageRelationship(Base):
    __tablename__ = "lineage_relationships"

    id = Column(String, primary_key=True, index=True)
    source_dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False, index=True)
    target_dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False, index=True)
    transformation_type = Column(String, nullable=False, default="DERIVATION")
    description = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )