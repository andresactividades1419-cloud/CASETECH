"""
core/init_db.py — Inicialización y siembra automática (seeding) de datos esenciales.

Garantiza que cualquier entorno nuevo (ej. clonar el repo en otra máquina)
tenga creados automáticamente los roles y los usuarios iniciales (Admin y Operario).
"""

import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User

logger = logging.getLogger("casetech.init_db")


async def init_db() -> None:
    """
    Verifica y siembra roles y usuarios iniciales si no existen.
    Se ejecuta de forma segura e idempotente al iniciar la aplicación.
    """
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

            # 2. Asegurar Usuario Administrador
            admin_user = (
                await session.execute(
                    select(User).where(User.email == "admin@casetech.com")
                )
            ).scalar_one_or_none()
            if not admin_user:
                admin = User(
                    nombre_completo="Administrador CASETECH",
                    email="admin@casetech.com",
                    password_hash=get_password_hash("Admin1234"),
                    rol_id=1,
                    activo=True,
                )
                session.add(admin)
                logger.info("Usuario Administrador sembrado: admin@casetech.com")
            else:
                # Asegurar que esté activo y con contraseña por defecto sincronizada
                admin_user.activo = True
                admin_user.password_hash = get_password_hash("Admin1234")
                admin_user.rol_id = 1
                logger.info("Usuario Administrador verificado y activo: admin@casetech.com")

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
                # Asegurar que esté activo y con contraseña por defecto sincronizada
                operario_user.activo = True
                operario_user.password_hash = get_password_hash("Operario1234")
                operario_user.rol_id = 2
                logger.info("Usuario Operario verificado y activo: operario@casetech.com")

            await session.commit()
            logger.info("Verificación de datos iniciales completada.")
    except Exception as exc:
        logger.warning(
            "init_db omitido o pendiente de migraciones Alembic: %s", exc
        )

