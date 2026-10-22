"""add_versioning_and_revisions_tables

Revision ID: a2b3c4d5e6f7
Revises: 91b2c3d4e5f6
Create Date: 2026-10-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a2b3c4d5e6f7'
down_revision = '91b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create application_versions table
    op.create_table(
        'application_versions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('application_id', sa.String(length=36), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('change_summary', sa.String(length=255), nullable=False),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('snapshot_data', sa.JSON(), nullable=False),
        sa.Column('created_by_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', 'version_number', name='uq_app_version_number')
    )
    op.create_index(op.f('ix_application_versions_application_id'), 'application_versions', ['application_id'], unique=False)
    op.create_index(op.f('ix_application_versions_version_number'), 'application_versions', ['version_number'], unique=False)

    # 2. Create document_revisions table
    op.create_table(
        'document_revisions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('document_id', sa.String(length=36), nullable=False),
        sa.Column('revision_number', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=False),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('uploaded_by_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', 'revision_number', name='uq_doc_revision_number')
    )
    op.create_index(op.f('ix_document_revisions_document_id'), 'document_revisions', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_revisions_sha256'), 'document_revisions', ['sha256'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_revisions_sha256'), table_name='document_revisions')
    op.drop_index(op.f('ix_document_revisions_document_id'), table_name='document_revisions')
    op.drop_table('document_revisions')

    op.drop_index(op.f('ix_application_versions_version_number'), table_name='application_versions')
    op.drop_index(op.f('ix_application_versions_application_id'), table_name='application_versions')
    op.drop_table('application_versions')
