"""
services/purchase_service.py — Servicio de dominio para el Módulo de Compras e Ingreso de Stock (HU07).

Gestiona de forma transaccional y atómica:
- Validación de proveedores activos.
- Generación de consecutivo CMP-YYYY-XXXXX.
- Inserción de cabecera 'compras' y líneas 'detalle_compras'.
- Bloqueo pesimista (FOR UPDATE) en 'materiales' para incremento seguro de stock.
- Creación de kardex inmutable en 'movimientos_inventario' (tipo 'INGRESO_COMPRA').
- Registro en 'auditoria_acciones'.
- Consultas paginadas y filtradas con resolución de relaciones vía selectinload.
"""

from datetime import date, datetime
from decimal import Decimal
from math import ceil
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditLog
from app.models.material import Material
from app.models.provider import Provider
from app.models.purchase import Purchase
from app.models.purchase_detail import PurchaseDetail
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseItemResponse,
    PurchaseListResponse,
    PurchaseResponse,
)


async def _generate_codigo_compra(db: AsyncSession) -> str:
    """
    Genera el consecutivo único anual de compra con formato CMP-YYYY-XXXXX.
    """
    year = datetime.now().year
    result = await db.execute(
        select(func.count(Purchase.id)).where(
            Purchase.codigo_compra.like(f"CMP-{year}-%")
        )
    )
    count: int = result.scalar_one()
    return f"CMP-{year}-{str(count + 1).zfill(5)}"


def _to_purchase_dto(purchase: Purchase) -> PurchaseResponse:
    """Convierte una entidad ORM Purchase a su DTO enriquecido PurchaseResponse."""
    proveedor_nombre = purchase.proveedor.nombre_empresa if purchase.proveedor else None
    registrado_por_nombre = purchase.registrador.nombre_completo if purchase.registrador else None

    items_dto = []
    if purchase.detalles:
        for d in purchase.detalles:
            mat_nombre = d.material.nombre if d.material else None
            unidad_med = d.material.unidad_medida if d.material else None
            # Asegurar subtotal si aún no ha sido refrescado desde la columna calculada de BD
            subtotal_val = d.subtotal if d.subtotal is not None else (d.cantidad * d.precio_unitario)
            items_dto.append(
                PurchaseItemResponse(
                    id=d.id,
                    compra_id=d.compra_id,
                    material_id=d.material_id,
                    material_nombre=mat_nombre,
                    unidad_medida=unidad_med,
                    cantidad=d.cantidad,
                    precio_unitario=d.precio_unitario,
                    subtotal=subtotal_val,
                )
            )

    return PurchaseResponse(
        id=purchase.id,
        codigo_compra=purchase.codigo_compra,
        proveedor_id=purchase.proveedor_id,
        proveedor_nombre=proveedor_nombre,
        fecha_compra=purchase.fecha_compra,
        total=purchase.total,
        registrado_por=purchase.registrado_por,
        registrado_por_nombre=registrado_por_nombre,
        observaciones=purchase.observaciones,
        items=items_dto,
        created_at=purchase.created_at,
    )


