import asyncio
from logging.config import fileConfig
import sys
import os

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Asegurar que el directorio raíz del backend esté en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.models import Base  # Importa todos los modelos registrados en Base.metadata

# Configuración de Logging de Alembic
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadatos del ORM para autogenerate
target_metadata = Base.metadata

# Inyectar la URL de la base de datos desde settings
config.set_main_option("sqlalchemy.url", settings.SQLALCHEMY_DATABASE_URI)


def run_migrations_offline() -> None:
    """
    Ejecuta migraciones en modo 'offline'.
    Configura el contexto únicamente con un URL y no con un Engine.
    """
    url = settings.SQLALCHEMY_SYNC_DATABASE_URI
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Crea un AsyncEngine y ejecuta las migraciones de forma asíncrona.
    """
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = settings.SQLALCHEMY_DATABASE_URI

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Ejecuta migraciones en modo 'online' usando el bucle de eventos asyncio.
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
