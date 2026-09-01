"""
backend/tests/test_transactions.py — Suite de pruebas de integración para transacciones críticas (Issue #53).

Cubre:
1. Test 1 — Descuento BOM con Stock Insuficiente (HU08):
   - Transición PENDIENTE -> EN_PRODUCCION con déficit de materias primas.
   - Valida HTTP 422 con detalle explícito del déficit y nombre del material faltante.
2. Test 2 — Rechazo de Transición Inválida en Máquina de Estados (HU10):
   - Intento de mutar estados terminales (CANCELADO -> EN_PRODUCCION).
   - Valida HTTP 422 impidiendo la mutación inconsistente.
3. Test 3 — Validación de Regla de Doble Firma en Ajustes de Inventario (HU09):
   - Creación de solicitud de ajuste manual de inventario.
   - Intento de auto-aprobación por parte del mismo usuario solicitante -> HTTP 403 Forbidden.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_start_production_insufficient_stock_returns_422(
    client: AsyncClient,
    admin_headers: dict[str, str],
):
    """
    Test 1: Descuento BOM con Stock Insuficiente (HU08).

    Valida que al intentar iniciar producción (PENDIENTE -> EN_PRODUCCION)
    de un pedido cuya receta BOM demanda más materias primas de las disponibles
    en inventario, el sistema rechace la operación con HTTP 422 e identifique
    con precisión el déficit y el material faltante.
    """
    create_payload = {
        "cliente": "Constructora Los Andes S.A.S.",
        "tipo_caseton_id": 1,
        "cantidad": 10,
        "fecha_entrega_estimada": "2026-12-31",
        "observaciones": "Pedido de prueba para validar bloqueo por stock insuficiente",
    }
    create_res = await client.post(
        "/api/v1/orders/", json=create_payload, headers=admin_headers
    )
    assert create_res.status_code == 201, create_res.text
    order_data = create_res.json()
    order_id = order_data["id"]
    assert order_data["estado"] == "PENDIENTE"

    status_payload = {"estado": "EN_PRODUCCION"}
    patch_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json=status_payload,
        headers=admin_headers,
    )

    assert patch_res.status_code == 422
    error_detail = patch_res.json().get("detail", "")
    assert (
        "stock insuficiente" in error_detail.lower()
        or "insuficiente" in error_detail.lower()
    )
    assert (
        "Listón de Madera 2x2" in error_detail
        or "madera" in error_detail.lower()
        or "déficit" in error_detail.lower()
    )


@pytest.mark.asyncio
async def test_state_machine_rejects_invalid_transitions(
    client: AsyncClient,
    admin_headers: dict[str, str],
):
    """
    Test 2: Rechazo de Transición Inválida en Máquina de Estados (HU10).

    Valida que la máquina de estados rechace transiciones no permitidas
    o modificaciones sobre estados terminales (COMPLETADO o CANCELADO).
    """
    create_payload = {
        "cliente": "Constructora Bolívar S.A.",
        "tipo_caseton_id": 1,
        "cantidad": 1,
        "fecha_entrega_estimada": "2026-12-31",
    }
    create_res = await client.post(
        "/api/v1/orders/", json=create_payload, headers=admin_headers
    )
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    cancel_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"estado": "CANCELADO"},
        headers=admin_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["estado"] == "CANCELADO"

    invalid_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"estado": "EN_PRODUCCION"},
        headers=admin_headers,
    )
    assert invalid_res.status_code == 422
    assert (
        "terminal" in invalid_res.json()["detail"].lower()
        or "no válida" in invalid_res.json()["detail"].lower()
    )

    invalid_res2 = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"estado": "PENDIENTE"},
        headers=admin_headers,
    )
    assert invalid_res2.status_code == 422


@pytest.mark.asyncio
async def test_double_signature_prevents_self_approval(
    client: AsyncClient,
    admin_headers: dict[str, str],
    operario_headers: dict[str, str],
):
    """
    Test 3: Validación de Regla de Doble Firma en Ajustes de Inventario (HU09).

    Valida que un usuario que solicita un ajuste de inventario NO puede
    auto-aprobarlo, retornando HTTP 403 Forbidden por violación de la regla
    de doble firma.
    """
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

    self_review_res = await client.post(
        f"/api/v1/stock-adjustments/{adj_id}/review",
        json={"aprobado": True, "observaciones": "Auto-aprobación no permitida"},
        headers=admin_headers,
    )

    assert self_review_res.status_code == 403
    assert (
        "doble firma" in self_review_res.json()["detail"].lower()
        or "propia solicitud" in self_review_res.json()["detail"].lower()
    )
