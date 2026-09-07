"""
backend/tests/test_endpoints.py — Pruebas de integración para endpoints de HU02, HU06 y HU11.

Cubre:
1. HU11: Previsualización de consumo BOM y cálculo de balance de stock.
2. HU06: Exportación de Kardex a formato CSV descargable (solo Administrador).
3. HU02 / HU14: Gestión administrativa de usuarios (listar, registrar, editar, desactivar).
4. RF12 (Issue #77): Exportación a CSV de Pedidos, Stock Actual y Proveedores.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_recipe_preview_endpoint(
    client: AsyncClient,
    admin_headers: dict[str, str],
):
    """
    HU11: Valida que GET /api/v1/orders/{id}/recipe-preview retorne
    la explosión de materiales y el balance de viabilidad/déficits.
    """
    # 1. Crear un pedido de 10 unidades de Casetón Lona (requiere 15 M2 lona y 40 M madera)
    create_payload = {
        "cliente": "Constructora Bolívar S.A.",
        "tipo_caseton_id": 1,
        "cantidad": 10,
        "fecha_entrega_estimada": "2026-12-31",
    }
    create_res = await client.post(
        "/api/v1/orders/", json=create_payload, headers=admin_headers
    )
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    # 2. Consultar el preview de la receta BOM
    preview_res = await client.get(
        f"/api/v1/orders/{order_id}/recipe-preview", headers=admin_headers
    )
    assert preview_res.status_code == 200
    data = preview_res.json()

    assert data["order_id"] == order_id
    assert data["codigo_pedido"].startswith("PED-")
    assert data["cantidad"] == 10
    # No es viable porque sólo hay 2 M de madera y se requieren 40 M
    assert data["es_viable"] is False
    assert len(data["materiales"]) == 2
    assert len(data["resumen_deficits"]) > 0


@pytest.mark.asyncio
async def test_export_kardex_csv_admin_role_enforced(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    HU06 / RF12: Valida que la exportación de Kardex a CSV esté protegida por rol ADMINISTRADOR.
    """
    # Operario debe recibir HTTP 403 Forbidden
    operario_res = await client.get(
        "/api/v1/reports/kardex/export-csv", headers=operario_headers
    )
    assert operario_res.status_code == 403

    # Administrador debe recibir HTTP 200 con content-type text/csv
    admin_res = await client.get(
        "/api/v1/reports/kardex/export-csv", headers=admin_headers
    )
    assert admin_res.status_code == 200
    assert "text/csv" in admin_res.headers.get("content-type", "")
    assert "ID Movimiento" in admin_res.text


