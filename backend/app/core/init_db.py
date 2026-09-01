"""
core/init_db.py — Inicialización y siembra automática (seeding) de datos esenciales.

Garantiza que en entornos de desarrollo y pruebas se inicialicen roles y usuarios
sin alterar contraseñas de cuentas existentes ni crear puertas traseras en producción.
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
    Únicamente se ejecuta cuando ENVIRONMENT != 'production'.
    En producción, la siembra automática se omite por seguridad.
    """
    if settings.ENVIRONMENT == "production":
        logger.info("init_db: Omitiendo siembra automática en entorno de producción.")
        return

    admin_password = settings.SEED_ADMIN_PASSWORD or "Admin1234"

    try:
        async with AsyncSessionLocal() as session:
            # 1. Asegurar Roles
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

            # 2. Asegurar Usuario Administrador (Idempotente: no reescribe contraseña si existe)
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
                logger.info("Usuario Administrador sembrado: admin@casetech.com")
            else:
                logger.debug("Usuario Administrador ya existe; preservando credenciales.")

            # 3. Asegurar Usuario Operario
            operario_user = (
                await session.execute(
                    select(User).where(User.email == "operario@casetech.com")
                )
            ).scalar_one_or_none()
            if not operario_user:
                operario = User(
                    nombre_completo="Operario Producción",
                    email="operario@casetech.com",
                    password_hash=get_password_hash("Operario1234"),
                    rol_id=2,
                    activo=True,
                )
                session.add(operario)
                logger.info("Usuario Operario sembrado: operario@casetech.com")
            else:
                logger.debug("Usuario Operario ya existe; preservando credenciales.")

            await session.commit()
            logger.info("Verificación de datos iniciales de desarrollo completada.")
    except Exception as exc:
        logger.warning(
            "init_db omitido o pendiente de migraciones Alembic: %s", exc
        )

