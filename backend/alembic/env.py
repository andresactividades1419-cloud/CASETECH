import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection

from alembic import context

# Asegurar que el directorio raíz del backend esté en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings

# Configuración de Logging de Alembic
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata solo se usa para `alembic revision --autogenerate`.
#
# IMPORTANTE: no pasar aquí `Base.metadata` (de `app.models`). Tiene un
# naming_convention (Issue #81) que Alembic reutiliza al ejecutar el DDL de
# las migraciones (op.create_table, op.drop_constraint, etc.) — incluso
# cuando el constraint ya trae un `name=` explícito en la migración, la
# convención lo reinterpreta como el token %(constraint_name)s y lo duplica
# (ej. "ck_tipos_caseton_naturaleza" termina en
# "ck_tipos_caseton_ck_tipos_caseton_naturaleza"). Esto rompió un arranque
# desde cero (ver migración 007 y el `docker compose down -v` del
# 2026-09-07). Este proyecto nunca ha usado `--autogenerate` (todas las
# migraciones están escritas a mano), así que se deja en None. Si algún día
# se necesita autogenerate de verdad, importar `from app.models import Base`
# y usar `Base.metadata` puntualmente solo para esa sesión.
target_metadata = None

# Inyectar la URL SÍNCRONA (psycopg2) desde settings — Alembic no soporta asyncpg
config.set_main_option("sqlalchemy.url", settings.SQLALCHEMY_SYNC_DATABASE_URI)


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


def run_migrations_online() -> None:
    """
    Ejecuta migraciones en modo 'online' usando un engine SÍNCRONO (psycopg2).
    Alembic no requiere async — el engine async es exclusivo del runtime FastAPI.
    """
    from sqlalchemy import create_engine

    connectable = create_engine(
        settings.SQLALCHEMY_SYNC_DATABASE_URI,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
