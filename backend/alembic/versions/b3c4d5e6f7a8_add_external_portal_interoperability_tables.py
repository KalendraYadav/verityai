"""add_external_portal_interoperability_tables

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-10-22 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3c4d5e6f7a8'
down_revision = 'a2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create external_portal_configs table
    op.create_table(
        'external_portal_configs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('provider_id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('provider_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('base_url', sa.String(length=500), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('auth_type', sa.String(length=50), nullable=False, default='NONE'),
        sa.Column('statutory_authority', sa.String(length=255), nullable=False),
        sa.Column('timeout_seconds', sa.Integer(), nullable=False, default=10),
        sa.Column('max_response_bytes', sa.Integer(), nullable=False, default=1048576),
        sa.Column('requires_https', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_synthetic', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider_id', name='uq_portal_provider_id')
    )
    op.create_index(op.f('ix_external_portal_configs_provider_id'), 'external_portal_configs', ['provider_id'], unique=True)

    # 2. Create external_portal_sync_logs table
    op.create_table(
        'external_portal_sync_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('portal_config_id', sa.String(length=36), nullable=False),
        sa.Column('provider_id', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('target_identifier', sa.String(length=150), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('http_status_code', sa.Integer(), nullable=True),
        sa.Column('response_latency_ms', sa.Float(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('request_metadata', sa.JSON(), nullable=True),
        sa.Column('initiated_by_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['portal_config_id'], ['external_portal_configs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_external_portal_sync_logs_portal_config_id'), 'external_portal_sync_logs', ['portal_config_id'], unique=False)
    op.create_index(op.f('ix_external_portal_sync_logs_provider_id'), 'external_portal_sync_logs', ['provider_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_external_portal_sync_logs_provider_id'), table_name='external_portal_sync_logs')
    op.drop_index(op.f('ix_external_portal_sync_logs_portal_config_id'), table_name='external_portal_sync_logs')
    op.drop_table('external_portal_sync_logs')
    op.drop_index(op.f('ix_external_portal_configs_provider_id'), table_name='external_portal_configs')
    op.drop_table('external_portal_configs')
