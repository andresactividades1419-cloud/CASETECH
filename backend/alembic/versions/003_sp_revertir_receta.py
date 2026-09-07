"""sp_revertir_receta

Revision ID: 003_sp_revertir_receta
Revises: 002_stored_procedures
Create Date: 2026-09-07 00:00:00.000000

Creación del Stored Procedure sp_revertir_receta: revierte el descuento de
materiales de un pedido que se cancela mientras estaba EN_PRODUCCION.
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_sp_revertir_receta"
down_revision: str | None = "002_stored_procedures"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    sql_file_path = os.path.join(
        os.path.dirname(__file__), "003_sp_revertir_receta.sql"
    )
    with open(sql_file_path, encoding="utf-8") as f:
        sql_content = f.read()

    op.execute(sa.text(sql_content))


def downgrade() -> None:
    op.execute(sa.text("DROP PROCEDURE IF EXISTS sp_revertir_receta(BIGINT, BIGINT);"))
