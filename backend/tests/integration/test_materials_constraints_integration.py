"""
Restricciones de las tablas materiales y proveedores contra PostgreSQL real.

Bootcamp de testing, semana 6 — capa BD.

¿Qué? Un test por cada restricción de la tabla: longitud, NOT NULL, UNIQUE, CHECK
      y el tamaño de NUMERIC(12,3); además, el filtro y el orden del listado.
¿Para qué? SQLite (los tests de siempre) no respeta varias de estas reglas: aquí se
           comprueba lo que de verdad hace la base de datos de producción.
¿Impacto? Si alguien cambia una migración y quita una restricción, estos tests fallan.
"""

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.models.provider import Provider


def _unique(prefix: str) -> str:
    # Nombre distinto en cada corrida: materiales.nombre es UNIQUE.
    return f"{prefix} {uuid.uuid4().hex[:8]}"


@pytest.mark.parametrize(
    ("campos", "error_de_postgresql"),
    [
        ({"nombre": "x" * 256}, "value too long"),  # nombre VARCHAR(255)
        ({"unidad_medida": "u" * 31}, "value too long"),  # unidad_medida VARCHAR(30)
        ({"unidad_medida": None}, "null value"),  # unidad_medida NOT NULL
        (
            {"stock_actual": Decimal("-1")},
            "ck_materiales_stock_actual_non_negative",  # CHECK stock_actual >= 0
        ),
        (
            {"stock_actual": Decimal("1000000000")},
            "numeric field overflow",  # NUMERIC(12,3): máximo 999999999.999
        ),
    ],
)
async def test_materials_table_rejects_row_when_it_breaks_a_column_constraint(
    pg_session: AsyncSession, campos: dict, error_de_postgresql: str
):
    # Arrange: un material válido al que se le cambia UN campo por un valor prohibido
    datos = {"nombre": _unique("Material"), "unidad_medida": "kg", **campos}
    pg_session.add(Material(**datos))

    # Act + Assert: PostgreSQL rechaza la fila al enviarla (flush)
    with pytest.raises(DBAPIError) as error:
        await pg_session.flush()
    assert error_de_postgresql in str(error.value)


async def test_materials_table_accepts_row_when_values_are_exactly_at_the_limits(
    pg_session: AsyncSession,
):
    # Arrange: el otro lado del límite — exactamente lo máximo que cabe
    material = Material(
        nombre="x" * 247 + uuid.uuid4().hex[:8],  # 255 caracteres, único
        unidad_medida="u" * 30,
        stock_actual=Decimal("999999999.999"),
    )
    pg_session.add(material)

    # Act
    await pg_session.flush()
    await pg_session.refresh(material)

    # Assert: se guardó sin recortar nada
    assert len(material.nombre) == 255
    assert material.stock_actual == Decimal("999999999.999")


async def test_materials_table_rejects_second_material_when_name_is_repeated(
    pg_session: AsyncSession,
):
    # Arrange: un material ya guardado
    nombre = _unique("Cemento gris")
    pg_session.add(Material(nombre=nombre, unidad_medida="kg"))
    await pg_session.flush()

    # Act: otro con el mismo nombre
    pg_session.add(Material(nombre=nombre, unidad_medida="kg"))

    # Assert: la restricción UNIQUE uq_materiales_nombre lo rechaza
    with pytest.raises(IntegrityError, match="uq_materiales_nombre"):
        await pg_session.flush()


async def test_providers_table_rejects_row_when_nit_is_longer_than_20_characters(
    pg_session: AsyncSession,
):
    # Arrange: proveedores.nit es VARCHAR(20)
    pg_session.add(Provider(nit="9" * 21, nombre_empresa=_unique("Ferretería")))

    # Act + Assert
    with pytest.raises(DBAPIError, match="value too long"):
        await pg_session.flush()


async def test_list_materials_returns_matches_ordered_by_name_when_filtering_by_name(
    pg_client: AsyncClient,
    pg_session: AsyncSession,
    pg_operario_headers: dict[str, str],
):
    # Arrange: 3 materiales con un prefijo propio, guardados en DESORDEN (C, A, B)
    prefijo = f"zeta{uuid.uuid4().hex[:6]}"
    for nombre in ("Cal", "Arena", "Balasto"):
        pg_session.add(Material(nombre=f"{prefijo} {nombre}", unidad_medida="kg"))
    await pg_session.flush()

    # Act: se busca con el prefijo en MAYÚSCULAS (ILIKE no distingue)
    response = await pg_client.get(
        "/api/v1/materials/",
        params={"nombre": prefijo.upper()},
        headers=pg_operario_headers,
    )

    # Assert: solo los 3, y en orden alfabético (ORDER BY nombre)
    assert response.status_code == 200
    nombres = [item["nombre"] for item in response.json()["items"]]
    assert nombres == [f"{prefijo} Arena", f"{prefijo} Balasto", f"{prefijo} Cal"]


async def test_create_material_responds_422_when_stock_does_not_fit_numeric_12_3(
    pg_client: AsyncClient, pg_admin_headers: dict[str, str]
):
    # Arrange: un stock de mil millones no cabe en NUMERIC(12,3)
    body = {
        "nombre": _unique("Material gigante"),
        "unidad_medida": "kg",
        "stock_actual": "1000000000",
    }

    # Act
    response = await pg_client.post(
        "/api/v1/materials/", json=body, headers=pg_admin_headers
    )

    # Assert: HALLAZGO — antes respondía 500 (numeric field overflow)
    assert response.status_code == 422
