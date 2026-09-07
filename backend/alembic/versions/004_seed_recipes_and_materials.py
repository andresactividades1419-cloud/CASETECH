"""seed_recipes_and_materials

Revision ID: 004_seed_recipes_and_materials
Revises: 003_sp_revertir_receta
Create Date: 2026-09-07 00:00:00.000000

Siembra los materiales e insumos auxiliares que faltaban y las recetas BOM
reales para los 3 tipos de casetón, según docs/02-requisitos-sistema.md (RF07)
y docs/01-analisis-y-alcance.md. Antes de esta migración la tabla `recetas`
estaba vacía y no existía ningún camino (ni de código ni de UI) para
configurar el BOM — ver Issue #88.

Idempotente: usa ON CONFLICT DO NOTHING, así que correr esta migración dos
veces (o sobre una BD que ya tenga estos datos cargados a mano) no duplica
nada.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004_seed_recipes_and_materials"
down_revision: str | None = "003_sp_revertir_receta"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -------------------------------------------------------------------
    # 1. Materiales/insumos que todavía no existían
    #    (icopor ya existe en la mayoría de entornos - se deja fuera)
    # -------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO materiales (nombre, unidad_medida, stock_actual, stock_minimo) VALUES
          ('Madera - Listones', 'm', 150.000, 20.000),
          ('Lona Impermeable', 'm2', 50.000, 10.000),
          ('Guadua - Culmos', 'm', 80.000, 15.000),
          ('Grapas', 'und', 2000.000, 200.000),
          ('Puntillas', 'und', 2000.000, 200.000),
          ('Alambre de Amarre', 'm', 200.000, 30.000)
        ON CONFLICT (nombre) DO NOTHING;
        """
    )

    # -------------------------------------------------------------------
    # 2. Recetas BOM reales (RF07 + docs/01-analisis-y-alcance.md)
    #    Las cantidades de madera/lona/guadua son las que documenta RF07.
    #    Grapas/puntillas/alambre son insumos auxiliares mencionados en la
    #    documentación sin cantidad exacta especificada - se estiman valores
    #    razonables, ajustables luego desde la pantalla de administración
    #    de recetas (Issue #88).
    # -------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO recetas (tipo_caseton_id, material_id, cantidad_por_unidad)
        SELECT tc.id, m.id, v.cantidad
        FROM (VALUES
          ('Casetón de Lona 60x60',   'Madera - Listones',   2.5000),
          ('Casetón de Lona 60x60',   'Lona Impermeable',    0.8000),
          ('Casetón de Lona 60x60',   'Grapas',             25.0000),
          ('Casetón de Lona 60x60',   'Puntillas',          12.0000),
          ('Casetón de Guadua 60x60', 'Guadua - Culmos',     1.2000),
          ('Casetón de Guadua 60x60', 'Madera - Listones',   0.6000),
          ('Casetón de Guadua 60x60', 'Alambre de Amarre',   2.5000),
          ('Casetón de Guadua 60x60', 'Puntillas',          10.0000),
          ('Casetón de Icopor 60x60', 'icopor',              1.0000)
        ) AS v(tipo_nombre, material_nombre, cantidad)
        JOIN tipos_caseton tc ON tc.nombre = v.tipo_nombre
        JOIN materiales m ON m.nombre = v.material_nombre
        ON CONFLICT ON CONSTRAINT uq_receta_tipo_material DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM recetas
        WHERE (tipo_caseton_id, material_id) IN (
            SELECT tc.id, m.id
            FROM tipos_caseton tc
            JOIN materiales m ON m.nombre IN (
                'Madera - Listones', 'Lona Impermeable', 'Guadua - Culmos',
                'Grapas', 'Puntillas', 'Alambre de Amarre'
            )
            WHERE tc.nombre IN (
                'Casetón de Lona 60x60', 'Casetón de Guadua 60x60', 'Casetón de Icopor 60x60'
            )
        );
        """
    )
    op.execute(
        sa.text(
            "DELETE FROM materiales WHERE nombre IN ("
            "'Madera - Listones', 'Lona Impermeable', 'Guadua - Culmos', "
            "'Grapas', 'Puntillas', 'Alambre de Amarre'"
            ");"
        )
    )
