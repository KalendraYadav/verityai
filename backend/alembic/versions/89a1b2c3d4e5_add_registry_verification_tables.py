"""add_registry_verification_tables

Revision ID: 89a1b2c3d4e5
Revises: 702f3a5e4d62
Create Date: 2026-10-22 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89a1b2c3d4e5'
down_revision: Union[str, Sequence[str], None] = '702f3a5e4d62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'registry_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('provider_code', sa.String(length=64), nullable=False),
        sa.Column('reference_identifier', sa.String(length=128), nullable=False),
        sa.Column('institution_name', sa.String(length=255), nullable=False),
        sa.Column('institution_name_normalized', sa.String(length=255), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('approved_intake', sa.Integer(), nullable=True),
        sa.Column('year_of_establishment', sa.Integer(), nullable=True),
        sa.Column('source_dataset', sa.String(length=128), nullable=False),
        sa.Column('dataset_version', sa.String(length=64), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('is_stale', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('registry_records', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_registry_records_provider_code'), ['provider_code'], unique=False)
        batch_op.create_index(batch_op.f('ix_registry_records_reference_identifier'), ['reference_identifier'], unique=False)
        batch_op.create_index(batch_op.f('ix_registry_records_institution_name'), ['institution_name'], unique=False)
        batch_op.create_index(batch_op.f('ix_registry_records_institution_name_normalized'), ['institution_name_normalized'], unique=False)

    op.create_table(
        'registry_verification_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('application_id', sa.String(length=36), nullable=False),
        sa.Column('provider_code', sa.String(length=64), nullable=False),
        sa.Column('overall_status', sa.String(length=50), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('reference_record_id', sa.String(length=36), nullable=True),
        sa.Column('executed_by_id', sa.String(length=36), nullable=True),
        sa.Column('executed_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['executed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reference_record_id'], ['registry_records.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('registry_verification_runs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_registry_verification_runs_application_id'), ['application_id'], unique=False)

    op.create_table(
        'registry_verification_results',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('run_id', sa.String(length=36), nullable=False),
        sa.Column('check_type', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('application_value', sa.String(length=255), nullable=True),
        sa.Column('registry_value', sa.String(length=255), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('discrepancy_details', sa.JSON(), nullable=True),
        sa.Column('requires_human_review', sa.Boolean(), nullable=False),
        sa.Column('resolved_by_id', sa.String(length=36), nullable=True),
        sa.Column('resolution_status', sa.String(length=50), nullable=False),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['run_id'], ['registry_verification_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('registry_verification_results', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_registry_verification_results_run_id'), ['run_id'], unique=False)


def downgrade() -> None:
    op.drop_table('registry_verification_results')
    op.drop_table('registry_verification_runs')
    op.drop_table('registry_records')
