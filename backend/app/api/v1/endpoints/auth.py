"""
api/v1/endpoints/auth.py — Endpoints de autenticación para CASETECH ERP.

HU01 — Login con JWT:
    POST /api/v1/auth/login    → Emite token Bearer tras verificar credenciales.
    GET  /api/v1/auth/me       → Retorna datos del usuario autenticado.

Issue #86 — Renovación de sesión:
    POST /api/v1/auth/refresh  → Renueva el access token usando la cookie httpOnly.
    POST /api/v1/auth/logout   → Revoca el refresh token e invalida la sesión.

HU14 / HU02 — Gestión de usuarios (solo ADMINISTRADOR):
    POST /api/v1/auth/register → Crea un nuevo usuario con rol asignado.
    GET  /api/v1/auth/users    → Listar todas las cuentas de usuario.
    PATCH /api/v1/auth/users/{id} → Actualizar datos/rol/contraseña/estado.
    DELETE /api/v1/auth/users/{id} → Desactivar lógicamente un usuario.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
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

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


async def _issue_refresh_cookie(response: Response, db: AsyncSession, usuario_id: int) -> None:
    """
    Crea una fila nueva en ``refresh_tokens`` y la entrega al navegador como
    cookie httpOnly. El valor en texto plano solo existe en este momento;
    en base de datos únicamente se guarda su hash (ver security.py).
    """
    raw_token = create_refresh_token()
    expires_at = datetime.now(tz=UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db.add(
        RefreshToken(
            usuario_id=usuario_id,
            token_hash=hash_refresh_token(raw_token),
            expires_at=expires_at,
        )
    )
    await db.commit()

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


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
        429: {
            "description": "Límite de intentos excedido (máximo 10 por minuto por IP)."
        },
    },
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
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
    await _issue_refresh_cookie(response, db, user.id)

    return Token(access_token=access_token, token_type="bearer")


# ---------------------------------------------------------------------------
# POST /refresh — Issue #86: Renovar el access token sin volver a autenticar
# ---------------------------------------------------------------------------


@router.post(
    "/refresh",
    response_model=Token,
    summary="Renovar el access token",
    description=(
        "Usa la cookie httpOnly `refresh_token` (emitida en /login) para emitir "
        "un nuevo access token sin pedir credenciales de nuevo. El refresh token "
        "rota en cada uso: el anterior queda revocado y se entrega uno nuevo."
    ),
    responses={
        200: {"description": "Access token renovado exitosamente."},
        401: {"description": "Refresh token ausente, inválido, expirado o revocado."},
    },
)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Token:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay una sesión activa para renovar. Inicie sesión de nuevo.",
        )

    token_hash = hash_refresh_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token: RefreshToken | None = result.scalar_one_or_none()

    now = datetime.now(tz=UTC)
    if (
        stored_token is None
        or stored_token.revoked
        or stored_token.expires_at.replace(tzinfo=UTC) < now
    ):
        response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión expiró o ya no es válida. Inicie sesión de nuevo.",
        )

    user_result = await db.execute(
        select(User).where(User.id == stored_token.usuario_id)
    )
    user: User | None = user_result.scalar_one_or_none()
    if user is None or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta asociada a esta sesión ya no está disponible.",
        )

    role_result = await db.execute(select(Role).where(Role.id == user.rol_id))
    role: Role | None = role_result.scalar_one_or_none()
    role_name: str = role.nombre if role else "DESCONOCIDO"

    # Rotación: el refresh token usado queda inválido, se emite uno nuevo
    stored_token.revoked = True
    await db.commit()

    access_token = create_access_token(data={"sub": user.email, "rol": role_name})
    await _issue_refresh_cookie(response, db, user.id)

    return Token(access_token=access_token, token_type="bearer")


# ---------------------------------------------------------------------------
# POST /logout — Issue #86: Revocar la sesión activa
# ---------------------------------------------------------------------------


@router.post(
    "/logout",
    summary="Cerrar sesión",
    description="Revoca el refresh token activo en el servidor y limpia la cookie de sesión.",
    responses={200: {"description": "Sesión cerrada correctamente."}},
)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        token_hash = hash_refresh_token(raw_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored_token: RefreshToken | None = result.scalar_one_or_none()
        if stored_token is not None:
            stored_token.revoked = True
            await db.commit()

    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return {"message": "Sesión cerrada correctamente."}


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
    role_val = role_res.scalar_one_or_none()
    rol_nombre: str = str(role_val) if role_val else "OPERARIO"

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
