/**
 * utils/validateOrderForm.js — Reglas de validación del formulario "Nuevo Pedido".
 *
 * ¿Qué? Revisa los campos del pedido y devuelve un objeto { campo: mensaje }.
 * ¿Para qué? Sacar la regla del componente OrderModal para probarla como unidad.
 * ¿Impacto? Si falla, se podrían crear pedidos con cantidad 0 o con fecha pasada.
 *
 * @param {object} form  Valores del formulario (cliente, tipo_caseton_id, cantidad,
 *                       fecha_entrega_estimada) tal como los guarda el componente.
 * @param {string} today Fecha de hoy en formato 'AAAA-MM-DD'. Se recibe por
 *                       parámetro para que los tests no dependan del reloj real.
 * @returns {object} Errores por campo. Vacío si el formulario es válido.
 */
export function validateOrderForm(form, today) {
  const errs = {};
  if (!form.cliente.trim() || form.cliente.trim().length < 3) {
    errs.cliente = 'El nombre del cliente debe tener al menos 3 caracteres.';
  }
  if (!form.tipo_caseton_id) {
    errs.tipo_caseton_id = 'Seleccione un tipo de casetón.';
  }
  const qty = parseInt(form.cantidad, 10);
  if (!form.cantidad || isNaN(qty) || qty < 1) {
    errs.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
  }
  if (!form.fecha_entrega_estimada) {
    errs.fecha_entrega_estimada = 'Ingrese la fecha estimada de entrega.';
  } else if (form.fecha_entrega_estimada < today) {
    errs.fecha_entrega_estimada = 'La fecha de entrega no puede ser pasada.';
  }
  return errs;
}

export default validateOrderForm;
