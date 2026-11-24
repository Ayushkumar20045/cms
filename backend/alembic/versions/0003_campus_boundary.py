"""campus boundary for the private campus map

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('campuses',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('code', sa.String(30), nullable=False, unique=True),
                    sa.Column('name', sa.String(120), nullable=False),
                    sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='GEOMETRY', srid=4326, spatial_index=False),
                              nullable=False),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.create_index('idx_campuses_geom', 'campuses', ['geom'], postgresql_using='gist')


def downgrade() -> None:
    op.drop_table('campuses')
