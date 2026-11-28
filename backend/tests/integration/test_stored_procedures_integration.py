"""
Stored Procedures del motor BOM contra PostgreSQL real (issue #123).

Bootcamp de testing, semana 6 — capa BD.

¿Qué? Ejecuta por el API los procedimientos REALES sp_descontar_receta (iniciar
      producción) y sp_revertir_receta (cancelar un pedido en producción), y revisa
      el resultado en la BD: stock de cada material, kardex y estado del pedido.
¿Para qué? Los tests de siempre corren en SQLite, que no tiene Stored Procedures:
           ahí se ejecuta una copia en Python (ramas `is_sqlite` de order_service).
           Hasta hoy ningún test ejecutaba los procedimientos de verdad.
¿Impacto? Si alguien cambia un procedimiento con una migración nueva y rompe el
          descuento, la atomicidad o la reversión, estos tests fallan.
"""

import uuid
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.models.order import Order
from app.models.product_type import ProductType
from app.models.recipe import Recipe
from app.models.stock_movement import StockMovement


async def _crear_receta(
    pg_session: AsyncSession, materiales: list[tuple[str, str]]
) -> tuple[ProductType, list[Material]]:
    """
    Crea un tipo de casetón propio con su receta.

    `materiales` es una lista de (stock_inicial, cantidad_por_unidad). Cada test
    arma su receta: no depende de los 3 tipos ni de los materiales que siembran
    las migraciones, ni de sus ids.
    """
    codigo = uuid.uuid4().hex[:8]
    tipo = ProductType(nombre=f"Casetón BOM {codigo}")
    pg_session.add(tipo)
    creados = []
    for posicion, (stock, _) in enumerate(materiales):
        material = Material(
            nombre=f"Material BOM {codigo} {posicion}",
            unidad_medida="kg",
            stock_actual=Decimal(stock),
        )
        pg_session.add(material)
        creados.append(material)
    await pg_session.flush()
    for material, (_, por_unidad) in zip(creados, materiales, strict=True):
        pg_session.add(
            Recipe(
                tipo_caseton_id=tipo.id,
                material_id=material.id,
                cantidad_por_unidad=Decimal(por_unidad),
            )
        )
    # commit: un rollback del servicio (p. ej. por stock insuficiente) no debe
    # borrar la receta. El rollback del fixture al final la borra igual.
    await pg_session.commit()
    return tipo, creados


