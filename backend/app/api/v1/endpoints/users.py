"""
api/v1/endpoints/users.py — Endpoints REST para la Gestión de Cuentas de Usuario (HU02).

Todos los endpoints están estrictamente protegidos para el rol ADMINISTRADOR (AdminUser).

Rutas expuestas bajo /api/v1/users:
  GET    /             → Listar usuarios con paginación y búsqueda
  POST   /             → Crear nueva cuenta de usuario
  GET    /{id}         → Detalle completo de un usuario
  PUT    /{id}         → Actualizar datos y/o credenciales de usuario
  PATCH  /{id}/status  → Activar o desactivar cuenta (borrado lógico)
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, get_db
from app.schemas.user import (
    UserAdminRead,
    UserCreate,
    UserListResponse,
    UserStatusToggle,
    UserUpdate,
)
from app.services import user_service

router = APIRouter()


# ---------------------------------------------------------------------------
# GET / — Listar usuarios con paginación y búsqueda
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=UserListResponse,
    summary="Listar usuarios del sistema (HU02)",
    description="Retorna la lista de usuarios con soporte de paginación y búsqueda por nombre o correo. Solo ADMINISTRADOR.",
    responses={
        200: {"description": "Listado de usuarios obtenido correctamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Acceso restringido a ADMINISTRADOR."},
    },
)
async def list_users(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0, description="Offset de paginación."),
    limit: int = Query(default=50, ge=1, le=200, description="Límite por página."),
    search: str | None = Query(
        default=None, description="Búsqueda por nombre o email."
    ),
    rol_id: int | None = Query(
        default=None, description="Filtrar por ID de rol (1: ADMIN, 2: OPERARIO)."
    ),
) -> UserListResponse:
    """
    Retorna la lista paginada de usuarios registrados en el ERP.
    """
    return await user_service.get_users(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        rol_id=rol_id,
    )


# ---------------------------------------------------------------------------
# POST / — Crear nuevo usuario
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=UserAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nueva cuenta de usuario (HU02/HU14)",
    description="Crea un nuevo usuario con rol asignado y contraseña cifrada. Solo ADMINISTRADOR.",
    responses={
        201: {"description": "Usuario registrado exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Acceso restringido a ADMINISTRADOR."},
        409: {"description": "El email ya está registrado."},
        422: {"description": "Datos de entrada inválidos o rol inexistente."},
    },
)
async def create_user(
    user_in: UserCreate,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserAdminRead:
    """
    Registra una nueva cuenta de usuario en el sistema.
    """
    return await user_service.create_user(db=db, user_in=user_in)


# ---------------------------------------------------------------------------
# GET /{user_id} — Detalle de usuario
# ---------------------------------------------------------------------------


@router.get(
    "/{user_id}",
    response_model=UserAdminRead,
    summary="Detalle de un usuario (HU02)",
    description="Obtiene la información detallada de una cuenta de usuario. Solo ADMINISTRADOR.",
    responses={
        200: {"description": "Detalle del usuario."},
        401: {"description": "No autenticado."},
        403: {"description": "Acceso restringido a ADMINISTRADOR."},
        404: {"description": "Usuario no encontrado."},
    },
)
async def get_user(
    user_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserAdminRead:
    """
    Consulta un usuario por su identificador primario.
    """
    return await user_service.get_user_by_id(db=db, user_id=user_id)


# ---------------------------------------------------------------------------
# PUT /{user_id} — Actualizar usuario
# ---------------------------------------------------------------------------


@router.put(
    "/{user_id}",
    response_model=UserAdminRead,
    summary="Actualizar cuenta de usuario (HU02)",
    description="Modifica nombre, email, rol, estado o contraseña de un usuario. Solo ADMINISTRADOR.",
    responses={
        200: {"description": "Usuario actualizado correctamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Acceso restringido a ADMINISTRADOR."},
        404: {"description": "Usuario no encontrado."},
        409: {"description": "El email ya está en uso por otra cuenta."},
        422: {
            "description": "No puede auto-desactivar su propia cuenta de administrador."
        },
    },
)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserAdminRead:
    """
    Actualiza la información de una cuenta de usuario existente.
    """
    return await user_service.update_user(
        db=db,
        user_id=user_id,
        user_in=user_in,
        current_admin_id=current_admin.id,
    )


# ---------------------------------------------------------------------------
# PATCH /{user_id}/status — Activar o desactivar cuenta (borrado lógico)
# ---------------------------------------------------------------------------


@router.patch(
    "/{user_id}/status",
    response_model=UserStatusToggle,
    summary="Activar o desactivar cuenta de usuario (HU02)",
    description="Alterna el estado activo de una cuenta (borrado lógico). Impide la auto-desactivación del admin en sesión.",
    responses={
        200: {"description": "Estado de la cuenta actualizado exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Acceso restringido a ADMINISTRADOR."},
        404: {"description": "Usuario no encontrado."},
        422: {
            "description": "No puede desactivar su propia cuenta de administrador en sesión."
        },
    },
)
async def toggle_user_status(
    user_id: int,
    current_admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserStatusToggle:
    """
    Activa o desactiva lógicamente el acceso de un usuario.
    """
    return await user_service.toggle_user_status(
        db=db,
        user_id=user_id,
        current_admin_id=current_admin.id,
    )
