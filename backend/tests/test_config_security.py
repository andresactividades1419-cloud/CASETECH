"""
tests/test_config_security.py — Pruebas del validador anti-placeholder de Settings.

¿Qué? Verifica que Settings rechace (fail-fast) las contraseñas de ejemplo
de .env.example (POSTGRES_PASSWORD, ADMIN_INITIAL_PASSWORD,
OPERARIO_INITIAL_PASSWORD) cuando ENVIRONMENT no es "development".
¿Para qué? Evitar que alguien despliegue el sistema en un entorno real
dejando esas credenciales públicas y conocidas (visibles en el repo).
¿Impacto? Si esta validación se rompe, un despliegue fuera de development
podría arrancar silenciosamente con contraseñas de administrador públicas.
"""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _build_settings(**overrides: str) -> Settings:
    """Construye un Settings aislado del .env real, con overrides explícitos."""
    base = {
        "JWT_SECRET": "clave-de-prueba-de-al-menos-32-bytes-1234567890",
        "POSTGRES_PASSWORD": "una-contrasena-real-cualquiera",
        "ADMIN_INITIAL_PASSWORD": "",
        "OPERARIO_INITIAL_PASSWORD": "",
        "ENVIRONMENT": "development",
    }
    base.update(overrides)
    return Settings(_env_file=None, **base)  # type: ignore[call-arg,arg-type]


def test_placeholder_allowed_in_development():
    """En development, las contraseñas de ejemplo NO deben bloquear el arranque."""
    settings = _build_settings(
        ENVIRONMENT="development",
        ADMIN_INITIAL_PASSWORD="CAMBIA_ESTA_CONTRASENA_ADMIN",
        OPERARIO_INITIAL_PASSWORD="CAMBIA_ESTA_CONTRASENA_OPERARIO",
    )
    assert settings.ADMIN_INITIAL_PASSWORD.get_secret_value() == "CAMBIA_ESTA_CONTRASENA_ADMIN"


@pytest.mark.parametrize("environment", ["production", "staging", "test"])
def test_placeholder_admin_password_rejected_outside_development(environment: str):
    """Fuera de development, ADMIN_INITIAL_PASSWORD de ejemplo debe fallar rápido."""
    with pytest.raises(ValidationError, match="ADMIN_INITIAL_PASSWORD"):
        _build_settings(
            ENVIRONMENT=environment,
            ADMIN_INITIAL_PASSWORD="CAMBIA_ESTA_CONTRASENA_ADMIN",
        )


def test_placeholder_operario_password_rejected_in_production():
    """Fuera de development, OPERARIO_INITIAL_PASSWORD de ejemplo debe fallar rápido."""
    with pytest.raises(ValidationError, match="OPERARIO_INITIAL_PASSWORD"):
        _build_settings(
            ENVIRONMENT="production",
            OPERARIO_INITIAL_PASSWORD="CAMBIA_ESTA_CONTRASENA_OPERARIO",
        )


def test_placeholder_postgres_password_rejected_in_production():
    """Fuera de development, POSTGRES_PASSWORD de ejemplo debe fallar rápido."""
    with pytest.raises(ValidationError, match="POSTGRES_PASSWORD"):
        _build_settings(
            ENVIRONMENT="production",
            POSTGRES_PASSWORD="CAMBIA_ESTA_CONTRASENA",
        )


def test_real_credentials_allowed_in_production():
    """Contraseñas reales (no placeholder) deben funcionar en cualquier entorno."""
    settings = _build_settings(
        ENVIRONMENT="production",
        ADMIN_INITIAL_PASSWORD="UnaClaveRealBastanteSegura2026*",
        OPERARIO_INITIAL_PASSWORD="OtraClaveRealSegura2026*",
    )
    assert settings.ENVIRONMENT == "production"


def test_empty_initial_passwords_allowed_in_production():
    """String vacío (omitir siembra) es válido en cualquier entorno, no es un placeholder."""
    settings = _build_settings(
        ENVIRONMENT="production",
        ADMIN_INITIAL_PASSWORD="",
        OPERARIO_INITIAL_PASSWORD="",
    )
    assert settings.ADMIN_INITIAL_PASSWORD.get_secret_value() == ""