@pytest.mark.asyncio
async def test_user_management_crud_admin_only(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    HU02 / HU14: Valida el ciclo de vida de usuarios (listar, registrar, editar, desactivar).
    """
    # 1. Operario no puede listar usuarios (403)
    unauthorized_list = await client.get("/api/v1/auth/users", headers=operario_headers)
    assert unauthorized_list.status_code == 403

    # 2. Administrador lista usuarios (200)
    list_res = await client.get("/api/v1/auth/users", headers=admin_headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 2

    # 3. Administrador registra nuevo usuario
    new_user_payload = {
        "nombre_completo": "Carlos Operador",
        "email": "carlos.operador@casetech.com",
        "password": "Password123",
        "rol_id": 2,
        "activo": True,
    }
    reg_res = await client.post(
        "/api/v1/auth/register", json=new_user_payload, headers=admin_headers
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    new_user_id = user_data["id"]
    assert user_data["email"] == "carlos.operador@casetech.com"

    # 4. Administrador actualiza el usuario (cambia nombre y rol a admin)
    patch_res = await client.patch(
        f"/api/v1/auth/users/{new_user_id}",
        json={"nombre_completo": "Carlos Supervisor", "rol_id": 1},
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["nombre_completo"] == "Carlos Supervisor"
    assert patch_res.json()["rol_nombre"] == "ADMINISTRADOR"

    # 5. Administrador desactiva el usuario
    del_res = await client.delete(
        f"/api/v1/auth/users/{new_user_id}", headers=admin_headers
    )
    assert del_res.status_code == 200

    # Verificar que quedó inactivo
    user_after_del = await client.get("/api/v1/auth/users", headers=admin_headers)
    items = user_after_del.json()["items"]
    deactivated = next(u for u in items if u["id"] == new_user_id)
    assert deactivated["activo"] is False


@pytest.mark.asyncio
async def test_dashboard_movements_export_csv(
    client: AsyncClient,
    operario_headers: dict[str, str],
):
    """
    HU06 / RF12: Valida que GET /api/v1/dashboard/movements/export-csv sea accesible
    para usuarios autenticados (CurrentUser) y retorne un archivo CSV con las columnas correctas.
    """
    res = await client.get(
        "/api/v1/dashboard/movements/export-csv", headers=operario_headers
    )
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "kardex_movimientos_" in res.headers.get("content-disposition", "")
    assert "ID" in res.text
    assert "Tipo de Movimiento" in res.text
    assert "Material / Insumo" in res.text


@pytest.mark.asyncio
async def test_dashboard_audit_logs_export_csv(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    HU06 / RF12: Valida que GET /api/v1/dashboard/audit-logs/export-csv requiera rol ADMINISTRADOR
    y retorne la bitácora en CSV con encabezados estándar.
    """
    # Operario debe recibir 403 Forbidden
    op_res = await client.get(
        "/api/v1/dashboard/audit-logs/export-csv", headers=operario_headers
    )
    assert op_res.status_code == 403

    # Administrador debe recibir 200 OK con text/csv
    admin_res = await client.get(
        "/api/v1/dashboard/audit-logs/export-csv", headers=admin_headers
    )
    assert admin_res.status_code == 200
    assert "text/csv" in admin_res.headers.get("content-type", "")
    assert "bitacora_auditoria_" in admin_res.headers.get("content-disposition", "")
    assert "Acción" in admin_res.text
    assert "Entidad Afectada" in admin_res.text


@pytest.mark.asyncio
async def test_export_orders_csv_admin_role_enforced(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    R01 / RF12 (Issue #77): Valida que la exportación de Pedidos a CSV esté
    protegida por rol ADMINISTRADOR y retorne las columnas esperadas.
    """
    op_res = await client.get(
        "/api/v1/reports/orders/export-csv", headers=operario_headers
    )
    assert op_res.status_code == 403

    admin_res = await client.get(
        "/api/v1/reports/orders/export-csv", headers=admin_headers
    )
    assert admin_res.status_code == 200
    assert "text/csv" in admin_res.headers.get("content-type", "")
    assert "pedidos_casetech_" in admin_res.headers.get("content-disposition", "")
    assert "Código Pedido" in admin_res.text
    assert "Cliente" in admin_res.text


@pytest.mark.asyncio
async def test_export_materials_csv_stock_classification(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    R04 / RF12 (Issue #77): Valida que la exportación de Stock Actual a CSV esté
    protegida por rol ADMINISTRADOR y clasifique correctamente el material con
    stock bajo el mínimo sembrado en conftest (madera: stock_actual=2, stock_minimo=10).
    """
    op_res = await client.get(
        "/api/v1/reports/materials/export-csv", headers=operario_headers
    )
    assert op_res.status_code == 403

    admin_res = await client.get(
        "/api/v1/reports/materials/export-csv", headers=admin_headers
    )
    assert admin_res.status_code == 200
    assert "text/csv" in admin_res.headers.get("content-type", "")
    assert "stock_actual_casetech_" in admin_res.headers.get("content-disposition", "")
    assert "Estado Stock" in admin_res.text
    # Listón de Madera: stock_actual=2.000 <= 50% de stock_minimo=10.000 -> CRITICO
    assert "Listón de Madera 2x2;M;2.000;10.000;CRITICO" in admin_res.text

    critico_res = await client.get(
        "/api/v1/reports/materials/export-csv?estado_stock=CRITICO",
        headers=admin_headers,
    )
    assert "Lona Impermeable 600D" not in critico_res.text
    assert "Listón de Madera 2x2" in critico_res.text


@pytest.mark.asyncio
async def test_export_providers_csv_admin_role_enforced(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    R05 / RF12 (Issue #77): Valida que la exportación de Proveedores a CSV esté
    protegida por rol ADMINISTRADOR y retorne las columnas esperadas.
    """
    op_res = await client.get(
        "/api/v1/reports/providers/export-csv", headers=operario_headers
    )
    assert op_res.status_code == 403

    admin_res = await client.get(
        "/api/v1/reports/providers/export-csv", headers=admin_headers
    )
    assert admin_res.status_code == 200
    assert "text/csv" in admin_res.headers.get("content-type", "")
    assert "proveedores_casetech_" in admin_res.headers.get("content-disposition", "")
    assert "NIT" in admin_res.text
    assert "Nombre Empresa" in admin_res.text


@pytest.mark.asyncio
async def test_recipe_crud_admin_only(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    Issue #88: Valida el ciclo de vida completo de administración de recetas
    BOM (crear, listar, editar, eliminar), restringido a ADMINISTRADOR.
    """
    # 1. Operario no puede crear recetas (403)
    op_res = await client.post(
        "/api/v1/recipes/",
        json={"tipo_caseton_id": 1, "material_id": 1, "cantidad_por_unidad": 3.0},
        headers=operario_headers,
    )
    assert op_res.status_code == 403

    # 2. Administrador crea una receta nueva (material_id=1 "Lona" aún no
    #    tiene receta para tipo_caseton_id=1 en el seed de conftest — sí
    #    existen las de material_id=1 y 2, así que probamos con un tercer
    #    material simulado vía el mismo material_id=2 en otra combinación)
    create_res = await client.post(
        "/api/v1/recipes/",
        json={"tipo_caseton_id": 1, "material_id": 1, "cantidad_por_unidad": 99.0},
        headers=admin_headers,
    )
    # Ya existe (sembrada en conftest) -> 409 esperado
    assert create_res.status_code == 409

    # 3. Listar recetas del tipo 1 (ya vienen sembradas 2 en conftest)
    list_res = await client.get(
        "/api/v1/recipes/?tipo_caseton_id=1", headers=admin_headers
    )
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] == 2
    recipe_id = data["items"][0]["id"]

    # 4. Administrador actualiza la cantidad de una receta existente
    update_res = await client.put(
        f"/api/v1/recipes/{recipe_id}",
        json={"cantidad_por_unidad": 7.5},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["cantidad_por_unidad"]) == 7.5

    # 5. Operario no puede eliminar recetas (403)
    op_del_res = await client.delete(
        f"/api/v1/recipes/{recipe_id}", headers=operario_headers
    )
    assert op_del_res.status_code == 403

    # 6. Administrador elimina la receta
    del_res = await client.delete(
        f"/api/v1/recipes/{recipe_id}", headers=admin_headers
    )
    assert del_res.status_code == 204

    # 7. Ya no aparece en el listado
    list_after = await client.get(
        "/api/v1/recipes/?tipo_caseton_id=1", headers=admin_headers
    )
    assert list_after.json()["total"] == 1
