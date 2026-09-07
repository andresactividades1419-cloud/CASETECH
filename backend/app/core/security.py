"""
core/security.py — Utilidades criptográficas de CASETECH ERP.

Responsabilidades:
- Hashing y verificación de contraseñas con bcrypt (passlib).
- Emisión de tokens JWT firmados con HS256 (python-jose).
- Generación y hashing de refresh tokens (Issue #86).
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import settings

# ---------------------------------------------------------------------------
# Funciones de contraseña (bcrypt nativo)
# ---------------------------------------------------------------------------


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara una contraseña en texto plano contra su hash bcrypt almacenado.

    Args:
        plain_password: Contraseña ingresada por el usuario.
        hashed_password: Hash bcrypt recuperado de la base de datos.

    Returns:
        True si la contraseña es correcta, False en caso contrario.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """
    Genera un hash bcrypt seguro para la contraseña proporcionada.

    Args:
        password: Contraseña en texto plano a hashear.

    Returns:
        String con el hash bcrypt listo para persistir en BD.
    """
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


# ---------------------------------------------------------------------------
# Función de generación de JWT
# ---------------------------------------------------------------------------


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Crea un token JWT de acceso firmado con HS256.

    El payload incorpora la clave 'exp' (expiración) y todos los campos
    presentes en `data`. El subject ('sub') debe ser el identificador único
    del usuario (e.g. email o ID como string).

    Args:
        data: Diccionario con los claims a incluir en el payload.
              Debe contener al menos ``{"sub": "<user_email>", "rol": "<nombre_rol>"}``.
        expires_delta: Ventana de validez personalizada. Si no se indica
                       se usa ``ACCESS_TOKEN_EXPIRE_MINUTES`` de settings.

    Returns:
        Token JWT como string opaco firmado y codificado en Base64URL.
    """
    to_encode = data.copy()

    if expires_delta is not None:
        expire = datetime.now(tz=UTC) + expires_delta
    else:
        expire = datetime.now(tz=UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode["exp"] = expire

    encoded_jwt: str = jwt.encode(
        to_encode,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


# ---------------------------------------------------------------------------
# Refresh tokens (Issue #86)
# ---------------------------------------------------------------------------


def create_refresh_token() -> str:
    """
    Genera un refresh token opaco criptográficamente aleatorio (384 bits).

    A diferencia del access token, no es un JWT — es un valor aleatorio sin
    contenido propio. Su única función es identificar una sesión válida en
    la tabla ``refresh_tokens``; toda la lógica de expiración/revocación
    vive en la base de datos, no en el token mismo.
    """
    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    """
    Calcula el hash SHA-256 de un refresh token para guardarlo en BD.

    Nunca se persiste el valor en texto plano: si la base de datos se
    filtrara, el hash por sí solo no permite iniciar sesión como el usuario.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
