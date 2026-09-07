/**
 * styles/buttons.js — Paleta única para botones de acción primaria.
 *
 * Antes había 3+ tonos de azul distintos repartidos entre los modales
 * (#2563eb, #0284c7, #0369a1). Este archivo centraliza el color para que
 * "Guardar", "Registrar", "Agregar", "Confirmar", etc. se vean siempre
 * iguales en todo el sistema, y para que el estado deshabilitado
 * (formulario incompleto o guardando) también sea consistente.
 */

export const PRIMARY_COLOR = '#2563eb';
export const PRIMARY_HOVER = '#1d4ed8';
export const DISABLED_BG = '#334155';
export const DISABLED_TEXT = '#64748b';

/**
 * Estilo del botón primario de un formulario (submit/agregar/confirmar).
 * @param {boolean} enabled - true si el formulario es válido y no está guardando.
 * @param {boolean} busy - true mientras se está enviando (muestra cursor "wait").
 */
export function primaryButtonStyle(enabled, busy = false) {
  return {
    padding: '0.65rem 1.5rem',
    backgroundColor: !enabled ? DISABLED_BG : busy ? PRIMARY_HOVER : PRIMARY_COLOR,
    color: !enabled ? DISABLED_TEXT : '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: !enabled ? 'not-allowed' : busy ? 'wait' : 'pointer',
    opacity: !enabled ? 0.7 : 1,
    transition: 'background-color 0.15s ease, opacity 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: enabled && !busy ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
  };
}

/** Estilo del botón "+ Nuevo X" / abrir modal — mismo color, siempre habilitado. */
export const openModalButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.25rem',
  backgroundColor: PRIMARY_COLOR,
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '700',
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
  transition: 'background-color 0.15s ease',
};
