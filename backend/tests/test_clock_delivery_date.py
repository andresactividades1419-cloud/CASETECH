"""
Tests con dobles del reloj (bootcamp semana 5, capa API).

CASETECH no usa correo, pagos ni APIs de terceros: su dependencia externa es
el reloj. La regla "la fecha de entrega no puede ser pasada" consulta
`hoy()` en app/schemas/order.py; aquí se reemplaza por una fecha fija con
unittest.mock.patch, así los valores límite (ayer, hoy, mañana) dan siempre el
mismo resultado sin importar el día en que se corran.
"""

from datetime import date
from unittest.mock import patch

from httpx import AsyncClient

# "Hoy" de mentira para todos los tests de este archivo.
HOY_FIJO = date(2026, 6, 15)

PEDIDO = {
    "cliente": "Constructora Andina S.A.S.",
    "tipo_caseton_id": 1,
    "cantidad": 10,
}


async def test_delivery_today_is_accepted(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Doble: STUB del reloj. Solo devuelve una fecha fija; no se verifican sus llamadas.
    # Arrange: valor límite, la entrega es exactamente "hoy"
    pedido = {**PEDIDO, "fecha_entrega_estimada": "2026-06-15"}

    # Act
    with patch("app.schemas.order.hoy", return_value=HOY_FIJO):
        response = await client.post(
            "/api/v1/orders/", json=pedido, headers=admin_headers
        )

    # Assert (estado): el pedido se creó con la fecha pedida
    assert response.status_code == 201
    assert response.json()["fecha_entrega_estimada"] == "2026-06-15"


async def test_delivery_yesterday_is_rejected_with_422(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Doble: STUB del reloj
    # Arrange: valor límite, un día antes de "hoy"
    pedido = {**PEDIDO, "fecha_entrega_estimada": "2026-06-14"}

    # Act
    with patch("app.schemas.order.hoy", return_value=HOY_FIJO):
        response = await client.post(
            "/api/v1/orders/", json=pedido, headers=admin_headers
        )

    # Assert
    assert response.status_code == 422
    assert "no puede ser una fecha pasada" in response.text


async def test_delivery_tomorrow_is_accepted(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Doble: STUB del reloj
    # Arrange: un día después de "hoy"
    pedido = {**PEDIDO, "fecha_entrega_estimada": "2026-06-16"}

    # Act
    with patch("app.schemas.order.hoy", return_value=HOY_FIJO):
        response = await client.post(
            "/api/v1/orders/", json=pedido, headers=admin_headers
        )

    # Assert
    assert response.status_code == 201


async def test_clock_is_consulted_once_when_creating_an_order(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Doble: MOCK del reloj. Además de devolver la fecha, el test verifica
    # CÓMO se usó: que la regla consultó el reloj exactamente una vez.
    pedido = {**PEDIDO, "fecha_entrega_estimada": "2026-06-20"}

    # Act
    with patch("app.schemas.order.hoy", return_value=HOY_FIJO) as reloj:
        response = await client.post(
            "/api/v1/orders/", json=pedido, headers=admin_headers
        )

    # Assert (comportamiento)
    assert response.status_code == 201
    reloj.assert_called_once()


async def test_order_can_still_be_read_after_its_delivery_date_passed(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Doble: STUB del reloj, con 2 "hoy" distintos para simular el paso del tiempo
    # Arrange: el pedido se crea el 15 de junio con entrega el 20
    pedido = {**PEDIDO, "fecha_entrega_estimada": "2026-06-20"}
    with patch("app.schemas.order.hoy", return_value=HOY_FIJO):
        creado = await client.post(
            "/api/v1/orders/", json=pedido, headers=admin_headers
        )
    order_id = creado.json()["id"]

    # Act: se consulta el 1 de julio, cuando la fecha de entrega ya pasó
    with patch("app.schemas.order.hoy", return_value=date(2026, 7, 1)):
        response = await client.get(f"/api/v1/orders/{order_id}", headers=admin_headers)

    # Assert (estado): la regla de "fecha no pasada" solo aplica al CREAR
    assert response.status_code == 200
    assert response.json()["fecha_entrega_estimada"] == "2026-06-20"


async def test_clock_is_not_consulted_when_delivery_date_is_missing(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Doble: MOCK del reloj. Si falta la fecha, Pydantic rechaza el campo antes
    # de llegar a la regla, así que el reloj NO debe consultarse.
    pedido = {**PEDIDO}  # sin fecha_entrega_estimada

    # Act
    with patch("app.schemas.order.hoy", return_value=HOY_FIJO) as reloj:
        response = await client.post(
            "/api/v1/orders/", json=pedido, headers=admin_headers
        )

    # Assert (comportamiento): 422 por el campo faltante y el reloj sin usar
    assert response.status_code == 422
    reloj.assert_not_called()
