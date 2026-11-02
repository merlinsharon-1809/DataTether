from sqlalchemy import inspect, text

from app.db.database import engine


def migrate_database():
    inspector = inspect(engine)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("datasets")
    }

    new_columns = {
        "allowed_purposes": "JSON",
        "restricted_purposes": "JSON",
        "region": "VARCHAR",
        "encrypted": "BOOLEAN DEFAULT 0",
        "retention_days": "INTEGER",
        "sharing_allowed": "BOOLEAN DEFAULT 0",
    }

    with engine.begin() as connection:
        for column_name, column_type in new_columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    text(
                        f"ALTER TABLE datasets "
                        f"ADD COLUMN {column_name} {column_type}"
                    )
                )
                print(f"Added column: {column_name}")

    print("DataTether database migration completed!")


if __name__ == "__main__":
    migrate_database()