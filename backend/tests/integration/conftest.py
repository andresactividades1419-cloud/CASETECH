"""
backend/tests/integration/conftest.py — Fixtures para tests contra PostgreSQL REAL.

Bootcamp de testing, semana 6 (integración con BD real).

¿Qué? Conecta los tests de esta carpeta a la BD de pruebas `db-test` (docker compose),
      crea el esquema con las migraciones de Alembic y deshace cada test con rollback.
¿Para qué? Probar lo que SQLite no ve: longitudes de columna, restricciones, tipos
           de PostgreSQL y los Stored Procedures reales (que SQLite no puede ejecutar).
¿Impacto? Sin TEST_DATABASE_URL, todos los tests de esta carpeta se SALTAN (skipped):
          el CI y los tests de siempre (SQLite) siguen igual.

Cómo correrlos (desde la raíz del repo):
    docker compose up -d --wait db-test
    docker compose exec -e TEST_DATABASE_URL=postgresql+asyncpg://casetech_test:casetech_test@db-test:5432/casetech_test backend uv run pytest tests/integration -o addopts=""
    docker compose stop db-test
"""

import os
import subprocess
import sys
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.deps import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.role import Role
from app.models.user import User

# ¿Qué? La conexión llega SOLO por variable de entorno, nunca escrita en un test.
# ¿Para qué? El mismo test corre en cualquier computador (y en el CI de la semana 8).
# ¿Impacto? Si no está definida, los tests de esta carpeta se saltan.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _async_url(url: str) -> str:
    """Convierte la URL al driver async (asyncpg) que usa la app."""
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


def _plain_url(url: str) -> str:
    """
    URL sin driver (`postgresql://`), el mismo formato que usa docker-compose.yml.
    Con ella, config.py arma la URL async (asyncpg) para la app y Alembic usa
    psycopg2. Con `postgresql+psycopg2://` la app intentaría abrir el motor async
    con un driver síncrono y fallaría al importar app.core.database.
    """
    return _async_url(url).replace("postgresql+asyncpg://", "postgresql://", 1)


def pytest_collection_modifyitems(
    config: pytest.Config, items: list[pytest.Item]
) -> None:
    """
    ¿Qué? Sin TEST_DATABASE_URL, marca como "skipped" cada test de esta carpeta.
    ¿Para qué? Que la suite de siempre (y el CI) siga en verde sin Docker.
    ¿Impacto? Se marca ANTES de preparar fixtures: así ni siquiera se intenta migrar.
    """
    if TEST_DATABASE_URL:
        return
    skip = pytest.mark.skip(
        reason="needs TEST_DATABASE_URL (docker compose up -d --wait db-test)"
    )
    integration_dir = Path(__file__).parent
    for item in items:
        if integration_dir in item.path.parents:
            item.add_marker(skip)


@pytest.fixture(scope="session")
def migrated_database() -> str:
    """
    ¿Qué? Revisa que la URL sea de una BD de pruebas y le aplica `alembic upgrade head`.
    ¿Para qué? Que el esquema sea EXACTAMENTE el de producción (mismas migraciones,
               mismos Stored Procedures). Si una migración está rota, falla aquí.
    ¿Impacto? Se ejecuta una sola vez por corrida de pytest. Las migraciones son
              idempotentes: correrlas dos veces seguidas no cambia nada.
    """
    # Guardas de seguridad: jamás migrar ni escribir sobre la BD de desarrollo.
    database_name = make_url(_async_url(TEST_DATABASE_URL)).database or ""
    if not database_name.endswith("_test"):
        pytest.exit(
            f"TEST_DATABASE_URL apunta a '{database_name}': el nombre debe terminar en _test.",
            returncode=1,
        )
    if settings.DATABASE_URL and _async_url(settings.DATABASE_URL) == _async_url(
        TEST_DATABASE_URL
    ):
        pytest.exit(
            "TEST_DATABASE_URL no puede ser la BD de DATABASE_URL.", returncode=1
        )

    # alembic/env.py lee la URL de DATABASE_URL: se la pasamos a un proceso aparte
    # para no cambiar la configuración del proceso de pytest.
    env = {**os.environ, "DATABASE_URL": _plain_url(TEST_DATABASE_URL)}
    env.pop("ASYNC_DATABASE_URL", None)
    migration = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    if migration.returncode != 0:
        # Mostrar el error real de Alembic, no solo "exit status 1".
        pytest.exit(
            f"alembic upgrade head falló:\n{migration.stderr[-2000:]}", returncode=1
        )
    return _async_url(TEST_DATABASE_URL)


