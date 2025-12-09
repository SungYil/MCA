from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL from environment variable
# Default to localhost for local dev if not set
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/mca_db")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    """
    Database session generator for FastAPI dependency injection.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
