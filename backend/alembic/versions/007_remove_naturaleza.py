"""remove_naturaleza

Revision ID: 007_remove_naturaleza
Revises: 006_fix_updated_at_default
Create Date: 2026-09-07 00:00:00.000000

Issue #78: elimina la distincion RECUPERABLE/PERDIDO de tipos_caseton.
Los casetones se venden, no se alquilan, asi que ninguno vuelve a la
fabrica — la distincion no tenia sustento real en el negocio.

Reemplaza sp_descontar_receta para que ya no ramifique por naturaleza
(siempre registra 'DESCUENTO_PRODUCCION' de aqui en adelante). Los
movimientos historicos ya guardados como 'DESCUENTO_PRODUCCION_DEFINITIVO'
no se tocan — el CHECK constraint de movimientos_inventario ya los acepta.
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007_remove_naturaleza"
down_revision: str | None = "006_fix_updated_at_default"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # SQL directo (no op.drop_constraint) para no depender de que Alembic
    # reconstruya el nombre del constraint. La causa real de que este nombre
    # pudiera no coincidir se corrigió en alembic/env.py (target_metadata ya
    # no expone el naming_convention de #81 a las migraciones) — ver el
    # comentario ahí para el detalle completo.
    op.execute(
        sa.text(
            "ALTER TABLE tipos_caseton DROP CONSTRAINT ck_tipos_caseton_naturaleza"
        )
    )
    op.drop_column("tipos_caseton", "naturaleza")

    # Las descripciones originales (migracion 001) narraban un modelo de
    # alquiler de moldes reutilizables ("el modulo regresa a la fabrica").
    # El negocio real es venta directa: ningun caseton vuelve.
    op.execute(
        sa.text(
            """
            UPDATE tipos_caseton SET descripcion = CASE nombre
                WHEN 'Casetón de Lona 60x60' THEN 'Bastidor de madera con lona tensada, para vaciado de losa.'
                WHEN 'Casetón de Guadua 60x60' THEN 'Cercha estructural en guadua y madera con amarres, para vaciado de losa.'
                WHEN 'Casetón de Icopor 60x60' THEN 'Bloque de Poliestireno Expandido (EPS). Queda fundido en la losa.'
                ELSE descripcion
            END
            WHERE nombre IN ('Casetón de Lona 60x60', 'Casetón de Guadua 60x60', 'Casetón de Icopor 60x60')
            """
        )
    )

    sql_file_path = os.path.join(os.path.dirname(__file__), "007_remove_naturaleza.sql")
    with open(sql_file_path, encoding="utf-8") as f:
        sql_content = f.read()
    op.execute(sa.text(sql_content))


def downgrade() -> None:
    op.add_column(
        "tipos_caseton",
        sa.Column("naturaleza", sa.String(length=20), nullable=True),
    )
    op.execute(
        sa.text("UPDATE tipos_caseton SET naturaleza = 'RECUPERABLE' WHERE naturaleza IS NULL")
    )
    op.alter_column("tipos_caseton", "naturaleza", nullable=False)
    op.execute(
        sa.text(
            "ALTER TABLE tipos_caseton ADD CONSTRAINT ck_tipos_caseton_naturaleza "
            "CHECK (naturaleza IN ('RECUPERABLE', 'PERDIDO'))"
        )
    )