@pytest_asyncio.fixture
async def pg_session(migrated_database: str) -> AsyncGenerator[AsyncSession, None]:
    """
    ¿Qué? Sesión de SQLAlchemy contra PostgreSQL real, dentro de una transacción
          que NUNCA se confirma: al final del test se deshace con rollback.
    ¿Para qué? Que cada test empiece con la BD como la dejaron las migraciones,
               sin datos de otros tests.
    ¿Impacto? join_transaction_mode="create_savepoint" convierte los commit() y
              rollback() que hacen los servicios en savepoints: el rollback final
              borra TODO, aunque el código haya hecho commit.
    """
    # NullPool: una conexión nueva por test (cada test de pytest-asyncio tiene su
    # propio event loop y asyncpg no permite compartir conexiones entre loops).
    engine = create_async_engine(migrated_database, poolclass=NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        )
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
    await engine.dispose()


@pytest_asyncio.fixture
async def pg_client(pg_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    ¿Qué? Cliente HTTP de la app FastAPI que usa la sesión de PostgreSQL del test.
    ¿Para qué? Probar endpoints completos (ruta → servicio → BD real).
    ¿Impacto? Un error no controlado NO llega como 500: httpx lo vuelve a lanzar en
              el test, así se ve el error exacto de PostgreSQL (igual que en la receta).
    """

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        # Igual que get_db real: si la petición falla, deshace. Sin esto, después de
        # un error la sesión del test queda rota (PendingRollbackError) para el
        # siguiente request del mismo test.
        try:
            yield pg_session
        except Exception:
            await pg_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    limiter.reset()  # el rate limiter guarda contadores por proceso, no por test
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


async def _create_user_with_role(session: AsyncSession, role_name: str) -> User:
    """
    ¿Qué? Crea un usuario nuevo con el rol pedido (los roles los siembra la migración 001).
    ¿Para qué? Cada test prepara sus propios datos: no depende de usuarios ya existentes.
    ¿Impacto? El email lleva un código aleatorio, así nunca choca con el UNIQUE de email.
    """
    role = (
        await session.execute(select(Role).where(Role.nombre == role_name))
    ).scalar_one()
    user = User(
        nombre_completo=f"Prueba {role_name.title()}",
        email=f"{role_name.lower()}-{uuid.uuid4().hex[:8]}@test.casetech.com",
        password_hash=get_password_hash("Clave-De-Prueba-123"),
        rol_id=role.id,
        activo=True,
    )
    session.add(user)
    # commit (no flush): así un rollback del servicio más adelante en el test no
    # borra al usuario. Es seguro: el rollback del fixture al final lo deshace igual.
    await session.commit()
    return user


@pytest_asyncio.fixture
async def pg_admin_headers(pg_session: AsyncSession) -> dict[str, str]:
    """Encabezado Authorization de un ADMINISTRADOR creado en este test."""
    user = await _create_user_with_role(pg_session, "ADMINISTRADOR")
    token = create_access_token(data={"sub": user.email, "rol": "ADMINISTRADOR"})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def pg_operario_headers(pg_session: AsyncSession) -> dict[str, str]:
    """Encabezado Authorization de un OPERARIO creado en este test."""
    user = await _create_user_with_role(pg_session, "OPERARIO")
    token = create_access_token(data={"sub": user.email, "rol": "OPERARIO"})
    return {"Authorization": f"Bearer {token}"}
