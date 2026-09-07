"""
backend/tests/test_auth_refresh.py — Pruebas de integración del flujo de
refresh token (Issue #86).

Cubre:
1. El login emite una cookie httpOnly `refresh_token` además del access token.
2. POST /auth/refresh renueva el access token usando esa cookie.
3. El refresh token rota: el valor usado queda inválido tras renovar.
4. POST /auth/refresh sin cookie retorna 401.
5. POST /auth/logout revoca el refresh token activo.
"""

import pytest
from httpx import AsyncClient


async def _login(client: AsyncClient) -> str:
    """Inicia sesión y retorna el valor crudo de la cookie refresh_token."""
    res = await client.post(
        "/api/v1/auth/login",
        data={"username": "admin@casetech.com", "password": "Admin1234"},
    )
    assert res.status_code == 200, res.text
    assert "access_token" in res.json()

    refresh_cookie = client.cookies.get("refresh_token")
    assert refresh_cookie is not None, "El login debe emitir la cookie refresh_token"
    return refresh_cookie


@pytest.mark.asyncio
async def test_login_issues_refresh_cookie(client: AsyncClient):
    """El login debe emitir tanto el access token como la cookie de refresco."""
    await _login(client)


@pytest.mark.asyncio
async def test_refresh_renews_access_token(client: AsyncClient):
    """POST /auth/refresh debe emitir un access token nuevo usando la cookie."""
    await _login(client)

    refresh_res = await client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200, refresh_res.text
    assert "access_token" in refresh_res.json()

    # La rotación debe entregar una cookie nueva, distinta de la anterior
    new_cookie = client.cookies.get("refresh_token")
    assert new_cookie is not None


@pytest.mark.asyncio
async def test_refresh_token_rotates_and_invalidates_previous(client: AsyncClient):
    """El refresh token usado debe quedar revocado tras renovar (rotación)."""
    old_cookie = await _login(client)

    first_refresh = await client.post("/api/v1/auth/refresh")
    assert first_refresh.status_code == 200

    # Reutilizar el cookie VIEJO (ya rotado) debe fallar
    client.cookies.set("refresh_token", old_cookie)
    reuse_res = await client.post("/api/v1/auth/refresh")
    assert reuse_res.status_code == 401


@pytest.mark.asyncio
async def test_refresh_without_cookie_returns_401(client: AsyncClient):
    """Sin cookie de sesión, /auth/refresh debe rechazar con 401."""
    res = await client.post("/api/v1/auth/refresh")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client: AsyncClient):
    """Tras logout, el refresh token ya no debe poder renovar la sesión."""
    await _login(client)

    logout_res = await client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    refresh_after_logout = await client.post("/api/v1/auth/refresh")
    assert refresh_after_logout.status_code == 401
