"""
services/provider_service.py — Lógica de negocio del módulo de Proveedores (HU02/HU03).

Convenciones:
- Todos los Stored Procedures se consumen con ``text()`` de SQLAlchemy.
- Nunca replicar la lógica del SP en Python.
- Los errores de BD se mapean a HTTPException con el código HTTP correcto.
- Las funciones son ``async`` para mantener compatibilidad con asyncpg.
"""


from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, text, update
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider import Provider
from app.schemas.provider import (
    ProviderCreate,
    ProviderListResponse,
    ProviderRead,
    ProviderUpdate,
)

# ---------------------------------------------------------------------------
# create_provider — HU02: Registro vía SP con validación de duplicidad
# ---------------------------------------------------------------------------

async def create_provider(
    db: AsyncSession,
    provider_in: ProviderCreate,
    user_id: int,
) -> ProviderRead:
    """
    Registra un nuevo proveedor ejecutando ``sp_crear_proveedor`` de forma
    transaccional. El SP se encarga de validar unicidad del NIT en la BD.

    Args:
        db:          Sesión async de SQLAlchemy.
        provider_in: Datos validados del nuevo proveedor.
        user_id:     ID del usuario ADMINISTRADOR que realiza la operación.

    Raises:
        HTTPException 409: Si el NIT ya existe (capturado de IntegrityError).
        HTTPException 422: Si el SP retorna un error interno de validación.
        HTTPException 500: Para errores de BD no controlados.

    Returns:
        ProviderRead: Proveedor recién creado recuperado desde la BD.
    """
    try:
        query = text("""
            CALL sp_crear_proveedor(
                CAST(:nit AS VARCHAR),
                CAST(:nombre_empresa AS VARCHAR),
                CAST(:contacto_nombre AS VARCHAR),
                CAST(:contacto_telefono AS VARCHAR),
                CAST(:contacto_email AS VARCHAR),
                CAST(:direccion AS TEXT),
                CAST(:usuario_id AS BIGINT),
                NULL
            )
        """)
        await db.execute(
            query,
            {
                "nit": str(provider_in.nit).strip(),
                "nombre_empresa": str(provider_in.nombre_empresa).strip(),
                "contacto_nombre": str(provider_in.contacto_nombre).strip() if provider_in.contacto_nombre else "",
                "contacto_telefono": str(provider_in.contacto_telefono).strip() if provider_in.contacto_telefono else "",
                "contacto_email": str(provider_in.contacto_email).strip() if provider_in.contacto_email else "",
                "direccion": str(provider_in.direccion).strip() if provider_in.direccion else "",
                "usuario_id": user_id,
            },
        )
        await db.commit()

    except IntegrityError as exc:
        await db.rollback()
        # La restricción unique del NIT genera un IntegrityError con código 23505
        detail_lower = str(exc.orig).lower() if exc.orig else ""
        if "nit" in detail_lower or "unique" in detail_lower or "23505" in detail_lower:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El NIT '{provider_in.nit}' ya está registrado en el sistema.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Error de integridad al registrar el proveedor.",
        ) from exc

    except DBAPIError as exc:
        await db.rollback()
        orig_msg = str(exc.orig) if exc.orig else str(exc)

        # Capturar excepción de unicidad lanzada explícitamente por el SP (ERRCODE 23505)
        if "23505" in orig_msg or "unique" in orig_msg.lower() or "ya existe" in orig_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un proveedor registrado con el NIT '{provider_in.nit}'. El NIT es un identificador único e inmutable.",
            ) from exc

        # Errores de validación personalizados lanzados con RAISE EXCEPTION en el SP
        if "P0001" in orig_msg or "EXCEPTION" in orig_msg:
            clean_msg = orig_msg.split("\n")[0] if "\n" in orig_msg else orig_msg
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Error de validación en la base de datos: {clean_msg}",
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al ejecutar el procedimiento almacenado: {exc.orig}",
        ) from exc

    # Recuperar el proveedor recién creado para retornarlo serializado
    result = await db.execute(
        select(Provider).where(func.upper(Provider.nit) == provider_in.nit.strip().upper())
    )
    provider = result.scalar_one_or_none()

    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="El proveedor fue creado pero no se pudo recuperar de la base de datos.",
        )

    return ProviderRead.model_validate(provider)


# ---------------------------------------------------------------------------
# get_providers — Listado paginado con búsqueda y filtro de estado
# ---------------------------------------------------------------------------

