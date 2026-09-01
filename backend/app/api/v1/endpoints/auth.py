"""
api/v1/endpoints/auth.py — Endpoints de autenticación para CASETECH ERP.

HU01 — Login con JWT:
    POST /api/v1/auth/login    → Emite token Bearer tras verificar credenciales.
    GET  /api/v1/auth/me       → Retorna datos del usuario autenticado.

HU14 / HU02 — Gestión de usuarios (solo ADMINISTRADOR):
    POST /api/v1/auth/register → Crea un nuevo usuario con rol asignado.
    GET  /api/v1/auth/users    → Listar todas las cuentas de usuario.
    PATCH /api/v1/auth/users/{id} → Actualizar datos/rol/contraseña/estado.
    DELETE /api/v1/auth/users/{id} → Desactivar lógicamente un usuario.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.role import Role
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import (
    UserAdminRead,
    UserCreate,
    UserListResponse,
    UserRead,
    UserUpdateAdmin,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /login  — HU01: Autenticación con credenciales y emisión de JWT
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=Token,
    summary="Iniciar sesión",
    description=(
        "Autentica al usuario con email y contraseña. "
        "Retorna un token JWT Bearer válido para proteger el resto de endpoints."
    ),
    responses={
        200: {"description": "Autenticación exitosa. Token JWT emitido."},
        401: {"description": "Credenciales incorrectas o cuenta inactiva."},
    },
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Endpoint OAuth2 estándar compatible con Swagger UI ``Authorize``.
    """
    normalized_email = form_data.username.strip().lower()

    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user: User | None = result.scalar_one_or_none()

    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de usuario está desactivada.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_result = await db.execute(select(Role).where(Role.id == user.rol_id))
    role: Role | None = role_result.scalar_one_or_none()
    role_name: str = role.nombre if role else "DESCONOCIDO"

    access_token = create_access_token(data={"sub": user.email, "rol": role_name})

    return Token(access_token=access_token, token_type="bearer")


# ---------------------------------------------------------------------------
# POST /register — HU14: Registro de nuevos usuarios (requiere ADMINISTRADOR)
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=UserAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description=(
        "Crea un nuevo usuario en el sistema. "
        "**Solo accesible por usuarios con rol ADMINISTRADOR.**"
    ),
    responses={
        201: {"description": "Usuario creado correctamente."},
        401: {"description": "Token ausente o inválido."},
        403: {"description": "Acción reservada para ADMINISTRADOR."},
        409: {"description": "El email ya está registrado en el sistema."},
        422: {"description": "Datos de entrada no válidos."},
    },
)
async def register(
    user_in: UserCreate,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserAdminRead:
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El email '{user_in.email}' ya está registrado en el sistema.",
        )

    role_result = await db.execute(select(Role).where(Role.id == user_in.rol_id))
    role: Role | None = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El rol con id={user_in.rol_id} no existe.",
        )

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

    return UserAdminRead(
        id=new_user.id,
        nombre_completo=new_user.nombre_completo,
        email=new_user.email,
        rol_id=new_user.rol_id,
        rol_nombre=role.nombre,
        activo=new_user.activo,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at,
    )


# ---------------------------------------------------------------------------
# GET /me — Datos del usuario autenticado actualmente
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=UserRead,
    summary="Perfil del usuario actual",
    description="Retorna los datos del usuario autenticado mediante el token Bearer.",
    responses={
        200: {"description": "Datos del usuario autenticado."},
        401: {"description": "Token ausente, expirado o inválido."},
    },
)
async def me(current_user: CurrentUser) -> User:
    return current_user


# ---------------------------------------------------------------------------
# GET /users — HU02: Listado de usuarios del sistema (solo ADMINISTRADOR)
# ---------------------------------------------------------------------------


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="Listar usuarios del sistema (HU02)",
    description="Retorna la lista de todas las cuentas de usuario con sus roles y estados asociados. **Solo ADMINISTRADOR**.",
)
async def list_users(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    query = (
        select(User, Role.nombre.label("rol_nombre"))
        .outerjoin(Role, Role.id == User.rol_id)
        .order_by(User.id.asc())
    )
    result = await db.execute(query)
    rows = result.all()

    items: list[UserAdminRead] = []
    for user_obj, rol_nombre in rows:
        items.append(
            UserAdminRead(
                id=user_obj.id,
                nombre_completo=user_obj.nombre_completo,
                email=user_obj.email,
                rol_id=user_obj.rol_id,
                rol_nombre=rol_nombre or "OPERARIO",
                activo=user_obj.activo,
                created_at=user_obj.created_at,
                updated_at=user_obj.updated_at,
            )
        )

    return UserListResponse(total=len(items), items=items)


# ---------------------------------------------------------------------------
# PATCH /users/{user_id} — HU02: Actualizar cuenta de usuario (solo ADMINISTRADOR)
# ---------------------------------------------------------------------------


@router.patch(
    "/users/{user_id}",
    response_model=UserAdminRead,
    summary="Actualizar cuenta de usuario (HU02)",
    description="Permite modificar rol, estado activo/inactivo, nombre o restablecer contraseña. **Solo ADMINISTRADOR**.",
)
async def update_user(
    user_id: int,
    user_update: UserUpdateAdmin,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserAdminRead:
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado.",
        )

    if user_update.email and user_update.email != user.email:
        email_check = await db.execute(
            select(User).where(User.email == user_update.email)
        )
        if email_check.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El correo '{user_update.email}' ya está en uso por otro usuario.",
            )
        user.email = user_update.email

    if user_update.nombre_completo is not None:
        user.nombre_completo = user_update.nombre_completo

    if user_update.rol_id is not None:
        role_res = await db.execute(select(Role).where(Role.id == user_update.rol_id))
        if role_res.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"El rol con ID {user_update.rol_id} no existe.",
            )
        user.rol_id = user_update.rol_id

    if user_update.activo is not None:
        if user.id == _admin.id and not user_update.activo:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No puede desactivar su propia cuenta de Administrador en sesión.",
            )
        user.activo = user_update.activo

    if user_update.password is not None and user_update.password.strip():
        user.password_hash = get_password_hash(user_update.password.strip())

    await db.commit()
    await db.refresh(user)

    role_res = await db.execute(select(Role.nombre).where(Role.id == user.rol_id))
    rol_nombre = role_res.scalar_one_or_none() or "OPERARIO"

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


# ---------------------------------------------------------------------------
# DELETE /users/{user_id} — HU02: Desactivación lógica de usuario
# ---------------------------------------------------------------------------


@router.delete(
    "/users/{user_id}",
    summary="Desactivar lógicamente un usuario (HU02)",
    description="Marca una cuenta de usuario como inactiva (activo = False). **Solo ADMINISTRADOR**.",
)
async def deactivate_user(
    user_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    if user_id == _admin.id:
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

    user.activo = False
    await db.commit()

    return {"message": f"Usuario '{user.email}' desactivado exitosamente."}
