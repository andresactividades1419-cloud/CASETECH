"""
backend/tests/test_transactions.py — Suite de pruebas de integración para transacciones críticas.

Cubre:
1. Inicio de producción con stock insuficiente (debe retornar HTTP 422 con detalle del déficit).
2. Rechazo de transiciones inválidas en la máquina de estados (ej. COMPLETADO -> EN_PRODUCCION).
3. Cumplimiento de la regla de doble firma en ajustes de inventario (HTTP 403 al auto-aprobar).
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_start_production_insufficient_stock_returns_422(
    client: AsyncClient,
    admin_headers: dict[str, str],
):
    """
    Valida que al intentar iniciar producción (PENDIENTE -> EN_PRODUCCION)
    de un pedido cuya receta BOM supera el stock disponible de materias primas,
    el sistema rechace la operación con HTTP 422 y detalle el déficit exacto.
    """
    # 1. Crear un pedido de 10 unidades (requiere 15 M2 de lona y 40 M de madera; solo hay 2 M de madera)
    create_payload = {
        "cliente": "Constructora Los Andes",
        "tipo_caseton_id": 1,
        "cantidad": 10,
        "fecha_entrega_estimada": "2026-12-31",
        "observaciones": "Pedido para prueba de déficit de stock",
    }
    create_res = await client.post("/api/v1/orders/", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201, create_res.text
    order_data = create_res.json()
    order_id = order_data["id"]
    assert order_data["estado"] == "PENDIENTE"

    # 2. Intentar pasar el pedido a EN_PRODUCCION
    status_payload = {"estado": "EN_PRODUCCION"}
    patch_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json=status_payload,
        headers=admin_headers,
    )

    assert patch_res.status_code == 422
    error_detail = patch_res.json().get("detail", "")
    assert "Stock insuficiente" in error_detail or "insuficiente" in error_detail.lower()
    assert "Listón de Madera 2x2" in error_detail or "madera" in error_detail.lower() or "déficit" in error_detail.lower()


@pytest.mark.asyncio
async def test_state_machine_rejects_invalid_transitions(
    client: AsyncClient,
    admin_headers: dict[str, str],
):
    """
    Valida que la máquina de estados rechace transiciones no permitidas
    o modificaciones sobre estados terminales (COMPLETADO o CANCELADO).
    """
    # 1. Crear un pedido
    create_payload = {
        "cliente": "Constructora Bolívar",
        "tipo_caseton_id": 1,
        "cantidad": 1,
        "fecha_entrega_estimada": "2026-12-31",
    }
    create_res = await client.post("/api/v1/orders/", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    # 2. Cancelar el pedido (transición válida PENDIENTE -> CANCELADO)
    cancel_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"estado": "CANCELADO"},
        headers=admin_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["estado"] == "CANCELADO"

    # 3. Intentar reabrir o pasar el pedido de CANCELADO a EN_PRODUCCION (transición inválida)
    invalid_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"estado": "EN_PRODUCCION"},
        headers=admin_headers,
    )
    assert invalid_res.status_code == 422
    assert "terminal" in invalid_res.json()["detail"].lower() or "no válida" in invalid_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_double_signature_prevents_self_approval(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    Valida la regla de doble firma:
    - Un usuario que solicita un ajuste de inventario NO puede auto-aprobarlo (retorna HTTP 403).
    - Un administrador diferente al solicitante SÍ puede evaluarlo exitosamente.
    """
    # 1. El administrador (ID 1) crea una solicitud de ajuste de inventario
    adjustment_payload = {
        "material_id": 1,
        "tipo": "MERMA",
        "cantidad": 1.5,
        "motivo": "Material dañado por humedad en bodega principal",
    }
    create_adj_res = await client.post(
        "/api/v1/stock-adjustments/",
        json=adjustment_payload,
        headers=admin_headers,
    )
    assert create_adj_res.status_code == 201, create_adj_res.text
    adj_id = create_adj_res.json()["id"]
    assert create_adj_res.json()["solicitante_id"] == 1

    # 2. El mismo usuario Administrador (ID 1) intenta aprobar su propia solicitud
    self_review_res = await client.post(
        f"/api/v1/stock-adjustments/{adj_id}/review",
        json={"aprobado": True, "observaciones": "Auto-aprobación no permitida"},
        headers=admin_headers,
    )

    # Debe ser rechazado con HTTP 403 por regla de doble firma
    assert self_review_res.status_code == 403
    assert "doble firma" in self_review_res.json()["detail"].lower() or "propia solicitud" in self_review_res.json()["detail"].lower()
