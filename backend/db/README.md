# Database Layer

This folder contains the SQLAlchemy ORM models and async database session setup.

## Structure

- `base.py` defines the declarative base class used by all models.
- `models.py` contains ORM models for database tables.
- `database.py` configures the async engine and session factory.

## Notes

- Use async sessions via `AsyncSessionLocal` with `async with` blocks.
- Keep model imports centralized to ensure Alembic can detect metadata.
