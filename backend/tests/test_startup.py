"""
tests/test_startup.py — Pruebas del arranque y del manejo de errores del backend.

¿Qué? Verifica /health (con y sin base de datos), el manejador global de
errores no controlados y el mensaje claro cuando falta una variable de entorno.
¿Para qué? Que el backend arranque sin errores, informe su estado real y, cuando
algo falla, diga qué pasó en vez de mostrar un traceback ilegible.
¿Impacto? Si estas pruebas se rompen, Docker podría marcar "healthy" a un
backend sin base de datos, o un error interno filtraría detalles al cliente.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_db
from app.core import config
from app.core.config import settings
from app.core.database import engine
from app.main import app


@pytest.mark.asyncio
async def test_health_reports_ok_and_current_version(client: AsyncClient):
    """/health responde 200 con la versión real y la base de datos en "ok"."""
    response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["version"] == settings.VERSION
    assert body["version"] != "1.0.0"  # la versión por defecto vieja ya no debe aparecer


@pytest.mark.asyncio
async def test_health_returns_503_when_database_is_down(client: AsyncClient):
    """Si la base de datos no responde, /health debe fallar (503), no decir "ok"."""

    class BrokenSession:
        async def execute(self, *args, **kwargs):
            raise ConnectionError("la base de datos no responde")

    async def broken_db():
        yield BrokenSession()

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = broken_db
    try:
        response = await client.get("/health")
    finally:
        if previous is not None:
            app.dependency_overrides[get_db] = previous

    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
    assert response.json()["database"] == "error"


@pytest.mark.asyncio
async def test_unhandled_exception_returns_json_without_internal_details():
    """Un error imprevisto devuelve JSON {"detail": ...} y no filtra el mensaje interno."""

    async def boom() -> None:
        raise RuntimeError("detalle interno: SELECT * FROM usuarios")

    app.add_api_route("/__test_boom__", boom, methods=["GET"])
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/__test_boom__")
    finally:
        app.router.routes.pop()  # deja la app tal como estaba

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/json")
    detail = response.json()["detail"]
    assert "Error interno del servidor" in detail
    assert "SELECT" not in detail and "usuarios" not in detail


def test_missing_env_variable_gives_clear_message(monkeypatch, tmp_path, capsys):
    """Sin JWT_SECRET el arranque termina con un mensaje claro, no con un traceback."""
    monkeypatch.chdir(tmp_path)  # evita que se lea un .env real de la carpeta actual
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(SystemExit) as exc_info:
        config.load_settings()

    assert exc_info.value.code == 1
    stderr = capsys.readouterr().err
    assert "CASETECH no pudo arrancar" in stderr
    assert "JWT_SECRET" in stderr
    assert "falta definirla" in stderr
    assert "Traceback" not in stderr


def test_placeholder_password_in_production_gives_clear_message(
    monkeypatch, tmp_path, capsys
):
    """Una contraseña de ejemplo fuera de development también se explica con claridad."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ADMIN_INITIAL_PASSWORD", "CAMBIA_ESTA_CONTRASENA_ADMIN")

    with pytest.raises(SystemExit):
        config.load_settings()

    stderr = capsys.readouterr().err
    assert "ADMIN_INITIAL_PASSWORD" in stderr
    assert ".env.example" in stderr


def test_sql_echo_is_off_by_default():
    """El log de SQL no debe estar atado a DEBUG: apagado salvo que se pida."""
    assert settings.SQL_ECHO is False
    assert engine.echo is False
