"""
backend/tests/conftest.py — Configuración de fixtures asíncronas para pruebas de integración.

Provee:
- Configuración de variables de entorno para tests aislados.
- Motor y sesión SQLAlchemy async en memoria con SQLite (aiosqlite).
- Fixture `db_session` con recreación de esquema y datos semilla.
- Fixture `client` con httpx.AsyncClient conectado a la app FastAPI.
- Fixtures de autenticación: `admin_headers` y `operario_headers`.
"""

import os
from collections.abc import AsyncGenerator

# Configurar variables de entorno antes de importar componentes de la aplicación
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "False"
os.environ["JWT_SECRET"] = "super-secret-test-key-minimum-32-bytes-long-for-testing-ci-12345"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["POSTGRES_PASSWORD"] = "testpassword123"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import BigInteger, Integer
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_db
from app.core.database import Base
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.material import Material
from app.models.product_type import ProductType
from app.models.recipe import Recipe
from app.models.role import Role
from app.models.user import User

# Motor de base de datos SQLite asíncrono para aislamiento total en tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Adaptar BigInteger PKs a Integer para que SQLite asigne autoincrement automáticamente
for table in Base.metadata.tables.values():
    for column in table.columns:
        if column.primary_key and isinstance(column.type, BigInteger):
            column.type = Integer()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Crea un esquema de base de datos limpio para cada prueba con datos semilla."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # 1. Sembrar Roles
        admin_role = Role(id=1, nombre="ADMINISTRADOR", descripcion="Administrador del sistema")
        operario_role = Role(id=2, nombre="OPERARIO", descripcion="Operario de planta")
        session.add_all([admin_role, operario_role])
        await session.flush()

        # 2. Sembrar Usuarios
        admin_user = User(
            id=1,
            nombre_completo="Admin Test",
            email="admin@casetech.com",
            password_hash=get_password_hash("Admin1234"),
            rol_id=1,
            activo=True,
        )
        operario_user = User(
            id=2,
            nombre_completo="Operario Test",
            email="operario@casetech.com",
            password_hash=get_password_hash("Operario1234"),
            rol_id=2,
            activo=True,
        )
        session.add_all([admin_user, operario_user])
        await session.flush()

        # 3. Sembrar Tipos de Casetón
        tipo_lona = ProductType(
            id=1,
            nombre="Casetón Lona 60x60",
            descripcion="Casetón recuperable de lona",
            naturaleza="RECUPERABLE",
            activo=True,
        )
        tipo_perdido = ProductType(
            id=2,
            nombre="Casetón Icopor Perdido",
            descripcion="Casetón de poliestireno perdido",
            naturaleza="PERDIDO",
            activo=True,
        )
        session.add_all([tipo_lona, tipo_perdido])
        await session.flush()

        # 4. Sembrar Materia Prima inicial
        lona_mat = Material(
            id=1,
            nombre="Lona Impermeable 600D",
            unidad_medida="M2",
            stock_actual=10.000,
            stock_minimo=5.000,
            activo=True,
        )
        madera_mat = Material(
            id=2,
            nombre="Listón de Madera 2x2",
            unidad_medida="M",
            stock_actual=2.000,  # Stock bajo intencional para probar déficit
            stock_minimo=10.000,
            activo=True,
        )
        session.add_all([lona_mat, madera_mat])
        await session.flush()

        # 5. Sembrar Recetas (BOM)
        # 1 Casetón Lona requiere 1.5 M2 de lona y 4 M de madera
        receta1 = Recipe(
            id=1,
            tipo_caseton_id=1,
            material_id=1,
            cantidad_por_unidad=1.5000,
        )
        receta2 = Recipe(
            id=2,
            tipo_caseton_id=1,
            material_id=2,
            cantidad_por_unidad=4.0000,
        )
        session.add_all([receta1, receta2])

        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Cliente HTTP de pruebas con inyección de sesión de BD."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def admin_token() -> str:
    """Genera token JWT para rol ADMINISTRADOR."""
    return create_access_token(data={"sub": "admin@casetech.com", "rol": "ADMINISTRADOR"})


@pytest.fixture
def operario_token() -> str:
    """Genera token JWT para rol OPERARIO."""
    return create_access_token(data={"sub": "operario@casetech.com", "rol": "OPERARIO"})


@pytest.fixture
def admin_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def operario_headers(operario_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {operario_token}"}
