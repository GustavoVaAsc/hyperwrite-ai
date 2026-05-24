"""documents metadata: owner, title, timestamps, archived_at

Revision ID: b7e1f4a2c3d5
Revises: 06588c11d22f
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7e1f4a2c3d5"
down_revision: Union[str, None] = "06588c11d22f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("owner_id", sa.Integer(), nullable=True),
    )
    op.execute("DELETE FROM documents WHERE owner_id IS NULL")
    op.alter_column("documents", "owner_id", nullable=False)
    op.create_foreign_key(
        "fk_documents_owner_id_users",
        "documents",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_documents_owner_id"),
        "documents",
        ["owner_id"],
        unique=False,
    )
    op.add_column(
        "documents",
        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
            server_default="Untitled",
        ),
    )
    op.add_column(
        "documents",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column(
        "documents",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column(
        "documents",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "archived_at")
    op.drop_column("documents", "updated_at")
    op.drop_column("documents", "created_at")
    op.drop_column("documents", "title")
    op.drop_index(op.f("ix_documents_owner_id"), table_name="documents")
    op.drop_constraint("fk_documents_owner_id_users", "documents", type_="foreignkey")
    op.drop_column("documents", "owner_id")
