"""
schemas/token.py — Esquemas Pydantic v2 para tokens JWT de CASETECH ERP.
"""

from pydantic import BaseModel


class Token(BaseModel):
    """
    Respuesta estándar OAuth2 / Bearer devuelta en el endpoint ``/login``.

    Attributes:
        access_token: JWT codificado en Base64URL firmado con HS256.
        token_type:   Siempre "bearer" según RFC 6750.
    """

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """
    Representación decodificada del payload JWT de CASETECH.

    Attributes:
        sub: Subject — normalmente el email del usuario autenticado.
        rol: Nombre del rol asignado, usado para verificación RBAC.
    """

    sub: str | None = None
    rol: str | None = None
