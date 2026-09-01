"""
backend/tests/test_endpoints.py — Pruebas de integración para endpoints de HU02, HU06 y HU11.

Cubre:
1. HU11: Previsualización de consumo BOM y cálculo de balance de stock.
2. HU06: Exportación de Kardex a formato CSV descargable (solo Administrador).
3. HU02 / HU14: Gestión administrativa de usuarios (listar, registrar, editar, desactivar).
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
    create_res = await client.post("/api/v1/orders/", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    # 2. Consultar el preview de la receta BOM
    preview_res = await client.get(f"/api/v1/orders/{order_id}/recipe-preview", headers=admin_headers)
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
    operario_res = await client.get("/api/v1/reports/kardex/export-csv", headers=operario_headers)
    assert operario_res.status_code == 403

    # Administrador debe recibir HTTP 200 con content-type text/csv
    admin_res = await client.get("/api/v1/reports/kardex/export-csv", headers=admin_headers)
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
    reg_res = await client.post("/api/v1/auth/register", json=new_user_payload, headers=admin_headers)
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
    del_res = await client.delete(f"/api/v1/auth/users/{new_user_id}", headers=admin_headers)
    assert del_res.status_code == 200

    # Verificar que quedó inactivo
    user_after_del = await client.get("/api/v1/auth/users", headers=admin_headers)
    items = user_after_del.json()["items"]
    deactivated = next(u for u in items if u["id"] == new_user_id)
    assert deactivated["activo"] is False
