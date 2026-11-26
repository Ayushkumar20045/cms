"""labels, linked tickets and sub-tasks

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-27
"""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('labels',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('name', sa.String(40), nullable=False, unique=True),
                    sa.Column('color', sa.String(20), nullable=False, server_default='slate'),
                    sa.Column('created_by_id', sa.UUID(), sa.ForeignKey('users.id')),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.create_table('complaint_labels',
                    sa.Column('complaint_id', sa.UUID(), sa.ForeignKey('complaints.id', ondelete='CASCADE'), primary_key=True),
                    sa.Column('label_id', sa.Integer(), sa.ForeignKey('labels.id', ondelete='CASCADE'), primary_key=True))
    op.create_index('ix_complaint_labels_label_id', 'complaint_labels', ['label_id'])

    op.create_table('complaint_links',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('source_id', sa.UUID(), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False),
                    sa.Column('target_id', sa.UUID(), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False),
                    sa.Column('link_type', sa.Enum('DUPLICATES', 'BLOCKS', 'RELATES_TO', name='link_type'), nullable=False),
                    sa.Column('created_by_id', sa.UUID(), sa.ForeignKey('users.id')),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                    sa.UniqueConstraint('source_id', 'target_id', 'link_type'),
                    sa.CheckConstraint('source_id <> target_id', name='complaint_links_not_self'))
    op.create_index('ix_complaint_links_source_id', 'complaint_links', ['source_id'])
    op.create_index('ix_complaint_links_target_id', 'complaint_links', ['target_id'])

    op.create_table('subtasks',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('complaint_id', sa.UUID(), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False),
                    sa.Column('title', sa.String(150), nullable=False),
                    sa.Column('status', sa.Enum('TODO', 'IN_PROGRESS', 'DONE', name='subtask_status'), nullable=False,
                              server_default='TODO'),
                    sa.Column('assignee_id', sa.UUID(), sa.ForeignKey('users.id')),
                    sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
                    sa.Column('created_by_id', sa.UUID(), sa.ForeignKey('users.id')),
                    sa.Column('completed_at', sa.DateTime(timezone=True)),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.create_index('ix_subtasks_complaint_id', 'subtasks', ['complaint_id'])
    op.create_index('ix_subtasks_assignee_id', 'subtasks', ['assignee_id'])


def downgrade() -> None:
    op.drop_table('subtasks')
    op.drop_table('complaint_links')
    op.drop_table('complaint_labels')
    op.drop_table('labels')
    for enum_name in ('subtask_status', 'link_type'):
        op.execute(f'DROP TYPE IF EXISTS {enum_name}')
