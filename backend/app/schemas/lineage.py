from datetime import datetime
from pydantic import BaseModel, field_validator


class LineageCreate(BaseModel):
    """
    Request body for creating a lineage relationship between two datasets.

    source_dataset_id: Upstream / parent dataset.
    target_dataset_id: Downstream / derived child dataset.
    transformation_type: How the data was derived
                         (e.g., COMBINATION, DERIVATION, ETL_CLEANSE,
                          IDENTITY_JOIN, FEATURE_ENGINEERING).
    description: Optional explanation of the transformation or query.
    """
    source_dataset_id: str
    target_dataset_id: str
    transformation_type: str = "DERIVATION"
    description: str | None = None

    @field_validator("target_dataset_id")
    @classmethod
    def prevent_self_reference(cls, v, info):
        source = info.data.get("source_dataset_id")
        if source and v == source:
            raise ValueError("A dataset cannot have a lineage relationship with itself.")
        return v


class LineageRelationshipResponse(BaseModel):
    """
    Represents a single directed relationship edge in the lineage graph.
    """
    id: str
    source_dataset_id: str
    target_dataset_id: str
    transformation_type: str
    description: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class LineageNodeInfo(BaseModel):
    """
    Represents a dataset node in the lineage topology graph.
    """
    id: str
    name: str
    classification: str
    source: str
    owner: str | None = None

    class Config:
        from_attributes = True


class LineageGraphResponse(BaseModel):
    """
    Full graph response when inspecting the lineage of a dataset.

    root_dataset_id: The ID of the dataset that was inspected.
    direction: Direction of graph exploration ('upstream', 'downstream', 'both').
    nodes: All datasets involved in the explored graph.
    edges: Directed lineage edges connecting the datasets.
    upstream_count: Total direct and transitive parent datasets.
    downstream_count: Total direct and transitive derived datasets.
    """
    root_dataset_id: str
    direction: str
    nodes: list[LineageNodeInfo]
    edges: list[LineageRelationshipResponse]
    upstream_count: int
    downstream_count: int
