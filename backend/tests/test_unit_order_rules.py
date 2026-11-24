"""
Tests unitarios de reglas de negocio de pedidos y seguridad (bootcamp semana 2, capa API).

No usan base de datos, red ni la fecha real: prueban funciones puras.
"""

from datetime import timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)
from app.services.order_service import (
    _clean_pg_error_message,
    validate_status_transition,
)

# ---------------------------------------------------------------------------
# Transiciones de estado de pedidos
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("current_status", "new_status"),
    [
        ("PENDIENTE", "EN_PRODUCCION"),
        ("PENDIENTE", "CANCELADO"),
        ("EN_PRODUCCION", "COMPLETADO"),
        ("EN_PRODUCCION", "CANCELADO"),
    ],
)
def test_validate_status_transition_allows_valid_transitions(
    current_status: str, new_status: str
) -> None:
    # Arrange: una transición que el negocio permite
    codigo = "PED-0001"

    # Act
    result = validate_status_transition(current_status, new_status, codigo)

    # Assert: no lanza error
    assert result is None


@pytest.mark.parametrize(
    ("current_status", "new_status"),
    [
        ("PENDIENTE", "COMPLETADO"),  # no se puede saltar la producción
        ("EN_PRODUCCION", "PENDIENTE"),  # no se puede devolver a pendiente
    ],
)
def test_validate_status_transition_rejects_invalid_transitions(
    current_status: str, new_status: str
) -> None:
    # Arrange
    codigo = "PED-0001"

    # Act
    with pytest.raises(HTTPException) as exc_info:
        validate_status_transition(current_status, new_status, codigo)

    # Assert: 422 y el mensaje dice qué transiciones sí se permiten
    assert exc_info.value.status_code == 422
    assert "Transición de estado no válida" in exc_info.value.detail


@pytest.mark.parametrize("terminal_status", ["COMPLETADO", "CANCELADO"])
def test_validate_status_transition_rejects_any_change_from_terminal_state(
    terminal_status: str,
) -> None:
    # Arrange: un pedido ya cerrado
    codigo = "PED-0007"

    # Act
    with pytest.raises(HTTPException) as exc_info:
        validate_status_transition(terminal_status, "EN_PRODUCCION", codigo)

    # Assert: el mensaje menciona el pedido y que es terminal
    assert exc_info.value.status_code == 422
    assert "estado terminal" in exc_info.value.detail
    assert "PED-0007" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Limpieza de mensajes de error de PostgreSQL
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (
            "<class 'asyncpg.exceptions.RaiseError'>: Stock insuficiente",
            "Stock insuficiente",
        ),
        ("Stock insuficiente", "Stock insuficiente"),  # sin prefijo: no cambia
        ("", ""),  # límite: mensaje vacío
    ],
)
def test_clean_pg_error_message_removes_class_prefix(raw: str, expected: str) -> None:
    # Act
    result = _clean_pg_error_message(raw)

    # Assert
    assert result == expected


# ---------------------------------------------------------------------------
# Seguridad: contraseñas y tokens
# ---------------------------------------------------------------------------


def test_verify_password_accepts_correct_and_rejects_wrong_password() -> None:
    # Arrange
    hashed = get_password_hash("Clave-Segura-123")

    # Act / Assert
    assert verify_password("Clave-Segura-123", hashed) is True
    assert verify_password("clave-segura-123", hashed) is False  # distingue mayúsculas


def test_verify_password_returns_false_when_hash_is_corrupt() -> None:
    # Arrange: un hash que no es bcrypt (ej. dato dañado en la BD)
    corrupt_hash = "no-es-un-hash"

    # Act
    result = verify_password("cualquier-clave", corrupt_hash)

    # Assert: no explota, simplemente rechaza
    assert result is False


def _decode(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_SECRET.get_secret_value(),
        algorithms=[settings.JWT_ALGORITHM],
    )


def test_create_access_token_keeps_claims_and_is_signed_with_secret() -> None:
    # Arrange
    data = {"sub": "admin@casetech.com", "rol": "ADMINISTRADOR"}

    # Act
    payload = _decode(create_access_token(data, expires_delta=timedelta(minutes=5)))

    # Assert
    assert payload["sub"] == "admin@casetech.com"
    assert payload["rol"] == "ADMINISTRADOR"


def test_create_access_token_already_expired_is_rejected() -> None:
    # Arrange: token vencido creado por parámetro (FIRST: Repeatable, sin esperar)
    token = create_access_token({"sub": "a@casetech.com"}, timedelta(minutes=-1))

    # Act / Assert
    with pytest.raises(jwt.ExpiredSignatureError):
        _decode(token)


def test_hash_refresh_token_is_deterministic_and_hides_the_token() -> None:
    # Act
    first = hash_refresh_token("token-de-prueba")
    second = hash_refresh_token("token-de-prueba")
    other = hash_refresh_token("token-de-prueba2")

    # Assert: mismo token → mismo hash; distinto token → distinto hash
    assert first == second
    assert first != other
    assert "token-de-prueba" not in first
    assert len(first) == 64  # SHA-256 en hexadecimal
