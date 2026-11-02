"""
lineage_service.py

Lineage graph traversal and derivation management service.
Handles directed acyclic graph (DAG) queries for upstream (provenance)
and downstream (impact) relationships.
"""

from collections import deque
from sqlalchemy.orm import Session

from app.db.models import Dataset, LineageRelationship
from app.schemas.lineage import (
    LineageGraphResponse,
    LineageNodeInfo,
    LineageRelationshipResponse,
)


def would_create_cycle(db: Session, source_id: str, target_id: str) -> bool:
    """
    Check if adding an edge source_id -> target_id would form a cycle.
    This happens if source_id is already reachable downstream from target_id.
    """
    if source_id == target_id:
        return True

    visited = set()
    queue = deque([target_id])

    while queue:
        curr = queue.popleft()
        if curr == source_id:
            return True
        if curr in visited:
            continue
        visited.add(curr)

        # Find downstream edges where curr is the source
        downstream = (
            db.query(LineageRelationship.target_dataset_id)
            .filter(LineageRelationship.source_dataset_id == curr)
            .all()
        )
        for (next_target,) in downstream:
            if next_target not in visited:
                queue.append(next_target)

    return False


def get_dataset_lineage(
    db: Session,
    dataset_id: str,
    direction: str = "both"
) -> LineageGraphResponse:
    """
    Traverse the lineage graph starting from dataset_id.

    direction options:
      - 'upstream': Find all datasets that contributed to this dataset (ancestors/parents).
      - 'downstream': Find all datasets derived from this dataset (descendants/children).
      - 'both': Traverse both upstream and downstream branches.
    """
    valid_directions = {"upstream", "downstream", "both"}
    if direction not in valid_directions:
        direction = "both"

    node_ids: set[str] = {dataset_id}
    all_edges: dict[str, LineageRelationship] = {}

    upstream_dataset_ids: set[str] = set()
    downstream_dataset_ids: set[str] = set()

    # 1. Upstream traversal (follow incoming edges: target == current)
    if direction in ("upstream", "both"):
        visited = set()
        queue = deque([dataset_id])

        while queue:
            curr = queue.popleft()
            if curr in visited:
                continue
            visited.add(curr)

            incoming = (
                db.query(LineageRelationship)
                .filter(LineageRelationship.target_dataset_id == curr)
                .all()
            )
            for rel in incoming:
                all_edges[rel.id] = rel
                node_ids.add(rel.source_dataset_id)
                if rel.source_dataset_id != dataset_id:
                    upstream_dataset_ids.add(rel.source_dataset_id)
                if rel.source_dataset_id not in visited:
                    queue.append(rel.source_dataset_id)

    # 2. Downstream traversal (follow outgoing edges: source == current)
    if direction in ("downstream", "both"):
        visited = set()
        queue = deque([dataset_id])

        while queue:
            curr = queue.popleft()
            if curr in visited:
                continue
            visited.add(curr)

            outgoing = (
                db.query(LineageRelationship)
                .filter(LineageRelationship.source_dataset_id == curr)
                .all()
            )
            for rel in outgoing:
                all_edges[rel.id] = rel
                node_ids.add(rel.target_dataset_id)
                if rel.target_dataset_id != dataset_id:
                    downstream_dataset_ids.add(rel.target_dataset_id)
                if rel.target_dataset_id not in visited:
                    queue.append(rel.target_dataset_id)

    # 3. Retrieve dataset metadata for all involved nodes
    datasets = (
        db.query(Dataset)
        .filter(Dataset.id.in_(node_ids))
        .all()
    )

    node_map = {ds.id: ds for ds in datasets}
    nodes = [
        LineageNodeInfo(
            id=node_id,
            name=node_map[node_id].name if node_id in node_map else "Unknown Dataset",
            classification=node_map[node_id].classification if node_id in node_map else "Unknown",
            source=node_map[node_id].source if node_id in node_map else "Unknown",
            owner=node_map[node_id].owner if node_id in node_map else None,
        )
        for node_id in node_ids
    ]

    edges = [
        LineageRelationshipResponse(
            id=rel.id,
            source_dataset_id=rel.source_dataset_id,
            target_dataset_id=rel.target_dataset_id,
            transformation_type=rel.transformation_type,
            description=rel.description,
            created_at=rel.created_at,
        )
        for rel in all_edges.values()
    ]

    return LineageGraphResponse(
        root_dataset_id=dataset_id,
        direction=direction,
        nodes=nodes,
        edges=edges,
        upstream_count=len(upstream_dataset_ids),
        downstream_count=len(downstream_dataset_ids),
    )
