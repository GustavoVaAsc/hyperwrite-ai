try:
    from sqlalchemy.orm import DeclarativeBase

    class Base(DeclarativeBase):
        pass
except ImportError:  # SQLAlchemy < 2.0
    from sqlalchemy.orm import declarative_base

    Base = declarative_base()
