"""account_lockout

Revision ID: 008_account_lockout
Revises: 007_remove_naturaleza
Create Date: 2026-09-07 00:00:00.000000

Issue #80: agrega el contador de intentos fallidos de login para bloqueo
de cuenta (RF01). El rate limiting (10/min) ya existente mitiga fuerza
bruta automatizada, pero no bloquea una cuenta especifica ante intentos
repetidos con credenciales adivinadas.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_account_lockout"
down_revision: str | None = "007_remove_naturaleza"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "intentos_fallidos",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "intentos_fallidos")
