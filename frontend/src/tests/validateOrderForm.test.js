import { describe, expect, it } from 'vitest';
import { validateOrderForm } from '../utils/validateOrderForm';

// Fecha fija: los tests no dependen del día en que se corran (FIRST: Repeatable).
const HOY = '2026-11-20';

// Un pedido válido; cada test cambia solo el campo que quiere probar.
const pedidoValido = {
  cliente: 'Constructora Andina',
  tipo_caseton_id: '1',
  cantidad: '10',
  fecha_entrega_estimada: '2026-11-25',
};

describe('validateOrderForm', () => {
  it('no devuelve errores cuando todos los campos son válidos', () => {
    // Arrange
    const form = { ...pedidoValido };

    // Act
    const errores = validateOrderForm(form, HOY);

    // Assert
    expect(errores).toEqual({});
  });

  it.each([
    ['', true],
    ['   ', true], // solo espacios
    ['Ab', true], // 2 caracteres: justo debajo del límite
    [' Ab ', true], // 2 caracteres con espacios alrededor
    ['Abc', false], // 3 caracteres: el límite exacto es válido
  ])('cliente "%s" → ¿error? %s', (cliente, hayError) => {
    // Act
    const errores = validateOrderForm({ ...pedidoValido, cliente }, HOY);

    // Assert
    expect('cliente' in errores).toBe(hayError);
  });

  it.each([
    ['', true],
    ['abc', true], // no es un número
    ['-1', true],
    ['0', true], // límite: 0 no es válido
    ['1', false], // límite: 1 es el mínimo válido
    ['500', false],
  ])('cantidad "%s" → ¿error? %s', (cantidad, hayError) => {
    // Act
    const errores = validateOrderForm({ ...pedidoValido, cantidad }, HOY);

    // Assert
    expect('cantidad' in errores).toBe(hayError);
  });

  it.each([
    ['', 'Ingrese la fecha estimada de entrega.'],
    ['2026-11-19', 'La fecha de entrega no puede ser pasada.'], // ayer
    ['2026-11-20', undefined], // límite: hoy es válido
    ['2026-11-21', undefined], // mañana
  ])('fecha de entrega "%s" → %s', (fecha, mensaje) => {
    // Act
    const errores = validateOrderForm(
      { ...pedidoValido, fecha_entrega_estimada: fecha },
      HOY,
    );

    // Assert
    expect(errores.fecha_entrega_estimada).toBe(mensaje);
  });

  it('exige seleccionar un tipo de casetón', () => {
    // Act
    const errores = validateOrderForm({ ...pedidoValido, tipo_caseton_id: '' }, HOY);

    // Assert
    expect(errores.tipo_caseton_id).toBe('Seleccione un tipo de casetón.');
  });
});

