"""add agent_knowledge_folders join table

Revision ID: a3f7c9e1b2d4
Revises: e6d73b51059d
Create Date: 2026-05-24 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3f7c9e1b2d4"
down_revision: Union[str, None] = "e6d73b51059d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_knowledge_folders",
        sa.Column("agent_id", sa.Uuid(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("folder_id", sa.Uuid(as_uuid=True), sa.ForeignKey("knowledge_folders.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("agent_knowledge_folders")
