"""stored_procedures

Revision ID: 002_stored_procedures
Revises: 001_initial_schema
Create Date: 2026-08-24 00:01:00.000000

Creación de Stored Procedures transaccionales PL/pgSQL:
- sp_crear_proveedor
- sp_descontar_receta
- sp_ajuste_inventario
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_stored_procedures"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    sql_file_path = os.path.join(os.path.dirname(__file__), "002_stored_procedures.sql")
    with open(sql_file_path, encoding="utf-8") as f:
        sql_content = f.read()

    op.execute(sa.text(sql_content))


def downgrade() -> None:
    op.execute(
        sa.text(
            "DROP PROCEDURE IF EXISTS sp_ajuste_inventario(BIGINT, BIGINT, BOOLEAN);"
        )
    )
    op.execute(sa.text("DROP PROCEDURE IF EXISTS sp_descontar_receta(BIGINT, BIGINT);"))
    op.execute(
        sa.text(
            "DROP PROCEDURE IF EXISTS sp_crear_proveedor(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BIGINT, OUT BIGINT);"
        )
    )
