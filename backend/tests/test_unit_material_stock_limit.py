"""
Regla nueva: el stock de un material no puede pasar de lo que cabe en NUMERIC(12,3).

Bootcamp de testing, semana 6 — test UNITARIO del hallazgo (sin base de datos).

¿Qué? Prueba los valores límite de MAX_STOCK en los schemas de materiales.
¿Para qué? La regla es lógica de negocio: su prueba principal es rápida y sin Docker.
           El test de integración (tests/integration) queda como red de seguridad.
¿Impacto? Si alguien quita o cambia el límite, estos tests fallan en el CI.
"""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.material import MaterialCreate, MaterialUpdate

BASE = {"nombre": "Cemento gris", "unidad_medida": "kg"}


@pytest.mark.parametrize("campo", ["stock_actual", "stock_minimo"])
def test_material_create_accepts_stock_when_it_is_exactly_the_column_maximum(
    campo: str,
):
    material = MaterialCreate(**BASE, **{campo: Decimal("999999999.999")})

    assert getattr(material, campo) == Decimal("999999999.999")


@pytest.mark.parametrize("campo", ["stock_actual", "stock_minimo"])
def test_material_create_rejects_stock_when_it_is_above_the_column_maximum(
    campo: str,
):
    with pytest.raises(ValidationError):
        MaterialCreate(**BASE, **{campo: Decimal("1000000000.000")})


@pytest.mark.parametrize("campo", ["stock_actual", "stock_minimo"])
def test_material_update_rejects_stock_when_it_is_above_the_column_maximum(
    campo: str,
):
    with pytest.raises(ValidationError):
        MaterialUpdate(**{campo: Decimal("1000000000.000")})
