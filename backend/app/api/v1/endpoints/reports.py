"""
api/v1/endpoints/reports.py — Endpoints REST para generación y exportación de reportes (HU06, RF12).

Provee:
- GET /api/v1/reports/kardex/export-csv → Exportación en formato CSV del historial completo de Kardex (AdminUser).
"""

import csv
import io
from datetime import date, datetime

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DBSession
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
