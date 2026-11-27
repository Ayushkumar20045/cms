"""faculty and staff residence on campus

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-27
"""
from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('residence_building_id', sa.Integer(), sa.ForeignKey('buildings.id'), nullable=True))
    op.add_column('users', sa.Column('residence_unit', sa.String(40), nullable=True))
    op.create_index('ix_users_residence_building_id', 'users', ['residence_building_id'])


def downgrade() -> None:
    op.drop_index('ix_users_residence_building_id', table_name='users')
    op.drop_column('users', 'residence_unit')
    op.drop_column('users', 'residence_building_id')
