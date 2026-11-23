"""
tests/test_create_admin.py — Pruebas del script que crea el administrador inicial.

¿Qué? Verifica que `create_admin` cree el usuario, no pise uno existente,
restablezca/desbloquee cuando se pide y rechace contraseñas débiles.
¿Para qué? En producción este script es la ÚNICA forma de tener un primer usuario
(init_db no siembra nada allí), así que no puede fallar en silencio.
¿Impacto? Si se rompe, un despliegue nuevo queda sin nadie que pueda iniciar sesión.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User
from app.scripts import create_admin as script
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def use_test_database(monkeypatch: pytest.MonkeyPatch) -> None:
    """El script debe hablar con la BD de pruebas (SQLite), no con PostgreSQL."""
    monkeypatch.setattr(script, "AsyncSessionLocal", TestingSessionLocal)


async def get_user(email: str) -> User | None:
    async with TestingSessionLocal() as session:
        return (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()


@pytest.mark.asyncio
async def test_creates_new_admin_who_can_log_in(
    db_session: AsyncSession, client: AsyncClient
):
    message = await script.create_admin("jefe@tuempresa.com", "Jefe Planta", "Segura2026")

    assert "Administrador creado" in message
    user = await get_user("jefe@tuempresa.com")
    assert user is not None and user.rol_id == 1 and user.activo
    assert verify_password("Segura2026", user.password_hash)

    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "jefe@tuempresa.com", "password": "Segura2026"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_does_not_overwrite_existing_user_by_default(db_session: AsyncSession):
    # admin@casetech.com ya existe en los datos semilla con la contraseña "Admin1234"
    message = await script.create_admin("admin@casetech.com", "Otro Nombre", "Nueva2026x")

    assert "no se modificó" in message
    user = await get_user("admin@casetech.com")
    assert user is not None
    assert verify_password("Admin1234", user.password_hash)  # sigue la contraseña vieja


@pytest.mark.asyncio
async def test_reset_password_changes_it_and_unlocks_account(db_session: AsyncSession):
    async with TestingSessionLocal() as session:
        locked = (
            await session.execute(select(User).where(User.email == "admin@casetech.com"))
        ).scalar_one()
        locked.activo = False
        locked.intentos_fallidos = 5
        await session.commit()

    message = await script.create_admin(
        "admin@casetech.com", "Admin", "Nueva2026x", reset_password=True
    )

    assert "restablecida" in message
    user = await get_user("admin@casetech.com")
    assert user is not None
    assert user.activo is True
    assert user.intentos_fallidos == 0
    assert verify_password("Nueva2026x", user.password_hash)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("password", "reason"),
    [("corta1A", "8"), ("sinmayuscula1", "mayúscula"), ("SinNumeroAqui", "dígito")],
)
async def test_weak_password_is_rejected(
    db_session: AsyncSession, password: str, reason: str
):
    with pytest.raises(SystemExit) as exc_info:
        await script.create_admin("debil@tuempresa.com", "Debil", password)

    assert reason in str(exc_info.value)
    assert await get_user("debil@tuempresa.com") is None
