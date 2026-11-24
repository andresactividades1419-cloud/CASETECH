/**
 * utils/validateMaterialForm.js — Reglas de validación del formulario de insumos.
 *
 * ¿Qué? Revisa los campos del insumo y devuelve un objeto { campo: mensaje }.
 * ¿Para qué? Sacar la regla del componente MaterialModal para probarla como unidad.
 * ¿Impacto? Si falla, se podrían registrar insumos sin nombre o con stock negativo,
 *           y las alertas de stock crítico del inventario quedarían mal calculadas.
 *
 * @param {object} formData Valores del formulario (nombre, unidad_medida,
 *                          stock_actual, stock_minimo) tal como los guarda el componente.
 * @returns {object} Errores por campo. Vacío si el formulario es válido.
 */
export function validateMaterialForm(formData) {
  const newErrors = {};

  if (!formData.nombre.trim()) {
    newErrors.nombre = 'El nombre del insumo es obligatorio.';
  } else if (formData.nombre.trim().length < 3) {
    newErrors.nombre = 'Debe tener al menos 3 caracteres.';
  }

  if (!formData.unidad_medida) {
    newErrors.unidad_medida = 'Seleccione una unidad de medida válida.';
  }

  const stockMin = Number(formData.stock_minimo);
  if (formData.stock_minimo === '' || isNaN(stockMin) || stockMin < 0) {
    newErrors.stock_minimo = 'El stock mínimo no puede ser negativo.';
  }

  const stockAct = Number(formData.stock_actual);
  if (formData.stock_actual === '' || isNaN(stockAct) || stockAct < 0) {
    newErrors.stock_actual = 'El stock actual no puede ser negativo.';
  }

  return newErrors;
}

export default validateMaterialForm;
