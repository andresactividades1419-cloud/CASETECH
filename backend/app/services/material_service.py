"""
services/material_service.py — Lógica de negocio y persistencia para Materiales e Insumos (HU10 y HU12).
"""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.schemas.material import (
    MaterialCreate,
    MaterialListResponse,
    MaterialResponse,
    MaterialUpdate,
)


async def create_material(
    db: AsyncSession,
    material_in: MaterialCreate,
    user_id: int,
) -> MaterialResponse:
    """
    Crea un nuevo insumo/materia prima validando unicidad de nombre (case-insensitive).

    Args:
        db: Sesión asíncrona de base de datos.
        material_in: Datos validados del nuevo material.
        user_id: ID del usuario administrador que realiza la creación.

    Raises:
        HTTPException 409: Si ya existe un insumo con el mismo nombre.
        HTTPException 422: Si falla alguna restricción de base de datos.

    Returns:
        MaterialResponse: Objeto serializado del nuevo material.
    """
    # 1. Validar duplicidad de nombre (case-insensitive)
    existing = await db.execute(
        select(Material).where(func.lower(Material.nombre) == material_in.nombre.lower())
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un material con el nombre '{material_in.nombre}'.",
        )

    # 2. Instanciar y persistir
    new_material = Material(
        nombre=material_in.nombre,
        unidad_medida=material_in.unidad_medida,
        stock_actual=material_in.stock_actual,
        stock_minimo=material_in.stock_minimo,
        activo=True,
    )

    try:
        db.add(new_material)
        await db.commit()
        await db.refresh(new_material)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Error de integridad al guardar el material en la base de datos.",
        ) from exc

    return MaterialResponse.model_validate(new_material)


async def get_materials(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    nombre: Optional[str] = None,
    activo: Optional[bool] = None,
    alerta_stock: Optional[bool] = None,
) -> MaterialListResponse:
    """
    Lista insumos con soporte de búsqueda por nombre, filtro de estado y alerta de stock mínimo (HU12).

    Args:
        db: Sesión de base de datos.
        skip: Paginación offset.
        limit: Máximo de registros a retornar (tope 200).
        nombre: Búsqueda parcial por nombre.
        activo: Filtrar por estado activo (None = retorna solo activos si no se pide inactivos).
        alerta_stock: Si es True, filtra materiales donde stock_actual <= stock_minimo.

    Returns:
        MaterialListResponse: Total, skip, limit y lista de materiales.
    """
    limit = min(limit, 200)
    base_query = select(Material)

    # Filtro por estado activo si se especifica
    if activo is not None:
        base_query = base_query.where(Material.activo == activo)

    # Búsqueda por nombre
    if nombre and nombre.strip():
        term = f"%{nombre.strip()}%"
        base_query = base_query.where(Material.nombre.ilike(term))

    # Filtro de alerta de stock bajo (HU12: stock_actual <= stock_minimo)
    if alerta_stock is True:
        base_query = base_query.where(Material.stock_actual <= Material.stock_minimo)

    # Total de coincidencias
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar_one()

    # Consulta paginada ordenada por nombre
    paginated_query = (
        base_query.order_by(Material.nombre.asc())
        .offset(skip)
        .limit(limit)
    )
    rows = await db.execute(paginated_query)
    materials = rows.scalars().all()

    return MaterialListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[MaterialResponse.model_validate(m) for m in materials],
    )


async def get_material_by_id(db: AsyncSession, material_id: int) -> MaterialResponse:
    """
    Consulta un material por su PK o retorna HTTP 404.
    """
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material: Material | None = result.scalar_one_or_none()

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material con id={material_id} no encontrado.",
        )

    return MaterialResponse.model_validate(material)


async def update_material(
    db: AsyncSession,
    material_id: int,
    material_in: MaterialUpdate,
    user_id: int,
) -> MaterialResponse:
    """
    Actualiza los datos editables de un insumo existente.
    """
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material: Material | None = result.scalar_one_or_none()

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material con id={material_id} no encontrado.",
        )

    update_data = material_in.model_dump(exclude_unset=True)
    if not update_data:
        return MaterialResponse.model_validate(material)

    # Si se actualiza el nombre, validar unicidad
    if "nombre" in update_data and update_data["nombre"]:
        new_name = update_data["nombre"].strip()
        existing = await db.execute(
            select(Material).where(
                func.lower(Material.nombre) == new_name.lower(),
                Material.id != material_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe otro material con el nombre '{new_name}'.",
            )
        update_data["nombre"] = new_name

    await db.execute(
        update(Material)
        .where(Material.id == material_id)
        .values(**update_data)
    )
    await db.commit()
    await db.refresh(material)

    return MaterialResponse.model_validate(material)


async def toggle_material_status(
    db: AsyncSession,
    material_id: int,
    user_id: int,
) -> MaterialResponse:
    """
    Alterna el estado activo/inactivo (borrado lógico) de un insumo.
    """
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material: Material | None = result.scalar_one_or_none()

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material con id={material_id} no encontrado.",
        )

    new_status = not material.activo
    await db.execute(
        update(Material)
        .where(Material.id == material_id)
        .values(activo=new_status)
    )
    await db.commit()
    await db.refresh(material)

    return MaterialResponse.model_validate(material)
