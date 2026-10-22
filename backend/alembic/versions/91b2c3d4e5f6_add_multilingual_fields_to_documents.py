"""add_multilingual_fields_to_documents

Revision ID: 91b2c3d4e5f6
Revises: 89a1b2c3d4e5
Create Date: 2026-10-22 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '89a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('detected_language', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('language_distribution', sa.JSON(), nullable=True))

    with op.batch_alter_table('document_pages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('detected_language', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('language_confidence', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('translated_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('translation_provider', sa.String(length=100), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('document_pages', schema=None) as batch_op:
        batch_op.drop_column('translation_provider')
        batch_op.drop_column('translated_text')
        batch_op.drop_column('language_confidence')
        batch_op.drop_column('detected_language')

    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_column('language_distribution')
        batch_op.drop_column('detected_language')
