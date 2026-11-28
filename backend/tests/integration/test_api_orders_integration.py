"""
Endpoint POST /api/v1/orders/ contra PostgreSQL real.

Bootcamp de testing, semana 6 — capa API.

¿Qué? Crea pedidos por el API y verifica el resultado EN LA BASE DE DATOS, no solo
      en la respuesta; y prueba qué responde el API con números que no caben en las
      columnas de la tabla pedidos.
¿Para qué? Con SQLite estos números pasaban; contra PostgreSQL respondían 500.
¿Impacto? Si alguien quita los límites de app/schemas/order.py, estos tests fallan.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.product_type import ProductType

MAX_INTEGER = 2_147_483_647  # pedidos.cantidad es INTEGER
MAX_BIGINT = 9_223_372_036_854_775_807  # pedidos.tipo_caseton_id es BIGINT


async def _crear_tipo_caseton(pg_session: AsyncSession) -> ProductType:
    # Cada test crea su propio tipo de casetón: no depende de ids fijos.
    tipo = ProductType(nombre=f"Casetón de prueba {uuid.uuid4().hex[:8]}")
    pg_session.add(tipo)
    await pg_session.commit()
    return tipo


def _pedido(tipo_caseton_id: int, cantidad: int = 10) -> dict:
    return {
        "cliente": "Constructora de Prueba",
        "tipo_caseton_id": tipo_caseton_id,
        "cantidad": cantidad,
        "fecha_entrega_estimada": "2099-12-31",  # lejana: nunca caduca
    }


async def test_create_order_saves_it_in_postgresql_when_body_is_valid(
    pg_client: AsyncClient, pg_session: AsyncSession, pg_admin_headers: dict[str, str]
):
    # Arrange
    tipo = await _crear_tipo_caseton(pg_session)

    # Act
    response = await pg_client.post(
        "/api/v1/orders/", json=_pedido(tipo.id, cantidad=25), headers=pg_admin_headers
    )

    # Assert: se verifica en la BD, no solo en la respuesta
    assert response.status_code == 201
    pedido = await pg_session.get(Order, response.json()["id"])
    assert pedido is not None
    assert pedido.cliente == "Constructora de Prueba"
    assert pedido.cantidad == 25
    assert pedido.estado == "PENDIENTE"
    assert pedido.tipo_caseton_id == tipo.id


async def test_create_order_saves_quantity_when_it_is_exactly_the_integer_maximum(
    pg_client: AsyncClient, pg_session: AsyncSession, pg_admin_headers: dict[str, str]
):
    # Arrange: el otro lado del límite, lo máximo que cabe en INTEGER
    tipo = await _crear_tipo_caseton(pg_session)

    # Act
    response = await pg_client.post(
        "/api/v1/orders/",
        json=_pedido(tipo.id, cantidad=MAX_INTEGER),
        headers=pg_admin_headers,
    )

    # Assert
    assert response.status_code == 201
    pedido = await pg_session.get(Order, response.json()["id"])
    assert pedido is not None
    assert pedido.cantidad == MAX_INTEGER


async def test_create_order_responds_422_when_quantity_does_not_fit_integer_column(
    pg_client: AsyncClient, pg_session: AsyncSession, pg_admin_headers: dict[str, str]
):
    # Arrange
    tipo = await _crear_tipo_caseton(pg_session)

    # Act: una unidad más de lo que cabe en INTEGER
    response = await pg_client.post(
        "/api/v1/orders/",
        json=_pedido(tipo.id, cantidad=MAX_INTEGER + 1),
        headers=pg_admin_headers,
    )

    # Assert: HALLAZGO — antes respondía 500 (invalid input for query argument)
    assert response.status_code == 422


async def test_create_order_responds_422_when_product_type_id_does_not_fit_bigint(
    pg_client: AsyncClient, pg_admin_headers: dict[str, str]
):
    # Act: un id de tipo de casetón más grande que BIGINT
    response = await pg_client.post(
        "/api/v1/orders/", json=_pedido(MAX_BIGINT + 1), headers=pg_admin_headers
    )

    # Assert: HALLAZGO — antes respondía 500 al buscar el tipo en la BD
    assert response.status_code == 422
