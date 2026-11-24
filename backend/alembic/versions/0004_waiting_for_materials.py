"""complaint status: waiting for materials

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-18
"""
from alembic import op

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'WAITING_FOR_MATERIALS' AFTER 'WAITING_FOR_INFORMATION'")


def downgrade() -> None:
    # Postgres cannot drop an enum value; move any such requests back to In Progress so the value is unused
    op.execute("UPDATE complaints SET status = 'IN_PROGRESS' WHERE status = 'WAITING_FOR_MATERIALS'")