async def create_purchase(
    db: AsyncSession,
    data: PurchaseCreate,
    current_user: User,
) -> PurchaseResponse:
    """
    Registra una nueva orden de compra e ingresa stock atómicamente a inventario.

    Pasos transaccionales:
    1. Valida que el proveedor exista y esté activo.
    2. Genera el consecutivo CMP-YYYY-XXXXX.
    3. Inserta cabecera en 'compras'.
    4. Itera ítems:
       - Valida existencia y estado del material.
       - Bloquea el material con FOR UPDATE.
       - Aplica 'stock_actual += cantidad'.
       - Registra 'movimientos_inventario' (INGRESO_COMPRA).
       - Inserta 'detalle_compras'.
       - Acumula total.
    5. Actualiza total en cabecera y registra en 'auditoria_acciones'.
    6. Commit y retorno del DTO completo.
    """
    # 1. Validar proveedor
    res_prov = await db.execute(select(Provider).where(Provider.id == data.proveedor_id))
    proveedor = res_prov.scalar_one_or_none()

    if not proveedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor con ID {data.proveedor_id} no encontrado.",
        )

    if not proveedor.activo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El proveedor '{proveedor.nombre_empresa}' está inactivo. No se pueden registrar compras.",
        )

    # 2. Generar código consecutivo
    codigo_compra = await _generate_codigo_compra(db)

    # 3. Crear cabecera inicial
    new_purchase = Purchase(
        codigo_compra=codigo_compra,
        proveedor_id=proveedor.id,
        fecha_compra=data.fecha_compra,
        total=Decimal("0.00"),
        registrado_por=current_user.id,
        observaciones=data.observaciones.strip() if data.observaciones else None,
    )
    db.add(new_purchase)
    await db.flush()  # Obtener new_purchase.id

    total_acumulado = Decimal("0.00")
    items_audit = []

    # 4. Procesar líneas de detalle y actualizar inventario atómicamente
    for item in data.items:
        # Bloqueo pesimista del material para consistencia concurrente
        res_mat = await db.execute(
            select(Material).where(Material.id == item.material_id).with_for_update()
        )
        material = res_mat.scalar_one_or_none()

        if not material:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Materia prima con ID {item.material_id} no encontrada.",
            )

        if not material.activo:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La materia prima '{material.nombre}' está inactiva. No se puede abastecer.",
            )

        cant_decimal = Decimal(str(item.cantidad))
        precio_decimal = Decimal(str(item.precio_unitario))
        subtotal_linea = cant_decimal * precio_decimal
        total_acumulado += subtotal_linea

        stock_antes = material.stock_actual
        stock_despues = stock_antes + cant_decimal

        # Actualizar stock físico
        material.stock_actual = stock_despues

        # Registrar movimiento de inventario (Kardex inmutable)
        movimiento = StockMovement(
            material_id=material.id,
            tipo_movimiento="INGRESO_COMPRA",
            cantidad=cant_decimal,
            stock_antes=stock_antes,
            stock_despues=stock_despues,
            referencia_id=new_purchase.id,
            referencia_tipo="COMPRA",
            ejecutado_por=current_user.id,
        )
        db.add(movimiento)

        # Crear línea de detalle
        detalle = PurchaseDetail(
            compra_id=new_purchase.id,
            material_id=material.id,
            cantidad=cant_decimal,
            precio_unitario=precio_decimal,
        )
        db.add(detalle)

        items_audit.append({
            "material_id": material.id,
            "material_nombre": material.nombre,
            "cantidad": float(cant_decimal),
            "precio_unitario": float(precio_decimal),
            "subtotal": float(subtotal_linea),
            "stock_antes": float(stock_antes),
            "stock_despues": float(stock_despues),
        })

    # 5. Actualizar total en cabecera
    new_purchase.total = total_acumulado

    # 6. Registrar en auditoría
    audit_entry = AuditLog(
        usuario_id=current_user.id,
        accion="REGISTRAR_COMPRA",
        entidad="compras",
        entidad_id=new_purchase.id,
        payload_despues={
            "codigo_compra": new_purchase.codigo_compra,
            "proveedor_id": proveedor.id,
            "proveedor_nombre": proveedor.nombre_empresa,
            "fecha_compra": str(new_purchase.fecha_compra),
            "total": float(total_acumulado),
            "items_count": len(data.items),
            "items": items_audit,
        },
    )
    db.add(audit_entry)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error de concurrencia al registrar la orden de compra. Reintente.",
        ) from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al registrar la compra: {str(exc)}",
        ) from exc

    return await get_purchase_by_id(db, new_purchase.id)


async def get_purchases(
    db: AsyncSession,
    proveedor_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    codigo_compra: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> PurchaseListResponse:
    """
    Lista compras con soporte de paginación y filtros avanzados.
    """
    query = (
        select(Purchase)
        .options(
            selectinload(Purchase.proveedor),
            selectinload(Purchase.registrador),
            selectinload(Purchase.detalles).selectinload(PurchaseDetail.material),
        )
        .order_by(Purchase.fecha_compra.desc(), Purchase.id.desc())
    )

    count_query = select(func.count(Purchase.id))

    # Filtros
    if proveedor_id:
        query = query.where(Purchase.proveedor_id == proveedor_id)
        count_query = count_query.where(Purchase.proveedor_id == proveedor_id)

    if fecha_desde:
        query = query.where(Purchase.fecha_compra >= fecha_desde)
        count_query = count_query.where(Purchase.fecha_compra >= fecha_desde)

    if fecha_hasta:
        query = query.where(Purchase.fecha_compra <= fecha_hasta)
        count_query = count_query.where(Purchase.fecha_compra <= fecha_hasta)

    if codigo_compra and codigo_compra.strip():
        search = f"%{codigo_compra.strip().upper()}%"
        query = query.where(Purchase.codigo_compra.ilike(search))
        count_query = count_query.where(Purchase.codigo_compra.ilike(search))

    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    offset = (page - 1) * limit
    paginated_query = query.offset(offset).limit(limit)
    result = await db.execute(paginated_query)
    purchases = result.scalars().all()

    items = [_to_purchase_dto(p) for p in purchases]
    total_pages = ceil(total / limit) if total > 0 else 1

    return PurchaseListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


async def get_purchase_by_id(
    db: AsyncSession,
    purchase_id: int,
) -> PurchaseResponse:
    """
    Obtiene el detalle completo de una orden de compra por su ID con sus líneas y relaciones.
    """
    query = (
        select(Purchase)
        .options(
            selectinload(Purchase.proveedor),
            selectinload(Purchase.registrador),
            selectinload(Purchase.detalles).selectinload(PurchaseDetail.material),
        )
        .where(Purchase.id == purchase_id)
    )
    result = await db.execute(query)
    purchase = result.scalar_one_or_none()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de compra con ID {purchase_id} no encontrada.",
        )

    return _to_purchase_dto(purchase)
