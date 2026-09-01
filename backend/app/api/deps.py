"""
api/deps.py — Dependencias reutilizables de FastAPI para CASETECH ERP.

Provee:
- ``get_db``          → sesión async de SQLAlchemy por petición.
- ``oauth2_scheme``   → esquema Bearer para extracción del token del header.
- ``get_current_user``→ decodifica JWT, valida expiración, retorna User activo.
- ``require_admin``   → guarda de autorización RBAC para rol ADMINISTRADOR.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.schemas.token import TokenPayload

# ---------------------------------------------------------------------------
# Dependencia: sesión de base de datos
# ---------------------------------------------------------------------------


async def get_db() -> AsyncSession:  # type: ignore[return]
    """
    Dependencia de FastAPI que provee una sesión async de SQLAlchemy.

    Garantiza rollback ante excepciones no controladas y cierre explícito
    al finalizar cada petición HTTP.

    Yields:
        AsyncSession: Sesión activa lista para consultas.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Esquema OAuth2 — extrae el Bearer token del header Authorization
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Alias tipado para inyección limpia en firmas de función
DBSession = Annotated[AsyncSession, Depends(get_db)]
BearerToken = Annotated[str, Depends(oauth2_scheme)]


# ---------------------------------------------------------------------------
# Dependencia: usuario autenticado actual
# ---------------------------------------------------------------------------


async def get_current_user(
    token: BearerToken,
    db: DBSession,
) -> User:
    """
    Decodifica y valida el JWT del header ``Authorization: Bearer <token>``.

    Pasos realizados:
    1. Decodifica el token con JWT_SECRET y JWT_ALGORITHM.
    2. Extrae el claim ``sub`` (email del usuario).
    3. Busca el usuario en PostgreSQL por email.
    4. Verifica que la cuenta esté activa (``activo == True``).

    Raises:
        HTTPException 401: Si el token es inválido, expirado, o el usuario
                           no existe o está inactivo.

    Returns:
        User: Instancia ORM del usuario autenticado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        token_data = TokenPayload(**payload)

        if token_data.sub is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception from None

    # Buscar usuario en BD por email (claim 'sub')
    result = await db.execute(select(User).where(User.email == token_data.sub))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de usuario está desactivada.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# ---------------------------------------------------------------------------
# Dependencia RBAC: solo ADMINISTRADOR
# ---------------------------------------------------------------------------


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DBSession,
) -> User:
    """
    Guarda de autorización basada en rol (RBAC).

    Verifica que el usuario autenticado tenga asignado el rol 'ADMINISTRADOR'.
    Si no, responde con HTTP 403 Forbidden.

    Args:
        current_user: Usuario ya autenticado vía ``get_current_user``.
        db:           Sesión de BD para cargar el rol si no está cargado.

    Raises:
        HTTPException 403: Si el rol del usuario no es 'ADMINISTRADOR'.

    Returns:
        User: El mismo usuario si la verificación es exitosa.
    """
    # Cargar el rol asociado al usuario si no está en memoria
    result = await db.execute(select(Role).where(Role.id == current_user.rol_id))
    role: Role | None = result.scalar_one_or_none()

    if role is None or role.nombre.upper() != "ADMINISTRADOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requiere el rol ADMINISTRADOR.",
        )

    return current_user


# ---------------------------------------------------------------------------
# Alias tipados para uso en endpoints
# ---------------------------------------------------------------------------

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
