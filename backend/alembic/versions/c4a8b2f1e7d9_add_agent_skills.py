"""add_agent_skills

Revision ID: c4a8b2f1e7d9
Revises: 2c2adafd8e89
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a8b2f1e7d9'
down_revision: Union[str, None] = 'e6d73b51059d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('agent_skills',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_builtin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_skills_owner_id'), 'agent_skills', ['owner_id'], unique=False)

    op.create_table('agent_skill_assignments',
        sa.Column('agent_id', sa.Uuid(), nullable=False),
        sa.Column('skill_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['agent_skills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('agent_id', 'skill_id')
    )


def downgrade() -> None:
    op.drop_table('agent_skill_assignments')
    op.drop_index(op.f('ix_agent_skills_owner_id'), table_name='agent_skills')
    op.drop_table('agent_skills')
