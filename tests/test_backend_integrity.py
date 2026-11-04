"""
test_backend_integrity.py

Focused tests for Step 8 backend integrity corrections:
1. SQLite PRAGMA foreign_keys=ON enforcement (D1)
2. Dataset duplicate name and source prevention in POST /api/datasets/ (D2)
3. Explicit database rollback on commit/write failures (D3)

Uses isolated in-memory/temporary SQLite databases and mocked sessions so the real database is NEVER modified.
"""

import os
import sys
import uuid
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

TESTS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db.database import Base
from app.db.models import Dataset, LineageRelationship
from app.schemas.dataset import DatasetCreate, DatasetUpdate
from app.schemas.lineage import LineageCreate
from app.api.datasets import create_dataset, update_dataset
from app.api.lineage import create_lineage_relationship
from app.api.storage import register_discovered_dataset
from app.schemas.storage import RegisterDiscoveredRequest


@pytest.fixture
def isolated_db_engine():
    """Create an isolated SQLite database with Base schema and foreign keys enabled."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    # The event listener in app.db.database targets Engine class, so it applies here too
    Base.metadata.create_all(bind=test_engine)
    return test_engine


@pytest.fixture
def isolated_db_session(isolated_db_engine):
    """Yield an isolated session bound to the in-memory database."""
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=isolated_db_engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


class TestSQLiteForeignKeyEnforcement:
    """Tests for D1: foreign-key enforcement in SQLite."""

    def test_pragma_foreign_keys_is_enabled(self, isolated_db_session):
        """Verifies PRAGMA foreign_keys returns 1."""
        result = isolated_db_session.execute(text("PRAGMA foreign_keys;")).scalar()
        assert result == 1, f"Expected PRAGMA foreign_keys to be 1, got {result}"

    def test_fk_violation_raises_integrity_error(self, isolated_db_session):
        """Attempting to insert a LineageRelationship with non-existent dataset IDs must fail with IntegrityError."""
        bad_rel = LineageRelationship(
            id=str(uuid.uuid4()),
            source_dataset_id="non-existent-source-id",
            target_dataset_id="non-existent-target-id",
            transformation_type="DERIVATION",
            description="Should fail FK check"
        )
        isolated_db_session.add(bad_rel)
        with pytest.raises(IntegrityError):
            isolated_db_session.commit()
        isolated_db_session.rollback()


class TestDatasetDuplicateProtection:
    """Tests for D2: duplicate detection in POST /api/datasets/."""

    def test_create_dataset_success(self, isolated_db_session):
        """A new unique dataset can be created successfully."""
        payload = DatasetCreate(
            name="Unique Customer Analytics",
            source="s3://lake/unique_customers.csv",
            classification="INTERNAL"
        )
        created = create_dataset(payload, db=isolated_db_session)
        assert created.name == "Unique Customer Analytics"
        assert created.id is not None

    def test_create_dataset_rejects_duplicate_name(self, isolated_db_session):
        """Creating a dataset with an existing name must return HTTP 409."""
        payload1 = DatasetCreate(
            name="Identical Dataset Name",
            source="s3://lake/source_alpha.csv",
            classification="INTERNAL"
        )
        create_dataset(payload1, db=isolated_db_session)

        payload2 = DatasetCreate(
            name="Identical Dataset Name",
            source="s3://lake/source_beta.csv",
            classification="CONFIDENTIAL"
        )
        with pytest.raises(HTTPException) as excinfo:
            create_dataset(payload2, db=isolated_db_session)
        assert excinfo.value.status_code == 409
        assert "already exists" in excinfo.value.detail

    def test_create_dataset_rejects_duplicate_source(self, isolated_db_session):
        """Creating a dataset with an existing source must return HTTP 409."""
        payload1 = DatasetCreate(
            name="Dataset Alpha",
            source="s3://lake/shared_path.csv",
            classification="INTERNAL"
        )
        create_dataset(payload1, db=isolated_db_session)

        payload2 = DatasetCreate(
            name="Dataset Beta",
            source="s3://lake/shared_path.csv",
            classification="CONFIDENTIAL"
        )
        with pytest.raises(HTTPException) as excinfo:
            create_dataset(payload2, db=isolated_db_session)
        assert excinfo.value.status_code == 409
        assert "already exists" in excinfo.value.detail


class TestExplicitRollbackHandling:
    """Tests for D3: safe rollback handling on failed database commits."""

    def test_create_dataset_rollback_on_commit_failure(self):
        """Verifies db.rollback() is invoked if commit fails in create_dataset."""
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.commit.side_effect = RuntimeError("Simulated DB connection drop")

        payload = DatasetCreate(
            name="Test Rollback Dataset",
            source="s3://lake/test_rollback.csv",
            classification="INTERNAL"
        )
        with pytest.raises(RuntimeError, match="Simulated DB connection drop"):
            create_dataset(payload, db=mock_db)

        mock_db.rollback.assert_called_once()

    def test_update_dataset_rollback_on_commit_failure(self):
        """Verifies db.rollback() is invoked if commit fails in update_dataset."""
        mock_db = MagicMock()
        mock_dataset = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
        mock_db.commit.side_effect = RuntimeError("Simulated disk full")

        updates = DatasetUpdate(classification="RESTRICTED")
        with pytest.raises(RuntimeError, match="Simulated disk full"):
            update_dataset("some-id", updates, db=mock_db)

        mock_db.rollback.assert_called_once()

    def test_create_lineage_rollback_on_commit_failure(self):
        """Verifies db.rollback() is invoked if commit fails in create_lineage_relationship."""
        mock_db = MagicMock()
        # Mock finding source and target datasets
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            MagicMock(name="ds1"),  # source_ds
            MagicMock(name="ds2"),  # target_ds
            None                     # existing relationship
        ]
        mock_db.commit.side_effect = RuntimeError("Simulated DB failure")

        req = LineageCreate(
            source_dataset_id="source-123",
            target_dataset_id="target-456",
            transformation_type="DERIVATION"
        )
        with pytest.raises(RuntimeError, match="Simulated DB failure"):
            create_lineage_relationship(req, db=mock_db)

        mock_db.rollback.assert_called_once()

    def test_register_discovered_rollback_on_commit_failure(self):
        """Verifies db.rollback() is invoked if commit fails in register_discovered_dataset."""
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.commit.side_effect = RuntimeError("Simulated DB write lock")

        req = RegisterDiscoveredRequest(
            name="Discovered Dataset",
            source="minio/bucket/file.csv",
            classification="INTERNAL"
        )
        with pytest.raises(RuntimeError, match="Simulated DB write lock"):
            register_discovered_dataset(req, db=mock_db)

        mock_db.rollback.assert_called_once()
