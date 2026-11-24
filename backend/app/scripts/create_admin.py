"""
scripts/create_admin.py — Crea (o repara) el usuario ADMINISTRADOR inicial.

¿Qué? Comando de una sola vez que asegura los 2 roles y crea un administrador.
¿Para qué? En producción ``init_db`` NO siembra usuarios a propósito (para no dejar
credenciales conocidas), así que una base de datos nueva queda sin nadie que pueda
iniciar sesión. Este script resuelve ese primer paso de forma controlada.
¿Impacto? Es idempotente: si el correo ya existe NO toca su contraseña (a menos que
se use --reset-password), así que ejecutarlo dos veces no pisa nada por accidente.

Uso (con el stack de producción corriendo):

    docker compose -f docker-compose.prod.yml exec backend \
        python -m app.scripts.create_admin --email admin@tuempresa.com

La contraseña se pide por teclado (no queda en el historial de la terminal). Para
automatizar, se puede pasar por la variable de entorno CREATE_ADMIN_PASSWORD.
"""

import argparse
import asyncio
import getpass
import os

from pydantic import ValidationError
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate

ROLES = [
    (1, "ADMINISTRADOR", "Acceso completo a todos los módulos y configuraciones"),
    (2, "OPERARIO", "Acceso a operaciones de producción e inventario"),
]


def read_password() -> str:
    """Toma la contraseña de CREATE_ADMIN_PASSWORD o la pide dos veces por teclado."""
    from_env = os.environ.get("CREATE_ADMIN_PASSWORD")
    if from_env:
        return from_env
    first = getpass.getpass("Contraseña del administrador: ")
    second = getpass.getpass("Repite la contraseña: ")
    if first != second:
        raise SystemExit("❌ Las contraseñas no coinciden. No se creó nada.")
    return first


async def create_admin(
    email: str, name: str, password: str, reset_password: bool = False
) -> str:
    """
    Crea los roles y el administrador. Devuelve un mensaje con lo que pasó.

    Valida con el mismo schema que usa la API (UserCreate): así la contraseña
    cumple la misma política (8+ caracteres, una mayúscula y un dígito).
    """
    try:
        data = UserCreate(
            email=email,
            nombre_completo=name,
            password=password,
            rol_id=1,
            activo=True,
        )
    except ValidationError as exc:
        reasons = "; ".join(err["msg"].removeprefix("Value error, ") for err in exc.errors())
        raise SystemExit(f"❌ Datos inválidos: {reasons}") from None

    async with AsyncSessionLocal() as session:
        for role_id, role_name, description in ROLES:
            existing = (
                await session.execute(select(Role).where(Role.nombre == role_name))
            ).scalar_one_or_none()
            if existing is None:
                session.add(Role(id=role_id, nombre=role_name, descripcion=description))
        await session.flush()

        user = (
            await session.execute(select(User).where(User.email == data.email))
        ).scalar_one_or_none()

        if user is None:
            session.add(
                User(
                    nombre_completo=data.nombre_completo,
                    email=data.email,
                    password_hash=get_password_hash(password),
                    rol_id=1,
                    activo=True,
                )
            )
            message = f"✅ Administrador creado: {data.email}"
        elif reset_password:
            user.password_hash = get_password_hash(password)
            user.activo = True
            user.rol_id = 1
            user.intentos_fallidos = 0  # también desbloquea una cuenta bloqueada
            message = f"✅ Contraseña restablecida y cuenta activada: {data.email}"
        else:
            message = (
                f"ℹ️  Ya existe un usuario con el correo {data.email}; no se modificó. "
                "Usa --reset-password si quieres cambiarle la contraseña."
            )

        await session.commit()
    return message


def main() -> None:
    parser = argparse.ArgumentParser(description="Crea el administrador inicial de CASETECH.")
    parser.add_argument("--email", required=True, help="Correo del administrador.")
    parser.add_argument(
        "--name", default="Administrador CASETECH", help="Nombre completo (opcional)."
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Si el correo ya existe, cambia su contraseña y reactiva la cuenta.",
    )
    args = parser.parse_args()

    password = read_password()
    print(asyncio.run(create_admin(args.email, args.name, password, args.reset_password)))


if __name__ == "__main__":
    main()