async def _crear_pedido(
    pg_client: AsyncClient, headers: dict[str, str], tipo_id: int, cantidad: int
) -> int:
    response = await pg_client.post(
        "/api/v1/orders/",
        json={
            "cliente": "Constructora BOM",
            "tipo_caseton_id": tipo_id,
            "cantidad": cantidad,
            "fecha_entrega_estimada": "2099-12-31",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _cambiar_estado(
    pg_client: AsyncClient, headers: dict[str, str], pedido_id: int, estado: str
):
    return await pg_client.patch(
        f"/api/v1/orders/{pedido_id}/status", json={"estado": estado}, headers=headers
    )


async def _stock(pg_session: AsyncSession, material: Material) -> Decimal:
    # refresh: relee la fila de la BD (el procedimiento la cambió por SQL, no por el ORM)
    await pg_session.refresh(material)
    return material.stock_actual


async def _movimientos(pg_session: AsyncSession, pedido_id: int) -> list[StockMovement]:
    # Kardex del pedido: referencia_tipo filtra para no mezclar con compras o
    # ajustes que tengan el mismo número de id.
    result = await pg_session.execute(
        select(StockMovement)
        .where(
            StockMovement.referencia_id == pedido_id,
            StockMovement.referencia_tipo == "PEDIDO",
        )
        .order_by(StockMovement.id)
    )
    return list(result.scalars().all())


async def _estado(pg_session: AsyncSession, pedido_id: int) -> str:
    # Lee la columna directo de la BD (el procedimiento la cambió por SQL).
    result = await pg_session.execute(select(Order.estado).where(Order.id == pedido_id))
    return result.scalar_one()


async def test_start_production_discounts_each_recipe_material_and_records_the_kardex(
    pg_client: AsyncClient, pg_session: AsyncSession, pg_admin_headers: dict[str, str]
):
    # Arrange: receta de 2 materiales — 2.5 kg y 1 kg por unidad; pedido de 10 unidades
    tipo, (arena, cemento) = await _crear_receta(
        pg_session, [("100.000", "2.5000"), ("50.000", "1.0000")]
    )
    pedido_id = await _crear_pedido(pg_client, pg_admin_headers, tipo.id, cantidad=10)

    # Act: iniciar producción ejecuta CALL sp_descontar_receta(...)
    response = await _cambiar_estado(
        pg_client, pg_admin_headers, pedido_id, "EN_PRODUCCION"
    )

    # Assert: respuesta, stock descontado, kardex y estado — todo verificado en la BD
    assert response.status_code == 200
    assert await _stock(pg_session, arena) == Decimal("75.000")  # 100 - 2.5 × 10
    assert await _stock(pg_session, cemento) == Decimal("40.000")  # 50 - 1 × 10

    # Un movimiento por material, con el stock de antes y de después
    movimientos = sorted(
        await _movimientos(pg_session, pedido_id), key=lambda m: m.material_id
    )
    assert [
        (m.tipo_movimiento, m.cantidad, m.stock_antes, m.stock_despues)
        for m in movimientos
    ] == [
        (
            "DESCUENTO_PRODUCCION",
            Decimal("25.000"),
            Decimal("100.000"),
            Decimal("75.000"),
        ),
        (
            "DESCUENTO_PRODUCCION",
            Decimal("10.000"),
            Decimal("50.000"),
            Decimal("40.000"),
        ),
    ]
    assert await _estado(pg_session, pedido_id) == "EN_PRODUCCION"


async def test_start_production_responds_422_and_discounts_nothing_when_one_material_is_short(
    pg_client: AsyncClient, pg_session: AsyncSession, pg_admin_headers: dict[str, str]
):
    # Arrange: el PRIMER material alcanza (100 ≥ 20); el SEGUNDO no (5 < 10).
    # El procedimiento recorre la receta por material_id: descuenta el primero
    # antes de descubrir que falta el segundo.
    tipo, (alcanza, falta) = await _crear_receta(
        pg_session, [("100.000", "2.0000"), ("5.000", "1.0000")]
    )
    pedido_id = await _crear_pedido(pg_client, pg_admin_headers, tipo.id, cantidad=10)

    # Act
    response = await _cambiar_estado(
        pg_client, pg_admin_headers, pedido_id, "EN_PRODUCCION"
    )

    # Assert: 422 con el déficit (no un 500 como en el issue #96)...
    assert response.status_code == 422
    assert "Stock insuficiente" in response.json()["detail"]

    # ...y ATOMICIDAD: el descuento del primer material también se deshizo
    assert await _stock(pg_session, alcanza) == Decimal("100.000")
    assert await _stock(pg_session, falta) == Decimal("5.000")
    assert await _movimientos(pg_session, pedido_id) == []
    assert await _estado(pg_session, pedido_id) == "PENDIENTE"


async def test_cancel_order_in_production_returns_the_materials_to_stock(
    pg_client: AsyncClient, pg_session: AsyncSession, pg_admin_headers: dict[str, str]
):
    # Arrange: un pedido ya en producción (stock 80 → 8 con 7.2 kg × 10 unidades)
    tipo, (icopor,) = await _crear_receta(pg_session, [("80.000", "7.2000")])
    pedido_id = await _crear_pedido(pg_client, pg_admin_headers, tipo.id, cantidad=10)
    inicio = await _cambiar_estado(
        pg_client, pg_admin_headers, pedido_id, "EN_PRODUCCION"
    )
    assert inicio.status_code == 200
    assert await _stock(pg_session, icopor) == Decimal("8.000")

    # Act: cancelar ejecuta CALL sp_revertir_receta(...)
    response = await _cambiar_estado(
        pg_client, pg_admin_headers, pedido_id, "CANCELADO"
    )

    # Assert: el material volvió completo y quedó la devolución en el kardex
    assert response.status_code == 200
    assert await _stock(pg_session, icopor) == Decimal("80.000")
    tipos = [m.tipo_movimiento for m in await _movimientos(pg_session, pedido_id)]
    assert tipos == ["DESCUENTO_PRODUCCION", "DEVOLUCION_CANCELACION"]
    assert await _estado(pg_session, pedido_id) == "CANCELADO"
