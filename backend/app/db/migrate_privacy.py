from sqlalchemy import inspect, text

from app.db.database import engine


def migrate_privacy_fields():
    inspector = inspect(engine)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("datasets")
    }

    new_columns = {
        "columns": "JSON",
        "sensitive_attributes": "JSON",
        "data_description": "VARCHAR",
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
            else:
                print(f"Already exists: {column_name}")

    print("\nPrivacy metadata migration completed!")


if __name__ == "__main__":
    migrate_privacy_fields()