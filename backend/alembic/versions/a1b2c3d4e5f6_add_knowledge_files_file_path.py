"""add_knowledge_files_file_path

Revision ID: a1b2c3d4e5f6
Revises: ff5538937719
Create Date: 2026-05-23 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ff5538937719'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('knowledge_files', sa.Column('file_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('knowledge_files', 'file_path')