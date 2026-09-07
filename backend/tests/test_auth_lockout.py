"""
backend/tests/test_auth_lockout.py — Pruebas de integración del bloqueo de
cuenta por intentos fallidos de login (Issue #80, RF01).

Cubre:
1. Los primeros intentos fallidos retornan 401 genérico y no bloquean la cuenta.
2. Al llegar al límite (5), la cuenta se bloquea con un mensaje explícito.
3. Un intento posterior, incluso con la contraseña correcta, sigue rechazado.
4. Un login exitoso reinicia el contador de intentos fallidos.
"""

import pytest
from httpx import AsyncClient


async def _failed_login(client: AsyncClient):
    return await client.post(
        "/api/v1/auth/login",
        data={"username": "operario@casetech.com", "password": "ContraseñaIncorrecta"},
    )


@pytest.mark.asyncio
async def test_account_locks_after_max_failed_attempts(client: AsyncClient):
    """Tras 5 intentos fallidos consecutivos, la cuenta debe bloquearse."""
    for _ in range(4):
        res = await _failed_login(client)
        assert res.status_code == 401
        assert "incorrectos" in res.json()["detail"].lower()

    # Quinto intento: debe bloquear la cuenta con mensaje explícito
    fifth = await _failed_login(client)
    assert fifth.status_code == 401
    assert "bloqueada" in fifth.json()["detail"].lower()

    # Un sexto intento, incluso con la contraseña correcta, debe rechazarse
    # porque la cuenta ya quedó desactivada.
    correct_attempt = await client.post(
        "/api/v1/auth/login",
        data={"username": "operario@casetech.com", "password": "Operario1234"},
    )
    assert correct_attempt.status_code == 401
    assert "desactivada" in correct_attempt.json()["detail"].lower()


@pytest.mark.asyncio
async def test_successful_login_resets_failed_attempts_counter(client: AsyncClient):
    """Un login exitoso debe reiniciar el contador de intentos fallidos."""
    for _ in range(3):
        res = await _failed_login(client)
        assert res.status_code == 401

    success = await client.post(
        "/api/v1/auth/login",
        data={"username": "operario@casetech.com", "password": "Operario1234"},
    )
    assert success.status_code == 200

    # Si el contador no se hubiera reiniciado, 2 fallos más completarian el
    # bloqueo (3 previos + 2 = 5). Como se reinicio, esto NO debe bloquear.
    for _ in range(2):
        res = await _failed_login(client)
        assert res.status_code == 401
        assert "incorrectos" in res.json()["detail"].lower()

    still_active = await client.post(
        "/api/v1/auth/login",
        data={"username": "operario@casetech.com", "password": "Operario1234"},
    )
    assert still_active.status_code == 200
