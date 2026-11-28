"""
Tests con dobles de la sesión de base de datos (bootcamp semana 5, capa BD).

El servicio create_material recibe la sesión de SQLAlchemy como parámetro.
Aquí se reemplaza por un MOCK (unittest.mock.AsyncMock) para verificar,
sin ninguna base de datos, que el servicio NO guarda nada ante datos
inválidos y que SÍ guarda lo correcto.
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.schemas.material import MaterialCreate
from app.services.material_service import create_material

NUEVO_MATERIAL = MaterialCreate(
    nombre="Cemento gris",
    unidad_medida="kg",
    stock_actual=Decimal("50"),
    stock_minimo=Decimal("10"),
)


def _sesion_falsa(material_existente: object | None) -> AsyncMock:
    """Arma un doble de AsyncSession.

    - execute(): STUB. Simula la consulta "¿ya existe un material con ese
      nombre?" y responde lo que diga el test.
    - add(), commit(), rollback(): MOCKS. Registran si se llamaron y con qué.
    - refresh(): FAKE. Imita a la BD asignando id y created_at al objeto.
    """
    sesion = AsyncMock()
    resultado = MagicMock()
    resultado.scalar_one_or_none.return_value = material_existente
    sesion.execute.return_value = resultado
    sesion.add = MagicMock()  # en SQLAlchemy, add() no es async

    async def refresh_falso(obj: object) -> None:
        obj.id = 99  # type: ignore[attr-defined]
        obj.created_at = datetime(2026, 11, 27, 10, 0)  # type: ignore[attr-defined]
        obj.updated_at = None  # type: ignore[attr-defined]

    sesion.refresh.side_effect = refresh_falso
    return sesion


async def test_duplicate_name_is_rejected_and_nothing_is_saved() -> None:
    # Arrange: la "BD" responde que ya existe un material con ese nombre
    sesion = _sesion_falsa(material_existente=object())

    # Act
    with pytest.raises(HTTPException) as error:
        await create_material(sesion, NUEVO_MATERIAL, user_id=1)

    # Assert (comportamiento): 409 y el servicio NO intentó guardar
    assert error.value.status_code == 409
    sesion.add.assert_not_called()
    sesion.commit.assert_not_called()


async def test_valid_material_is_saved_with_the_given_data() -> None:
    # Arrange: el nombre no existe todavía
    sesion = _sesion_falsa(material_existente=None)

    # Act
    respuesta = await create_material(sesion, NUEVO_MATERIAL, user_id=1)

    # Assert (comportamiento): se guardó UNA vez y con los datos correctos
    sesion.add.assert_called_once()
    guardado = sesion.add.call_args.args[0]
    assert guardado.nombre == "Cemento gris"
    assert guardado.activo is True
    sesion.commit.assert_awaited_once()

    # Assert (estado): la respuesta trae lo que asignó la "BD"
    assert respuesta.id == 99
    assert respuesta.stock_actual == Decimal("50")


async def test_integrity_error_rolls_back_and_returns_422() -> None:
    # Arrange: la BD rechaza el guardado (por ejemplo, una restricción única)
    sesion = _sesion_falsa(material_existente=None)
    sesion.commit.side_effect = IntegrityError("INSERT", {}, Exception("duplicado"))

    # Act
    with pytest.raises(HTTPException) as error:
        await create_material(sesion, NUEVO_MATERIAL, user_id=1)

    # Assert (comportamiento): se deshizo la transacción y el error es claro
    assert error.value.status_code == 422
    sesion.rollback.assert_awaited_once()
    sesion.refresh.assert_not_called()
