"""refresh_tokens

Revision ID: 005_refresh_tokens
Revises: 004_seed_recipes_and_materials
Create Date: 2026-09-07 00:00:00.000000

Crea la tabla `refresh_tokens` para el flujo de renovacion de sesion
(Issue #86). Solo se guarda el hash SHA-256 del token, nunca el valor
en texto plano.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005_refresh_tokens"
down_revision: str | None = "004_seed_recipes_and_materials"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "revoked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_refresh_tokens_usuario_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index(
        "idx_refresh_tokens_usuario_id", "refresh_tokens", ["usuario_id"]
    )
    op.create_index(
        "idx_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"]
    )


def downgrade() -> None:
    op.drop_index("idx_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("idx_refresh_tokens_usuario_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
