"""add_scrutiny_jobs_table

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-10-25 02:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c4d5e6f7a8b9'
down_revision = 'b3c4d5e6f7a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create scrutiny_jobs table
    op.create_table(
        'scrutiny_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('application_id', sa.String(length=36), nullable=False),
        sa.Column('job_type', sa.String(length=50), nullable=False, server_default='FULL_SCRUTINY'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='QUEUED'),
        sa.Column('triggered_by', sa.String(length=36), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_retries', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('safe_error_summary', sa.Text(), nullable=True),
        sa.Column('stage_details', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('results_summary', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['triggered_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scrutiny_jobs_application_id'), 'scrutiny_jobs', ['application_id'], unique=False)
    op.create_index(op.f('ix_scrutiny_jobs_status'), 'scrutiny_jobs', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_scrutiny_jobs_status'), table_name='scrutiny_jobs')
    op.drop_index(op.f('ix_scrutiny_jobs_application_id'), table_name='scrutiny_jobs')
    op.drop_table('scrutiny_jobs')
