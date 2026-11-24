"""complaint accept/reject decision and in-app notifications

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None

decision = postgresql.ENUM('ACCEPTED', 'REJECTED', name='complaint_decision', create_type=False)


def upgrade() -> None:
    decision.create(op.get_bind(), checkfirst=True)
    op.add_column('complaints', sa.Column('decision', decision, nullable=True))
    op.add_column('complaints', sa.Column('decision_reason', sa.Text(), nullable=True))
    op.add_column('complaints', sa.Column('decided_by_id', sa.UUID(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('complaints', sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_complaints_decision', 'complaints', ['decision'])

    op.create_table('notifications',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
                    sa.Column('kind', sa.String(40), nullable=False),
                    sa.Column('title', sa.String(160), nullable=False),
                    sa.Column('body', sa.Text(), nullable=False, server_default=''),
                    sa.Column('complaint_id', sa.UUID(), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=True),
                    sa.Column('link', sa.String(255), nullable=True),
                    sa.Column('emailed', sa.Boolean(), nullable=False, server_default=sa.false()),
                    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    for col in ('user_id', 'complaint_id', 'read_at'):
        op.create_index(f'ix_notifications_{col}', 'notifications', [col])


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_index('ix_complaints_decision', table_name='complaints')
    for col in ('decided_at', 'decided_by_id', 'decision_reason', 'decision'):
        op.drop_column('complaints', col)
    op.execute('DROP TYPE IF EXISTS complaint_decision')
