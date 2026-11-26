"""
Tests de API transversales: seguridad y contrato de errores (bootcamp semana 4, capa E2E).

Verifican que los endpoints protegidos respondan 401 (sin sesión), 403 (rol
insuficiente) y 200 (autorizado), y que los errores mantengan el formato
{"detail": ...} sin filtrar detalles internos. La base de datos es SQLite en
memoria (fixture `client` de conftest.py): no se necesita Docker.
"""

from datetime import timedelta

from httpx import AsyncClient

from app.core.security import create_access_token

PEDIDO_VALIDO = {
    "cliente": "Constructora Andina S.A.S.",
    "tipo_caseton_id": 1,
    "cantidad": 10,
    "fecha_entrega_estimada": "2099-12-31",  # lejana: el test no caduca (FIRST)
}


# ---------------------------------------------------------------------------
# Endpoints protegidos: 401 / 403 / autorizado
# ---------------------------------------------------------------------------


async def test_list_users_responds_401_without_token(client: AsyncClient) -> None:
    # Act: petición sin el encabezado Authorization
    response = await client.get("/api/v1/users/")

    # Assert: 401 y el encabezado que indica cómo autenticarse
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert "detail" in response.json()


async def test_list_users_responds_403_for_operario(
    client: AsyncClient, operario_headers: dict[str, str]
) -> None:
    # Act: sesión válida, pero con rol OPERARIO
    response = await client.get("/api/v1/users/", headers=operario_headers)

    # Assert
    assert response.status_code == 403
    assert response.json() == {
        "detail": "Acceso denegado: se requiere el rol ADMINISTRADOR."
    }


async def test_list_users_responds_200_for_administrador(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Act
    response = await client.get("/api/v1/users/", headers=admin_headers)

    # Assert: código, encabezado y estructura del cuerpo
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    body = response.json()
    assert body["total"] == 2  # admin y operario sembrados en conftest.py
    assert {u["email"] for u in body["items"]} == {
        "admin@casetech.com",
        "operario@casetech.com",
    }


async def test_create_recipe_responds_403_for_operario(
    client: AsyncClient, operario_headers: dict[str, str]
) -> None:
    # Act: el OPERARIO intenta modificar una receta BOM (solo ADMINISTRADOR)
    response = await client.post(
        "/api/v1/recipes/",
        json={"tipo_caseton_id": 2, "material_id": 1, "cantidad_por_unidad": 1.0},
        headers=operario_headers,
    )

    # Assert
    assert response.status_code == 403


async def test_expired_token_responds_401(client: AsyncClient) -> None:
    # Arrange: token vencido hace un minuto (creado por parámetro, sin esperar)
    token = create_access_token(
        {"sub": "admin@casetech.com", "rol": "ADMINISTRADOR"},
        expires_delta=timedelta(minutes=-1),
    )

    # Act
    response = await client.get(
        "/api/v1/users/", headers={"Authorization": f"Bearer {token}"}
    )

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "No se pudieron validar las credenciales."}


async def test_forged_token_responds_401(client: AsyncClient) -> None:
    # Act: un texto que parece token pero no está firmado con la clave del servidor
    response = await client.get(
        "/api/v1/users/", headers={"Authorization": "Bearer abc.def.ghi"}
    )

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Contrato de errores
# ---------------------------------------------------------------------------


async def test_malformed_json_responds_400_with_detail(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: JSON cortado a la mitad
    cuerpo_roto = '{"cliente":'

    # Act
    response = await client.post(
        "/api/v1/orders/",
        content=cuerpo_roto,
        headers={**admin_headers, "Content-Type": "application/json"},
    )

    # Assert: 400 con el formato del contrato, sin la lista interna de Pydantic
    assert response.status_code == 400
    assert response.headers["content-type"] == "application/json"
    assert response.json() == {
        "detail": "El cuerpo de la petición no es un JSON válido."
    }


async def test_wrong_type_still_responds_422_with_field_errors(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: "cantidad" debe ser número
    pedido = {**PEDIDO_VALIDO, "cantidad": "diez"}

    # Act
    response = await client.post("/api/v1/orders/", json=pedido, headers=admin_headers)

    # Assert: los errores de tipo siguen con el 422 y la lista por campo
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "cantidad"]


async def test_not_found_error_does_not_leak_internal_details(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Act
    response = await client.get("/api/v1/orders/9999", headers=admin_headers)

    # Assert: solo el mensaje para la persona, nada de SQL ni de trazas
    assert response.status_code == 404
    texto = response.text.lower()
    for fuga in ("traceback", "select ", "sqlalchemy", "asyncpg", 'file "'):
        assert fuga not in texto
