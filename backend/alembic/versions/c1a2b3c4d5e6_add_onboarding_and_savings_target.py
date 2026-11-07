"""add onboarding_completed and monthly_savings_target_paise to users

Revision ID: c1a2b3c4d5e6
Revises: 9b8c7d6e5f4a
Create Date: 2026-11-07 16:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3c4d5e6'
down_revision: Union[str, None] = '9b8c7d6e5f4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'onboarding_completed',
                sa.Boolean(),
                nullable=False,
                server_default='1',
            )
        )
        batch_op.add_column(
            sa.Column(
                'monthly_savings_target_paise',
                sa.BigInteger(),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('monthly_savings_target_paise')
        batch_op.drop_column('onboarding_completed')
