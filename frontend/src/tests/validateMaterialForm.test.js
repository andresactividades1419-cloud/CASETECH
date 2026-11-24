import { describe, expect, it } from 'vitest';
import { validateMaterialForm } from '../utils/validateMaterialForm';

// Un insumo válido; cada test cambia solo el campo que quiere probar.
const insumoValido = {
  nombre: 'Icopor 1x1',
  unidad_medida: 'unidad',
  stock_actual: '20',
  stock_minimo: '10',
};

describe('validateMaterialForm', () => {
  it('no devuelve errores cuando todos los campos son válidos', () => {
    // Arrange
    const form = { ...insumoValido };

    // Act
    const errores = validateMaterialForm(form);

    // Assert
    expect(errores).toEqual({});
  });

  it.each([
    ['', 'El nombre del insumo es obligatorio.'],
    ['   ', 'El nombre del insumo es obligatorio.'], // solo espacios
    ['Ab', 'Debe tener al menos 3 caracteres.'], // 2 caracteres: justo debajo del límite
    ['Abc', undefined], // 3 caracteres: el límite exacto es válido
  ])('nombre = "%s" → %s', (nombre, mensaje) => {
    // Act
    const errores = validateMaterialForm({ ...insumoValido, nombre });

    // Assert
    expect(errores.nombre).toBe(mensaje);
  });

  it('exige seleccionar una unidad de medida', () => {
    // Act
    const errores = validateMaterialForm({ ...insumoValido, unidad_medida: '' });

    // Assert
    expect(errores.unidad_medida).toBe('Seleccione una unidad de medida válida.');
  });

  it.each([
    ['', true], // vacío
    ['-1', true], // límite: justo debajo de 0
    ['0', false], // límite: 0 es válido
  ])('stock_minimo = "%s" → ¿error? %s', (stock_minimo, hayError) => {
    // Act
    const errores = validateMaterialForm({ ...insumoValido, stock_minimo });

    // Assert
    expect('stock_minimo' in errores).toBe(hayError);
  });

  it.each([
    ['', true], // vacío
    ['abc', true], // no es un número
    ['-1', true], // límite: justo debajo de 0
    ['0', false], // límite: 0 es válido (bodega vacía)
  ])('stock_actual = "%s" → ¿error? %s', (stock_actual, hayError) => {
    // Act
    const errores = validateMaterialForm({ ...insumoValido, stock_actual });

    // Assert
    expect('stock_actual' in errores).toBe(hayError);
  });
});
