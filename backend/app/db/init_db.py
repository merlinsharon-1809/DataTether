from app.db.database import Base, engine
from app.db.models import Dataset


def initialize_database():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    initialize_database()
    print("DataTether database initialized successfully!")