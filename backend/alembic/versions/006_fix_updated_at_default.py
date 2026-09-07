"""fix_updated_at_default

Revision ID: 006_fix_updated_at_default
Revises: 005_refresh_tokens
Create Date: 2026-09-07 00:00:00.000000

Issue #82: `updated_at` en usuarios/materiales/pedidos/proveedores solo se
llenaba con `onupdate`, quedando NULL desde la creacion hasta la primera
edicion. Esta migracion:
1. Rellena las filas existentes con updated_at IS NULL usando su created_at.
2. Agrega un DEFAULT a nivel de base de datos para que nunca vuelva a
   quedar en NULL.
3. Marca la columna NOT NULL, ya consistente en las 4 tablas.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006_fix_updated_at_default"
down_revision: str | None = "005_refresh_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ["usuarios", "materiales", "pedidos", "proveedores"]


def upgrade() -> None:
    for table in TABLES:
        op.execute(
            sa.text(
                f"UPDATE {table} SET updated_at = created_at WHERE updated_at IS NULL"
            )
        )
        op.alter_column(
            table,
            "updated_at",
            server_default=sa.text("now()"),
            nullable=False,
        )


def downgrade() -> None:
    for table in TABLES:
        op.alter_column(
            table,
            "updated_at",
            server_default=None,
            nullable=True,
        )
