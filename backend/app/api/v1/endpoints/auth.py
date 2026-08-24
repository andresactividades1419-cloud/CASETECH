"""
api/v1/endpoints/auth.py — Endpoints de autenticación para CASETECH ERP.

HU01 — Login con JWT:
    POST /api/v1/auth/login    → Emite token Bearer tras verificar credenciales.
    GET  /api/v1/auth/me       → Retorna datos del usuario autenticado.

HU14 — Registro de usuarios (solo ADMINISTRADOR):
    POST /api/v1/auth/register → Crea un nuevo usuario con rol asignado.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.role import Role
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserRead

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

    - ``username``: email del usuario.
    - ``password``: contraseña en texto plano.

    Retorna un objeto ``Token`` con ``access_token`` y ``token_type = "bearer"``.
    """
    # Buscar usuario por email (username en el form de OAuth2)
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user: User | None = result.scalar_one_or_none()

    # Verificar existencia y hash de contraseña
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar que la cuenta esté activa
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de usuario está desactivada.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cargar el rol para incluirlo en el JWT
    role_result = await db.execute(
        select(Role).where(Role.id == user.rol_id)
    )
    role: Role | None = role_result.scalar_one_or_none()
    role_name: str = role.nombre if role else "DESCONOCIDO"

    # Emitir el token con sub=email y rol=nombre_rol
    access_token = create_access_token(
        data={"sub": user.email, "rol": role_name}
    )

    return Token(access_token=access_token, token_type="bearer")


# ---------------------------------------------------------------------------
# POST /register — HU14: Registro de nuevos usuarios (requiere ADMINISTRADOR)
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description=(
        "Crea un nuevo usuario en el sistema. "
        "**Solo accesible por usuarios con rol ADMINISTRADOR.** "
        "Valida unicidad de email y genera el hash bcrypt antes de persistir."
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
) -> User:
    """
    Registra un nuevo usuario con rol asignado.

    Validaciones:
    - El email debe ser único en la tabla ``usuarios``.
    - El ``rol_id`` debe existir en la tabla ``roles``.
    - La contraseña se hashea con bcrypt antes de persistir.

    Solo los usuarios con rol **ADMINISTRADOR** pueden invocar este endpoint.
    """
    # 1. Verificar unicidad del email
    existing = await db.execute(
        select(User).where(User.email == user_in.email)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El email '{user_in.email}' ya está registrado en el sistema.",
        )

    # 2. Verificar existencia del rol
    role_result = await db.execute(
        select(Role).where(Role.id == user_in.rol_id)
    )
    role: Role | None = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El rol con id={user_in.rol_id} no existe.",
        )

    # 3. Crear instancia ORM con hash de contraseña
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

    return new_user


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
    """
    Retorna el perfil del usuario autenticado.

    No requiere parámetros adicionales; la identidad se extrae
    directamente del JWT mediante la dependencia ``get_current_user``.
    """
    return current_user
