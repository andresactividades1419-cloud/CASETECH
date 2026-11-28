"""
Tests de humo de la BD de pruebas (bootcamp de testing, semana 6).

¿Qué? Comprueban que la preparación funciona: migraciones aplicadas, aislamiento
      por rollback y el API leyendo de PostgreSQL real.
¿Para qué? Que Javier, Oscar y Andrés escriban sus tests de integración sobre una
           base que ya se sabe correcta.
¿Impacto? Si uno de estos falla, el problema es de la preparación, no del test nuevo.
"""

import uuid
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.models.material import Material

STORED_PROCEDURES = {
    "sp_crear_proveedor",
    "sp_descontar_receta",
    "sp_revertir_receta",
    "sp_ajuste_inventario",
}


def _unique_name(prefix: str) -> str:
    # Nombre único por corrida: la columna materiales.nombre es UNIQUE.
    return f"{prefix} {uuid.uuid4().hex[:8]}"


async def test_migrations_create_the_four_stored_procedures_when_database_is_new(
    pg_session: AsyncSession,
):
    # Act: se consultan los procedimientos que existen en el catálogo de PostgreSQL
    result = await pg_session.execute(
        text("SELECT proname FROM pg_proc WHERE prokind = 'p'")
    )
    procedures = {row.proname for row in result}

    # Assert: las migraciones crearon los 4 (SQLite no puede tener ninguno)
    assert STORED_PROCEDURES <= procedures


async def test_commit_inside_a_test_is_not_visible_from_another_connection(
    pg_session: AsyncSession, migrated_database: str
):
    # Arrange: el test guarda un material y hace commit, como lo haría un servicio
    nombre = _unique_name("Material de aislamiento")
    pg_session.add(Material(nombre=nombre, unidad_medida="kg"))
    await pg_session.commit()

    # Act: otra conexión, independiente de la del test, busca ese material
    other_engine = create_async_engine(migrated_database, poolclass=NullPool)
    async with other_engine.connect() as other_connection:
        count = (
            await other_connection.execute(
                select(func.count())
                .select_from(Material)
                .where(Material.nombre == nombre)
            )
        ).scalar_one()
    await other_engine.dispose()

    # Assert: no lo ve. El commit fue un savepoint dentro de la transacción del test,
    # y el rollback del final lo borra: el siguiente test no hereda este material.
    assert count == 0


async def test_rollback_by_service_code_only_undoes_changes_after_the_last_commit(
    pg_session: AsyncSession,
):
    # Arrange: un servicio guarda un material y confirma (commit)...
    guardado = Material(nombre=_unique_name("Material confirmado"), unidad_medida="kg")
    pg_session.add(guardado)
    await pg_session.commit()
    guardado_id = guardado.id

    # ...y después empieza otro cambio que falla y deshace (como order_service
    # cuando falta stock: hace rollback y responde 422)
    pg_session.add(
        Material(nombre=_unique_name("Material descartado"), unidad_medida="kg")
    )
    await pg_session.flush()

    # Act
    await pg_session.rollback()

    # Assert: solo se deshizo lo posterior al commit; lo confirmado sigue ahí.
    # Sin join_transaction_mode="create_savepoint" en el fixture, ese rollback
    # borraría también lo que el test preparó antes y el test seguiría a ciegas.
    assert await pg_session.get(Material, guardado_id) is not None


async def test_get_material_returns_the_row_saved_in_postgresql(
    pg_client: AsyncClient,
    pg_session: AsyncSession,
    pg_operario_headers: dict[str, str],
):
    # Arrange: el material se inserta directo en la BD real
    material = Material(
        nombre=_unique_name("Cemento de prueba"),
        unidad_medida="kg",
        stock_actual=Decimal("12.500"),
        stock_minimo=Decimal("2.000"),
    )
    pg_session.add(material)
    await pg_session.flush()

    # Act
    response = await pg_client.get(
        f"/api/v1/materials/{material.id}", headers=pg_operario_headers
    )

    # Assert: el API lo lee de PostgreSQL con el tipo NUMERIC(12,3) intacto
    assert response.status_code == 200
    body = response.json()
    assert body["nombre"] == material.nombre
    assert Decimal(str(body["stock_actual"])) == Decimal("12.500")
