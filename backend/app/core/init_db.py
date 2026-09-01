"""
core/init_db.py — Inicialización y siembra automática (seeding) de datos esenciales.

Garantiza que cualquier entorno nuevo (ej. clonar el repo en otra máquina)
tenga creados automáticamente los roles y los usuarios iniciales.

Principios de seguridad aplicados (Issue #48):
- La siembra SOLO se ejecuta en entornos distintos de "production".
- Las contraseñas iniciales se leen EXCLUSIVAMENTE desde variables de entorno
  (settings.ADMIN_INITIAL_PASSWORD / settings.OPERARIO_INITIAL_PASSWORD).
  Nunca se usan literales fijos.
- La siembra es estrictamente idempotente: si el usuario ya existe, su
  contraseña NO se sobreescribe en reinicios.
"""

import logging

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User

logger = logging.getLogger("casetech.init_db")


async def init_db() -> None:
    """
    Verifica y siembra roles y usuarios iniciales si no existen.

    - Solo se ejecuta cuando ENVIRONMENT != "production".
    - Idempotente: no sobreescribe datos existentes.
    - Contraseñas leídas desde variables de entorno (SecretStr).
    """
    if settings.ENVIRONMENT == "production":
        logger.info(
            "init_db: ENVIRONMENT='production' — siembra automática omitida. "
            "Gestionar usuarios mediante herramientas de administración."
        )
        return

    try:
        async with AsyncSessionLocal() as session:
            # ------------------------------------------------------------------
            # 1. Asegurar Roles (idempotente por nombre)
            # ------------------------------------------------------------------
            roles_data = [
                (1, "ADMINISTRADOR", "Acceso completo a todos los módulos y configuraciones"),
                (2, "OPERARIO", "Acceso a operaciones de producción e inventario"),
            ]
            for role_id, nombre, desc in roles_data:
                existing_role = (
                    await session.execute(select(Role).where(Role.nombre == nombre))
                ).scalar_one_or_none()
                if not existing_role:
                    new_role = Role(id=role_id, nombre=nombre, descripcion=desc)
                    session.add(new_role)
                    logger.info("Rol sembrado automáticamente: %s", nombre)

            await session.flush()

            # ------------------------------------------------------------------
            # 2. Asegurar Usuario Administrador (idempotente — NO sobreescribe)
            # ------------------------------------------------------------------
            admin_user = (
                await session.execute(
                    select(User).where(User.email == "admin@casetech.com")
                )
            ).scalar_one_or_none()

            if not admin_user:
                # El usuario no existe: crear con la contraseña del entorno
                admin_password = settings.ADMIN_INITIAL_PASSWORD.get_secret_value()
                admin = User(
                    nombre_completo="Administrador CASETECH",
                    email="admin@casetech.com",
                    password_hash=get_password_hash(admin_password),
                    rol_id=1,
                    activo=True,
                )
                session.add(admin)
                logger.info(
                    "Usuario Administrador sembrado: admin@casetech.com "
                    "(contraseña desde ADMIN_INITIAL_PASSWORD)"
                )
            else:
                # El usuario ya existe: NO sobreescribir contraseña (idempotencia)
                logger.info(
                    "Usuario Administrador ya existe (admin@casetech.com) — "
                    "contraseña preservada sin cambios."
                )

            # ------------------------------------------------------------------
            # 3. Asegurar Usuario Operario (idempotente — NO sobreescribe)
            # ------------------------------------------------------------------
            operario_user = (
                await session.execute(
                    select(User).where(User.email == "operario@casetech.com")
                )
            ).scalar_one_or_none()

            if not operario_user:
                operario_password = settings.OPERARIO_INITIAL_PASSWORD.get_secret_value()
                operario = User(
                    nombre_completo="Operario Producción",
                    email="operario@casetech.com",
                    password_hash=get_password_hash(operario_password),
                    rol_id=2,
                    activo=True,
                )
                session.add(operario)
                logger.info(
                    "Usuario Operario sembrado: operario@casetech.com "
                    "(contraseña desde OPERARIO_INITIAL_PASSWORD)"
                )
            else:
                logger.info(
                    "Usuario Operario ya existe (operario@casetech.com) — "
                    "contraseña preservada sin cambios."
                )

            await session.commit()
            logger.info("Verificación de datos iniciales completada.")

    except Exception as exc:
        logger.warning(
            "init_db omitido o pendiente de migraciones Alembic: %s", exc
        )

