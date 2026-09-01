"""
services/user_service.py — Lógica de negocio para la Administración de Cuentas de Usuario (HU02, HU14).

Responsabilidades:
- Listado paginado y con filtros de cuentas de usuario del sistema.
- Creación de nuevos usuarios con rol y contraseña hasheada (bcrypt).
- Actualización de datos, rol, estado y reseteo de contraseña.
- Borrado lógico (toggle activo/inactivo) impidiendo la auto-desactivación del usuario en sesión.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.schemas.user import (
    UserAdminRead,
    UserCreate,
    UserListResponse,
    UserStatusToggle,
    UserUpdate,
)


async def _enrich_user_read(db: AsyncSession, user: User) -> UserAdminRead:
    """
    Construye la representación UserAdminRead con el nombre del rol asignado.
    """
    role_res = await db.execute(select(Role.nombre).where(Role.id == user.rol_id))
    rol_nombre = role_res.scalar_one_or_none() or (
        "ADMINISTRADOR" if user.rol_id == 1 else "OPERARIO"
    )

    return UserAdminRead(
        id=user.id,
        nombre_completo=user.nombre_completo,
        email=user.email,
        rol_id=user.rol_id,
        rol_nombre=rol_nombre,
        activo=user.activo,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def get_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    rol_id: int | None = None,
) -> UserListResponse:
    """
    Retorna la lista de usuarios con soporte de paginación y filtros por nombre/email y rol.
    """
    query = select(User, Role.nombre.label("rol_nombre")).outerjoin(
        Role, Role.id == User.rol_id
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            (func.lower(User.nombre_completo).like(term))
            | (func.lower(User.email).like(term))
        )

    if rol_id is not None:
        query = query.where(User.rol_id == rol_id)

    # Conteo total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Paginación ordenada por ID ascendente
    paginated_query = query.order_by(User.id.asc()).offset(skip).limit(limit)
    result = await db.execute(paginated_query)
    rows = result.all()

    items: list[UserAdminRead] = []
    for user, rol_nombre in rows:
        items.append(
            UserAdminRead(
                id=user.id,
                nombre_completo=user.nombre_completo,
                email=user.email,
                rol_id=user.rol_id,
                rol_nombre=rol_nombre
                or ("ADMINISTRADOR" if user.rol_id == 1 else "OPERARIO"),
                activo=user.activo,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
        )

    return UserListResponse(total=total, skip=skip, limit=limit, items=items)


async def get_user_by_id(db: AsyncSession, user_id: int) -> UserAdminRead:
    """
    Recupera el detalle de un usuario por su ID.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado.",
        )

    return await _enrich_user_read(db, user)


async def create_user(db: AsyncSession, user_in: UserCreate) -> UserAdminRead:
    """
    Registra una nueva cuenta de usuario en el sistema.
    """
    # 1. Validar unicidad del email
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El email '{user_in.email}' ya está registrado en el sistema.",
        )

    # 2. Validar existencia del rol
    role_result = await db.execute(select(Role).where(Role.id == user_in.rol_id))
    role: Role | None = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El rol con id={user_in.rol_id} no existe.",
        )

    # 3. Crear usuario con contraseña hasheada
    new_user = User(
        nombre_completo=user_in.nombre_completo,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        rol_id=user_in.rol_id,
        activo=user_in.activo,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return await _enrich_user_read(db, new_user)


async def update_user(
    db: AsyncSession,
    user_id: int,
    user_in: UserUpdate,
    current_admin_id: int | None = None,
) -> UserAdminRead:
    """
    Actualiza la información de una cuenta de usuario existente.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado.",
        )

    # Validar email único si se modifica
    if user_in.email and user_in.email != user.email:
        email_check = await db.execute(select(User).where(User.email == user_in.email))
        if email_check.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El correo '{user_in.email}' ya está en uso por otro usuario.",
            )
        user.email = user_in.email

    if user_in.nombre_completo is not None and user_in.nombre_completo.strip():
        user.nombre_completo = user_in.nombre_completo.strip()

    if user_in.rol_id is not None:
        role_res = await db.execute(select(Role).where(Role.id == user_in.rol_id))
        if role_res.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"El rol con ID {user_in.rol_id} no existe.",
            )
        user.rol_id = user_in.rol_id

    if user_in.activo is not None:
        # Prevenir que el administrador autenticado desactive su propia cuenta
        if (
            current_admin_id is not None
            and user.id == current_admin_id
            and not user_in.activo
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No puede desactivar su propia cuenta de Administrador en sesión.",
            )
        user.activo = user_in.activo

    if user_in.password is not None and user_in.password.strip():
        user.password_hash = get_password_hash(user_in.password.strip())

    await db.commit()
    await db.refresh(user)

    return await _enrich_user_read(db, user)


async def toggle_user_status(
    db: AsyncSession,
    user_id: int,
    current_admin_id: int,
) -> UserStatusToggle:
    """
    Alterna o desactiva lógicamente una cuenta de usuario asegurando que el
    administrador en sesión no se auto-desactive.
    """
    if user_id == current_admin_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No puede desactivar su propia cuenta de Administrador en sesión.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado.",
        )

    user.activo = not user.activo
    await db.commit()
    await db.refresh(user)

    action_label = "activada" if user.activo else "desactivada"
    return UserStatusToggle(
        id=user.id,
        email=user.email,
        activo=user.activo,
        message=f"Cuenta de usuario '{user.email}' {action_label} correctamente.",
    )
