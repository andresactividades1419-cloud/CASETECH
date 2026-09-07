"""
api/v1/endpoints/reports.py — Endpoints REST para generación y exportación de reportes (HU06, RF12).

Provee los 5 reportes operativos exigidos por RF12, todos exclusivos para ADMINISTRADOR:
- GET /api/v1/reports/kardex/export-csv        → R02: Consumo/movimientos de materiales.
- GET /api/v1/reports/orders/export-csv        → R01: Historial de Pedidos.
- GET /api/v1/reports/materials/export-csv     → R04: Stock Actual con indicador de alerta.
- GET /api/v1/reports/providers/export-csv     → R05: Proveedores Activos.

(R03 — Auditoría de Ajustes — se cubre con /api/v1/dashboard/audit-logs/export-csv
filtrando por entidad=ajustes_inventario.)
"""

import csv
import io
from datetime import date, datetime

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DBSession
from app.models.material import Material
from app.models.order import Order
from app.models.product_type import ProductType
from app.models.provider import Provider
from app.models.stock_movement import StockMovement

router = APIRouter()


@router.get(
    "/kardex/export-csv",
    summary="Exportar historial de Kardex a CSV (HU06, RF12)",
    description=(
        "Genera y retorna un archivo CSV descargable con el historial inmutable de movimientos de inventario "
        "con sus respectivos snapshots de stock antes/después y usuario ejecutor. "
        "**Exclusivo para rol ADMINISTRADOR.**"
    ),
    responses={
        200: {
            "description": "Archivo CSV descargable con el historial de Kardex.",
            "content": {"text/csv": {}},
        },
        401: {"description": "No autenticado."},
        403: {"description": "Acceso denegado: se requiere el rol ADMINISTRADOR."},
    },
)
async def export_kardex_csv(
    db: DBSession,
    _admin_user: AdminUser,
    tipo_movimiento: str | None = Query(
        None, description="Filtrar por tipo de movimiento"
    ),
    material_id: int | None = Query(
        None, description="Filtrar por materia prima", gt=0
    ),
    fecha_desde: date | None = Query(None, description="Fecha mínima (YYYY-MM-DD)"),
    fecha_hasta: date | None = Query(None, description="Fecha máxima (YYYY-MM-DD)"),
) -> StreamingResponse:
    """
    Construye el reporte CSV del Kardex de inventario y lo transmite como stream de descarga.
    """
    query = (
        select(StockMovement)
        .options(
            selectinload(StockMovement.material),
            selectinload(StockMovement.ejecutor),
        )
        .order_by(StockMovement.created_at.desc())
    )

    if tipo_movimiento and tipo_movimiento != "TODOS":
        query = query.where(StockMovement.tipo_movimiento == tipo_movimiento)

    if material_id:
        query = query.where(StockMovement.material_id == material_id)

    if fecha_desde:
        query = query.where(
            StockMovement.created_at
            >= datetime.combine(fecha_desde, datetime.min.time())
        )

    if fecha_hasta:
        query = query.where(
            StockMovement.created_at
            <= datetime.combine(fecha_hasta, datetime.max.time())
        )

    result = await db.execute(query)
    movements = result.scalars().all()

    # Generar CSV en memoria
    output = io.StringIO()
    # Escribir BOM UTF-8 para apertura correcta en Excel
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    # Encabezados
    writer.writerow(
        [
            "ID Movimiento",
            "Fecha y Hora (UTC)",
            "Materia Prima",
            "Unidad Medida",
            "Tipo Movimiento",
            "Cantidad",
            "Stock Antes",
            "Stock Después",
            "Tipo Referencia",
            "ID Referencia",
            "Ejecutado Por",
        ]
    )

    for mov in movements:
        mat_nombre = mov.material.nombre if mov.material else f"ID #{mov.material_id}"
        unidad = mov.material.unidad_medida if mov.material else "UND"
        ejecutor = mov.ejecutor.nombre_completo if mov.ejecutor else "Sistema"
        fecha_str = (
            mov.created_at.strftime("%Y-%m-%d %H:%M:%S") if mov.created_at else ""
        )

        writer.writerow(
            [
                mov.id,
                fecha_str,
                mat_nombre,
                unidad,
                mov.tipo_movimiento,
                f"{float(mov.cantidad):.3f}",
                f"{float(mov.stock_antes):.3f}",
                f"{float(mov.stock_despues):.3f}",
                mov.referencia_tipo or "N/A",
                mov.referencia_id or "N/A",
                ejecutor,
            ]
        )

    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"kardex_casetech_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get(
    "/orders/export-csv",
    summary="Exportar historial de Pedidos a CSV (R01, RF12)",
    description=(
        "Genera un archivo CSV con el historial de pedidos de producción: cliente, tipo de "
        "casetón, cantidad, estado y fechas. **Exclusivo para rol ADMINISTRADOR.**"
    ),
    responses={
        200: {
            "description": "Archivo CSV descargable con el historial de pedidos.",
            "content": {"text/csv": {}},
        },
        401: {"description": "No autenticado."},
        403: {"description": "Acceso denegado: se requiere el rol ADMINISTRADOR."},
    },
)
async def export_orders_csv(
    db: DBSession,
    _admin_user: AdminUser,
    estado: str | None = Query(None, description="Filtrar por estado del pedido"),
    cliente: str | None = Query(None, description="Filtrar por nombre de cliente"),
    fecha_desde: date | None = Query(
        None, description="Fecha mínima de creación (YYYY-MM-DD)"
    ),
    fecha_hasta: date | None = Query(
        None, description="Fecha máxima de creación (YYYY-MM-DD)"
    ),
) -> StreamingResponse:
    """Construye el reporte CSV del historial de pedidos y lo transmite como stream de descarga."""
    query = select(Order, ProductType.nombre.label("tipo_caseton_nombre")).outerjoin(
        ProductType, Order.tipo_caseton_id == ProductType.id
    )

    if estado:
        query = query.where(Order.estado == estado.upper())
    if cliente:
        query = query.where(Order.cliente.ilike(f"%{cliente.strip()}%"))
    if fecha_desde:
        query = query.where(
            Order.created_at >= datetime.combine(fecha_desde, datetime.min.time())
        )
    if fecha_hasta:
        query = query.where(
            Order.created_at <= datetime.combine(fecha_hasta, datetime.max.time())
        )

    query = query.order_by(Order.created_at.desc())
    rows = (await db.execute(query)).all()

    output = io.StringIO()
    output.write("﻿")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow(
        [
            "Código Pedido",
            "Cliente",
            "Tipo Casetón",
            "Cantidad",
            "Estado",
            "Fecha Entrega Estimada",
            "Fecha Creación",
        ]
    )

    for order_obj, tipo_nombre in rows:
        writer.writerow(
            [
                order_obj.codigo_pedido,
                order_obj.cliente,
                tipo_nombre or f"ID #{order_obj.tipo_caseton_id}",
                order_obj.cantidad,
                order_obj.estado,
                order_obj.fecha_entrega_estimada.strftime("%Y-%m-%d"),
                order_obj.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if order_obj.created_at
                else "",
            ]
        )

    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"pedidos_casetech_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get(
    "/materials/export-csv",
    summary="Exportar Stock Actual a CSV (R04, RF12)",
    description=(
        "Genera un archivo CSV con el snapshot actual del inventario de materias primas, "
        "incluyendo el indicador de alerta de stock (CRÍTICO/BAJO/NORMAL). "
        "**Exclusivo para rol ADMINISTRADOR.**\n\n"
        "CRÍTICO: stock_actual <= 50% del stock_minimo. "
        "BAJO: stock_actual <= stock_minimo. NORMAL: por encima del stock_minimo."
    ),
    responses={
        200: {
            "description": "Archivo CSV descargable con el stock actual.",
            "content": {"text/csv": {}},
        },
        401: {"description": "No autenticado."},
        403: {"description": "Acceso denegado: se requiere el rol ADMINISTRADOR."},
    },
)
async def export_materials_csv(
    db: DBSession,
    _admin_user: AdminUser,
    estado_stock: str | None = Query(
        None, description="Filtrar por CRITICO, BAJO o NORMAL"
    ),
) -> StreamingResponse:
    """Construye el reporte CSV de stock actual y lo transmite como stream de descarga."""
    query = select(Material).order_by(Material.nombre)
    materials = (await db.execute(query)).scalars().all()

    def clasificar(mat: Material) -> str:
        stock_actual = float(mat.stock_actual)
        stock_minimo = float(mat.stock_minimo)
        if stock_actual <= stock_minimo * 0.5:
            return "CRITICO"
        if stock_actual <= stock_minimo:
            return "BAJO"
        return "NORMAL"

    output = io.StringIO()
    output.write("﻿")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow(
        [
            "ID",
            "Nombre",
            "Unidad Medida",
            "Stock Actual",
            "Stock Mínimo",
            "Estado Stock",
            "Activo",
        ]
    )

    for mat in materials:
        estado = clasificar(mat)
        if estado_stock and estado != estado_stock.upper():
            continue
        writer.writerow(
            [
                mat.id,
                mat.nombre,
                mat.unidad_medida,
                f"{float(mat.stock_actual):.3f}",
                f"{float(mat.stock_minimo):.3f}",
                estado,
                "SI" if mat.activo else "NO",
            ]
        )

    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"stock_actual_casetech_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get(
    "/providers/export-csv",
    summary="Exportar directorio de Proveedores a CSV (R05, RF12)",
    description=(
        "Genera un archivo CSV con el directorio de proveedores y sus datos de contacto. "
        "**Exclusivo para rol ADMINISTRADOR.**"
    ),
    responses={
        200: {
            "description": "Archivo CSV descargable con el directorio de proveedores.",
            "content": {"text/csv": {}},
        },
        401: {"description": "No autenticado."},
        403: {"description": "Acceso denegado: se requiere el rol ADMINISTRADOR."},
    },
)
async def export_providers_csv(
    db: DBSession,
    _admin_user: AdminUser,
    activo: bool | None = Query(
        None, description="Filtrar por proveedores activos (true) o inactivos (false)"
    ),
) -> StreamingResponse:
    """Construye el reporte CSV del directorio de proveedores y lo transmite como stream de descarga."""
    query = select(Provider)
    if activo is not None:
        query = query.where(Provider.activo == activo)
    query = query.order_by(Provider.nombre_empresa)

    providers = (await db.execute(query)).scalars().all()

    output = io.StringIO()
    output.write("﻿")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow(
        [
            "NIT",
            "Nombre Empresa",
            "Contacto",
            "Teléfono",
            "Email",
            "Dirección",
            "Activo",
        ]
    )

    for prov in providers:
        writer.writerow(
            [
                prov.nit,
                prov.nombre_empresa,
                prov.contacto_nombre or "N/A",
                prov.contacto_telefono or "N/A",
                prov.contacto_email or "N/A",
                prov.direccion or "N/A",
                "SI" if prov.activo else "NO",
            ]
        )

    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"proveedores_casetech_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