async def get_providers(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    include_inactive: bool = False,
    search: str | None = None,
) -> ProviderListResponse:
    """
    Retorna proveedores paginados con soporte de búsqueda por nombre o NIT.

    Args:
        db:               Sesión async.
        skip:             Offset para paginación (default 0).
        limit:            Máximo de registros por página (default 50, max 200).
        include_inactive: Si False, excluye proveedores con ``activo == False``.
        search:           Texto libre para filtrar por NIT o nombre de empresa.

    Returns:
        ProviderListResponse con ``total``, ``skip``, ``limit`` e ``items``.
    """
    limit = min(limit, 200)  # Protección: nunca más de 200 registros por página

    base_query = select(Provider)

    # Filtro de estado activo
    if not include_inactive:
        base_query = base_query.where(Provider.activo.is_(True))

    # Búsqueda por NIT o nombre de empresa (case-insensitive)
    if search:
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                Provider.nit.ilike(term),
                Provider.nombre_empresa.ilike(term),
            )
        )

    # Consulta de total sin paginación
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar_one()

    # Consulta paginada ordenada por nombre
    paginated_query = (
        base_query.order_by(Provider.nombre_empresa.asc())
        .offset(skip)
        .limit(limit)
    )
    rows = await db.execute(paginated_query)
    providers = rows.scalars().all()

    return ProviderListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[ProviderRead.model_validate(p) for p in providers],
    )


# ---------------------------------------------------------------------------
# get_provider_by_id — Detalle por ID o HTTP 404
# ---------------------------------------------------------------------------

async def get_provider_by_id(db: AsyncSession, provider_id: int) -> ProviderRead:
    """
    Recupera un proveedor por su PK. Lanza HTTP 404 si no existe.

    Args:
        db:          Sesión async.
        provider_id: Identificador del proveedor.

    Raises:
        HTTPException 404: Si el proveedor no existe.

    Returns:
        ProviderRead: Datos del proveedor encontrado.
    """
    result = await db.execute(
        select(Provider).where(Provider.id == provider_id)
    )
    provider: Provider | None = result.scalar_one_or_none()

    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor con id={provider_id} no encontrado.",
        )

    return ProviderRead.model_validate(provider)


# ---------------------------------------------------------------------------
# update_provider — Actualización de campos editables (NIT inmutable)
# ---------------------------------------------------------------------------

async def update_provider(
    db: AsyncSession,
    provider_id: int,
    provider_in: ProviderUpdate,
    user_id: int,
) -> ProviderRead:
    """
    Actualiza los campos editables de un proveedor existente.
    El ``nit`` es inmutable y nunca se modifica aquí.

    Args:
        db:          Sesión async.
        provider_id: ID del proveedor a actualizar.
        provider_in: Datos de actualización (campos opcionales).
        user_id:     ID del usuario ADMINISTRADOR que realiza la operación.

    Raises:
        HTTPException 404: Si el proveedor no existe.

    Returns:
        ProviderRead: Datos actualizados del proveedor.
    """
    # Verificar existencia
    result = await db.execute(
        select(Provider).where(Provider.id == provider_id)
    )
    provider: Provider | None = result.scalar_one_or_none()

    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor con id={provider_id} no encontrado.",
        )

    # Construir dict con solo los campos explícitamente proporcionados
    update_data = provider_in.model_dump(exclude_unset=True)

    if not update_data:
        # Si no se envió ningún campo, retornar el estado actual sin tocar la BD
        return ProviderRead.model_validate(provider)

    # Normalizar email a string antes de persistir
    if "contacto_email" in update_data and update_data["contacto_email"] is not None:
        update_data["contacto_email"] = str(update_data["contacto_email"])

    await db.execute(
        update(Provider)
        .where(Provider.id == provider_id)
        .values(**update_data)
    )
    await db.commit()

    # Recuperar estado actualizado
    await db.refresh(provider)
    return ProviderRead.model_validate(provider)


# ---------------------------------------------------------------------------
# toggle_provider_status — Borrado lógico (activo ↔ inactivo)
# ---------------------------------------------------------------------------

async def toggle_provider_status(
    db: AsyncSession,
    provider_id: int,
    user_id: int,
) -> ProviderRead:
    """
    Alterna el estado ``activo`` del proveedor entre ``True`` y ``False``.

    Implementa el **borrado lógico**: nunca se elimina el registro físicamente.
    Un proveedor desactivado deja de aparecer en los listados por defecto.

    Args:
        db:          Sesión async.
        provider_id: ID del proveedor cuyo estado se alternará.
        user_id:     ID del usuario ADMINISTRADOR que realiza la operación.

    Raises:
        HTTPException 404: Si el proveedor no existe.

    Returns:
        ProviderRead: Proveedor con su nuevo estado reflejado.
    """
    result = await db.execute(
        select(Provider).where(Provider.id == provider_id)
    )
    provider: Provider | None = result.scalar_one_or_none()

    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor con id={provider_id} no encontrado.",
        )

    # Alternar estado
    new_status = not provider.activo
    await db.execute(
        update(Provider)
        .where(Provider.id == provider_id)
        .values(activo=new_status)
    )
    await db.commit()
    await db.refresh(provider)

    return ProviderRead.model_validate(provider)
