"""
Reglas nuevas: cantidad y tipo_caseton_id no pueden pasar de lo que cabe en sus columnas.

Bootcamp de testing, semana 6 — test UNITARIO del hallazgo (sin base de datos).

¿Qué? Prueba los valores límite de MAX_INTEGER y MAX_BIGINT en OrderCreate.
¿Para qué? La regla es lógica de negocio: su prueba principal es rápida y sin Docker.
           El test de integración (tests/integration) queda como red de seguridad.
¿Impacto? Si alguien quita o cambia un límite, estos tests fallan en el CI.
"""

import pytest
from pydantic import ValidationError

from app.schemas.order import MAX_BIGINT, MAX_INTEGER, OrderCreate

BASE = {
    "cliente": "Constructora de Prueba",
    "tipo_caseton_id": 1,
    "cantidad": 10,
    "fecha_entrega_estimada": "2099-12-31",
}


@pytest.mark.parametrize(
    ("campo", "valor"),
    [("cantidad", 2_147_483_647), ("tipo_caseton_id", 9_223_372_036_854_775_807)],
)
def test_order_create_accepts_number_when_it_is_exactly_the_column_maximum(
    campo: str, valor: int
):
    pedido = OrderCreate(**{**BASE, campo: valor})

    assert getattr(pedido, campo) == valor


@pytest.mark.parametrize(
    ("campo", "valor"),
    [("cantidad", 2_147_483_648), ("tipo_caseton_id", 9_223_372_036_854_775_808)],
)
def test_order_create_rejects_number_when_it_is_one_above_the_column_maximum(
    campo: str, valor: int
):
    with pytest.raises(ValidationError):
        OrderCreate(**{**BASE, campo: valor})


def test_order_limits_match_postgresql_integer_and_bigint():
    # Los límites son los de PostgreSQL: 2^31 - 1 (INTEGER) y 2^63 - 1 (BIGINT)
    assert MAX_INTEGER == 2**31 - 1
    assert MAX_BIGINT == 2**63 - 1
