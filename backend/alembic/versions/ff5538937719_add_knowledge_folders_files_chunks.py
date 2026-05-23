"""add_knowledge_folders_files_chunks

Revision ID: ff5538937719
Revises: b7e1f4a2c3d5
Create Date: 2026-05-23 13:16:26.842844

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ff5538937719'
down_revision: Union[str, None] = 'b7e1f4a2c3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('knowledge_folders',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_folders_owner_id'), 'knowledge_folders', ['owner_id'], unique=False)

    op.create_table('knowledge_files',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('folder_id', sa.Uuid(), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=False),
    sa.Column('original_name', sa.String(length=255), nullable=False),
    sa.Column('file_type', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['folder_id'], ['knowledge_folders.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_files_folder_id'), 'knowledge_files', ['folder_id'], unique=False)
    op.create_index(op.f('ix_knowledge_files_owner_id'), 'knowledge_files', ['owner_id'], unique=False)

    op.create_table('knowledge_chunks',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('file_id', sa.Uuid(), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('embedding', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['file_id'], ['knowledge_files.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_chunks_file_id'), 'knowledge_chunks', ['file_id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_owner_id'), 'knowledge_chunks', ['owner_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_knowledge_chunks_owner_id'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_file_id'), table_name='knowledge_chunks')
    op.drop_table('knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_files_owner_id'), table_name='knowledge_files')
    op.drop_index(op.f('ix_knowledge_files_folder_id'), table_name='knowledge_files')
    op.drop_table('knowledge_files')
    op.drop_index(op.f('ix_knowledge_folders_owner_id'), table_name='knowledge_folders')
    op.drop_table('knowledge_folders')