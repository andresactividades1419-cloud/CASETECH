from collections.abc import AsyncGenerator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Convención de nombres para índices y constraints generados automáticamente
# (Issue #81). Todos los constraints existentes ya tienen nombre explícito
# en las migraciones (pk_usuarios, fk_movimientos_material_id, etc.) — esto
# solo asegura que cualquier constraint NUEVO que se agregue sin `name=`
# siga el mismo patrón, en vez de recibir un nombre autogenerado
# impredecible de PostgreSQL. Es el patrón recomendado por la documentación
# de Alembic para que `--autogenerate` pueda detectar y modificar
# constraints sin nombre en migraciones futuras.
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """
    Clase base declarativa para todos los modelos ORM de SQLAlchemy 2.0.
    """

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# Creación del engine asíncrono con pool pre-ping para estabilidad en Docker
engine: AsyncEngine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Fábrica de sesiones asíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependencia de FastAPI que provee una sesión de base de datos asíncrona por petición.
    Asegura el cierre limpio y rollback en caso de error no capturado.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
