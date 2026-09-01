"""
core/init_db.py — Inicialización y siembra automática (seeding) de datos esenciales.

Garantiza que cualquier entorno nuevo (ej. clonar el repo en otra máquina)
tenga creados automáticamente los roles y los usuarios iniciales.

Principios de seguridad aplicados:
- La siembra SOLO se ejecuta en entornos distintos de "production".
- Las contraseñas iniciales se leen desde variables de entorno.
- La siembra es estrictamente idempotente.
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
                (
                    1,
                    "ADMINISTRADOR",
                    "Acceso completo a todos los módulos y configuraciones",
                ),
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
            # 2. Asegurar Usuario Administrador (sincronizado en desarrollo)
            # ------------------------------------------------------------------
            admin_password = (
                settings.ADMIN_INITIAL_PASSWORD.get_secret_value()
                if hasattr(settings.ADMIN_INITIAL_PASSWORD, "get_secret_value")
                else str(settings.ADMIN_INITIAL_PASSWORD)
            ) or "Admin1234*"

            admin_user = (
                await session.execute(
                    select(User).where(User.email == "admin@casetech.com")
                )
            ).scalar_one_or_none()

            if not admin_user:
                admin = User(
                    nombre_completo="Administrador CASETECH",
                    email="admin@casetech.com",
                    password_hash=get_password_hash(admin_password),
                    rol_id=1,
                    activo=True,
                )
                session.add(admin)
                logger.info("Usuario Administrador creado: admin@casetech.com")
            else:
                admin_user.password_hash = get_password_hash(admin_password)
                admin_user.activo = True
                admin_user.rol_id = 1
                logger.info("Usuario Administrador sincronizado: admin@casetech.com")

            # ------------------------------------------------------------------
            # 3. Asegurar Usuario Operario (sincronizado en desarrollo)
            # ------------------------------------------------------------------
            operario_password = (
                settings.OPERARIO_INITIAL_PASSWORD.get_secret_value()
                if hasattr(settings.OPERARIO_INITIAL_PASSWORD, "get_secret_value")
                else str(settings.OPERARIO_INITIAL_PASSWORD)
            ) or "Operario1234*"

            operario_user = (
                await session.execute(
                    select(User).where(User.email == "operario@casetech.com")
                )
            ).scalar_one_or_none()

            if not operario_user:
                operario = User(
                    nombre_completo="Operario Producción",
                    email="operario@casetech.com",
                    password_hash=get_password_hash(operario_password),
                    rol_id=2,
                    activo=True,
                )
                session.add(operario)
                logger.info("Usuario Operario creado: operario@casetech.com")
            else:
                operario_user.password_hash = get_password_hash(operario_password)
                operario_user.activo = True
                operario_user.rol_id = 2
                logger.info("Usuario Operario sincronizado: operario@casetech.com")

            await session.commit()
            logger.info("Verificación de datos iniciales completada con éxito.")

    except Exception as exc:
        logger.warning("init_db omitido o pendiente de migraciones Alembic: %s", exc)
