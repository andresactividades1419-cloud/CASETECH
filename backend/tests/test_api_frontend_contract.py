"""
Tests de API desde el ángulo del frontend (bootcamp semana 4, capa Front).

Verifican que los endpoints que llaman las pantallas de React devuelvan
EXACTAMENTE los campos que la interfaz lee (MaterialsPage, ProvidersPage,
DashboardPage, AdjustmentsPage, PurchaseModal) y que los errores lleguen en el
formato que muestran los avisos: {"detail": "<texto>"}. Las peticiones se arman
igual que en frontend/src/api/*.js. La BD es SQLite en memoria (conftest.py).
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider import Provider


async def _crear_proveedor(db_session: AsyncSession) -> Provider:
    # En SQLite no existe sp_crear_proveedor (vive en PostgreSQL), así que el
    # proveedor de prueba se inserta directo con el modelo.
    proveedor = Provider(
        nit="900123456-7",
        nombre_empresa="Aceros del Valle S.A.S.",
        contacto_nombre="Laura Gómez",
        contacto_telefono="3001234567",
        direccion="Cali",
        activo=True,
    )
    db_session.add(proveedor)
    await db_session.commit()
    await db_session.refresh(proveedor)
    return proveedor


async def test_materials_list_has_the_fields_materials_page_reads(
    client: AsyncClient, operario_headers: dict[str, str]
) -> None:
    # Act: misma llamada que materialsApi.getMaterials()
    response = await client.get("/api/v1/materials/", headers=operario_headers)

    # Assert: código, encabezado y los campos que usa MaterialsPage.jsx
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    body = response.json()
    assert body["total"] == 2
    material = body["items"][0]
    for campo in (
        "id",
        "nombre",
        "unidad_medida",
        "stock_actual",
        "stock_minimo",
        "activo",
    ):
        assert campo in material


async def test_duplicate_material_name_returns_409_with_text_detail(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: mismo payload que arma materialsApi.createMaterial()
    payload = {
        "nombre": "Lona Impermeable 600D",  # ya existe en los datos semilla
        "unidad_medida": "m2",
        "stock_actual": 1,
        "stock_minimo": 1,
    }

    # Act
    response = await client.post(
        "/api/v1/materials/", json=payload, headers=admin_headers
    )

    # Assert: el aviso de la pantalla muestra err.response.data.detail como texto
    assert response.status_code == 409
    assert response.json() == {
        "detail": "Ya existe un material con el nombre 'Lona Impermeable 600D'."
    }


async def test_providers_list_has_the_fields_providers_page_reads(
    client: AsyncClient,
    db_session: AsyncSession,
    operario_headers: dict[str, str],
) -> None:
    # Arrange
    await _crear_proveedor(db_session)

    # Act: misma llamada que providersApi.getProviders()
    response = await client.get("/api/v1/providers/", headers=operario_headers)

    # Assert: los campos de la tabla de ProvidersPage.jsx
    assert response.status_code == 200
    proveedor = response.json()["items"][0]
    assert proveedor["nit"] == "900123456-7"
    assert proveedor["nombre_empresa"] == "Aceros del Valle S.A.S."
    for campo in ("id", "contacto_nombre", "contacto_telefono", "direccion", "activo"):
        assert campo in proveedor


async def test_dashboard_metrics_have_the_kpis_dashboard_page_reads(
    client: AsyncClient, operario_headers: dict[str, str]
) -> None:
    # Act: misma llamada que dashboardApi.getDashboardMetrics()
    response = await client.get("/api/v1/dashboard/metrics", headers=operario_headers)

    # Assert: DashboardPage.jsx lee estas claves de "kpis" y "produccion_por_tipo"
    assert response.status_code == 200
    body = response.json()
    for kpi in (
        "total_pedidos",
        "pedidos_en_produccion",
        "compras_mes_cop",
        "materiales_alerta_stock",
    ):
        assert kpi in body["kpis"]
    # El Listón de Madera semilla tiene 2.0 de stock y mínimo 10.0: está en alerta
    assert body["kpis"]["materiales_alerta_stock"] == 1
    tipo = body["produccion_por_tipo"][0]
    assert set(tipo) >= {"tipo_caseton", "total_unidades", "total_pedidos"}


async def test_adjustment_request_returns_201_pending_with_names_for_the_table(
    client: AsyncClient, operario_headers: dict[str, str]
) -> None:
    # Arrange: mismo payload que adjustmentsApi.createAdjustment()
    payload = {
        "material_id": 1,
        "tipo": "MERMA",
        "cantidad": 2,
        "motivo": "Lona rota durante el traslado a planta",
    }

    # Act
    response = await client.post(
        "/api/v1/stock-adjustments/", json=payload, headers=operario_headers
    )

    # Assert: queda pendiente de la doble firma y trae los nombres que muestra la tabla
    assert response.status_code == 201
    ajuste = response.json()
    assert ajuste["estado"] == "PENDIENTE"
    assert ajuste["material_nombre"] == "Lona Impermeable 600D"
    assert ajuste["solicitante_nombre"] == "Operario Test"
    assert ajuste["stock_despues"] is None  # el stock no cambia hasta aprobarlo


async def test_purchase_returns_201_and_increases_material_stock(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_headers: dict[str, str],
) -> None:
    # Arrange: proveedor existente y mismo payload que purchasesApi.createPurchase()
    proveedor_id = (await _crear_proveedor(db_session)).id
    # Los datos semilla de conftest.py dejan el stock en memoria como float;
    # expire_all() obliga a releerlo de la BD como Decimal, igual que en producción.
    db_session.expire_all()
    payload = {
        "proveedor_id": proveedor_id,
        "fecha_compra": "2026-01-15",
        "items": [{"material_id": 1, "cantidad": 5, "precio_unitario": 12000}],
        "observaciones": None,
    }

    # Act
    response = await client.post(
        "/api/v1/purchases/", json=payload, headers=admin_headers
    )
    material = await client.get("/api/v1/materials/1", headers=admin_headers)

    # Assert: la compra trae lo que muestra PurchaseDetailModal y el stock subió de 10 a 15
    assert response.status_code == 201
    compra = response.json()
    assert compra["codigo_compra"]
    assert float(compra["total"]) == 60000
    assert compra["items"][0]["material_nombre"] == "Lona Impermeable 600D"
    assert float(material.json()["stock_actual"]) == 15


async def test_provider_db_failure_returns_500_without_database_internals(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    # Arrange: en SQLite el CALL a sp_crear_proveedor falla, igual que fallaría
    # un error inesperado de la BD en PostgreSQL
    payload = {
        "nit": "900123456-7",
        "nombre_empresa": "Aceros del Valle S.A.S.",
        "contacto_nombre": "Laura Gómez",
        "contacto_telefono": "3001234567",
        "contacto_email": None,
        "direccion": "Cali",
    }

    # Act
    response = await client.post(
        "/api/v1/providers/", json=payload, headers=admin_headers
    )

    # Assert: mensaje genérico para la persona; nada de SQL ni nombres internos
    assert response.status_code == 500
    detalle = response.json()["detail"]
    assert "No se pudo registrar el proveedor" in detalle
    for fuga in ("CALL", "sp_crear_proveedor", "syntax", "procedimiento almacenado"):
        assert fuga not in detalle
