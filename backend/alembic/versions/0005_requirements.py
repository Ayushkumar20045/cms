"""material and equipment requirements

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE SEQUENCE IF NOT EXISTS requirement_number_seq')
    op.create_table('requirements',
                    sa.Column('id', sa.UUID(), primary_key=True),
                    sa.Column('requirement_number', sa.String(20), nullable=False, unique=True),
                    sa.Column('item', sa.String(150), nullable=False),
                    sa.Column('category_id', sa.Integer(), sa.ForeignKey('complaint_categories.id')),
                    sa.Column('quantity', sa.Integer(), nullable=False),
                    sa.Column('reason', sa.Text(), nullable=False),
                    sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', name='requirement_status'),
                              nullable=False, server_default='PENDING'),
                    sa.Column('hostel_id', sa.Integer(), sa.ForeignKey('hostels.id')),
                    sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id')),
                    sa.Column('complaint_id', sa.UUID(), sa.ForeignKey('complaints.id')),
                    sa.Column('requested_by_id', sa.UUID(), sa.ForeignKey('users.id'), nullable=False),
                    sa.Column('decided_by_id', sa.UUID(), sa.ForeignKey('users.id')),
                    sa.Column('decided_at', sa.DateTime(timezone=True)),
                    sa.Column('decision_remarks', sa.Text()),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                    sa.CheckConstraint('quantity > 0', name='requirements_quantity_positive'))
    for col in ('status', 'hostel_id', 'department_id', 'requested_by_id'):
        op.create_index(f'ix_requirements_{col}', 'requirements', [col])


def downgrade() -> None:
    op.drop_table('requirements')
    op.execute('DROP TYPE IF EXISTS requirement_status')
    op.execute('DROP SEQUENCE IF EXISTS requirement_number_seq')
