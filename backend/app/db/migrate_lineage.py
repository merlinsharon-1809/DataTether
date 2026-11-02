"""
migrate_lineage.py

Non-destructive database migration to create the lineage_relationships table
in SQLite if it does not already exist. Existing datasets are preserved completely.
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    print("Running migration: creating 'lineage_relationships' table...")
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lineage_relationships (
                id VARCHAR PRIMARY KEY,
                source_dataset_id VARCHAR NOT NULL REFERENCES datasets(id),
                target_dataset_id VARCHAR NOT NULL REFERENCES datasets(id),
                transformation_type VARCHAR NOT NULL DEFAULT 'DERIVATION',
                description VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_lineage_relationships_id ON lineage_relationships (id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_lineage_source ON lineage_relationships (source_dataset_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_lineage_target ON lineage_relationships (target_dataset_id)
        """))
        conn.commit()
    print("Migration complete: 'lineage_relationships' table is ready.")

if __name__ == "__main__":
    migrate()
