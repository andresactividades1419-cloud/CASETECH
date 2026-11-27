"""
Tests de API del recurso principal: pedidos (bootcamp semana 4, capa API).

Cada test envía peticiones HTTP a la app sin levantar servidor: el fixture
`client` reemplaza la base de datos por SQLite en memoria (ver conftest.py),
así que no se necesita Docker ni la BD de desarrollo.
"""

from httpx import AsyncClient

# Fecha lejana: la regla "no se aceptan fechas pasadas" no hace fallar el test
# con el paso del tiempo (FIRST: Repeatable).
FECHA_FUTURA = "2099-12-31"

PEDIDO_VALIDO = {
    "cliente": "Constructora Andina S.A.S.",
    "tipo_caseton_id": 1,
    "cantidad": 10,
    "fecha_entrega_estimada": FECHA_FUTURA,
}


async def test_create_order_responds_201_with_code_and_pending_state(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Act
    response = await client.post(
        "/api/v1/orders/", json=PEDIDO_VALIDO, headers=admin_headers
    )

    # Assert: código, encabezado y cuerpo
    assert response.status_code == 201
    assert response.headers["content-type"] == "application/json"
    body = response.json()
    assert body["codigo_pedido"].startswith("PED-")
    assert body["estado"] == "PENDIENTE"
    assert body["cliente"] == "Constructora Andina S.A.S."
    assert body["cantidad"] == 10


async def test_create_order_responds_422_when_quantity_is_zero(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: valor límite, 0 unidades
    pedido = {**PEDIDO_VALIDO, "cantidad": 0}

    # Act
    response = await client.post("/api/v1/orders/", json=pedido, headers=admin_headers)

    # Assert: Pydantic rechaza el campo y dice cuál fue
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert errores[0]["loc"] == ["body", "cantidad"]


async def test_create_order_responds_422_when_client_name_is_too_short(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: valor límite, 2 caracteres
    pedido = {**PEDIDO_VALIDO, "cliente": "Ab"}

    # Act
    response = await client.post("/api/v1/orders/", json=pedido, headers=admin_headers)

    # Assert: Pydantic marca el campo "cliente" (su mensaje automático sale en inglés)
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["body", "cliente"]
    assert error["type"] == "string_too_short"


async def test_create_order_responds_404_when_product_type_does_not_exist(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: el tipo de casetón 999 no existe en la base de pruebas
    pedido = {**PEDIDO_VALIDO, "tipo_caseton_id": 999}

    # Act
    response = await client.post("/api/v1/orders/", json=pedido, headers=admin_headers)

    # Assert
    assert response.status_code == 404
    assert "999" in response.json()["detail"]


async def test_get_order_responds_404_when_it_does_not_exist(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Act
    response = await client.get("/api/v1/orders/9999", headers=admin_headers)

    # Assert: error con el formato del contrato {"detail": "..."}
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/json"
    assert response.json() == {"detail": "Pedido con ID 9999 no encontrado."}


async def test_get_order_returns_the_created_order(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: primero se crea un pedido
    creado = await client.post(
        "/api/v1/orders/", json=PEDIDO_VALIDO, headers=admin_headers
    )
    order_id = creado.json()["id"]

    # Act
    response = await client.get(f"/api/v1/orders/{order_id}", headers=admin_headers)

    # Assert: la segunda petición ve lo que guardó la primera
    assert response.status_code == 200
    assert response.json()["codigo_pedido"] == creado.json()["codigo_pedido"]


async def test_list_orders_filters_by_state(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: 2 pedidos, uno de ellos cancelado
    primero = await client.post(
        "/api/v1/orders/", json=PEDIDO_VALIDO, headers=admin_headers
    )
    await client.post("/api/v1/orders/", json=PEDIDO_VALIDO, headers=admin_headers)
    await client.patch(
        f"/api/v1/orders/{primero.json()['id']}/status",
        json={"estado": "CANCELADO"},
        headers=admin_headers,
    )

    # Act
    response = await client.get(
        "/api/v1/orders/", params={"estado": "CANCELADO"}, headers=admin_headers
    )

    # Assert: solo aparece el cancelado
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["estado"] == "CANCELADO"


async def test_cancel_pending_order_responds_200_with_new_state(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange
    creado = await client.post(
        "/api/v1/orders/", json=PEDIDO_VALIDO, headers=admin_headers
    )
    order_id = creado.json()["id"]

    # Act
    response = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"estado": "CANCELADO"},
        headers=admin_headers,
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["estado"] == "CANCELADO"
