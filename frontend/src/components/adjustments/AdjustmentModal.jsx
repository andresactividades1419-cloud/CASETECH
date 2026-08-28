/**
 * components/adjustments/AdjustmentModal.jsx — Modal para solicitar ajustes manuales de inventario (HU13).
 *
 * Formulario controlado con:
 * - Selector dinámico de Materias Primas activas.
 * - Selector de tipo de ajuste: MERMA, SOBRANTE, DANO, CONTEO_FISICO.
 * - Entrada de cantidad con indicador de unidad de medida.
 * - Textarea obligatorio de justificación/motivo (mínimo 10 caracteres).
 * - Indicador visual del impacto previsto en el inventario.
 */

import React, { useEffect, useRef, useState } from 'react';
import materialsApi from '../../api/materialsApi';
import adjustmentsApi from '../../api/adjustmentsApi';

const ADJUSTMENT_TYPES = [
  { value: 'MERMA', label: '📉 Merma / Desperdicio (Resta stock)', impact: 'Resta', color: '#f87171' },
  { value: 'DANO', label: '⚠️ Material Dañado / Roto (Resta stock)', impact: 'Resta', color: '#fb923c' },
  { value: 'SOBRANTE', label: '📈 Sobrante / Excedente (Suma stock)', impact: 'Suma', color: '#4ade80' },
  { value: 'CONTEO_FISICO', label: '⚖️ Conteo Físico / Reconciliación', impact: 'Ajuste', color: '#38bdf8' },
];

const INPUT_STYLE = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const ERROR_STYLE = {
  color: '#f87171',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
};

export function AdjustmentModal({ isOpen, onClose, onSuccess }) {
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [form, setForm] = useState({
    material_id: '',
    tipo: 'MERMA',
    cantidad: '',
    motivo: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const firstInputRef = useRef(null);

  // Cargar catálogo de materiales activos
  useEffect(() => {
    if (!isOpen) return;

    setLoadingMaterials(true);
    setApiError('');
    setErrors({});
    setForm({
      material_id: '',
      tipo: 'MERMA',
      cantidad: '',
      motivo: '',
    });

    materialsApi.getMaterials({ limit: 100, activo: true })
      .then((data) => {
        const activeList = (data.items || []).filter((m) => m.activo !== false);
        setMaterials(activeList);
      })
      .catch((err) => {
        setApiError('Error al cargar la lista de materiales. Reintente.');
      })
      .finally(() => setLoadingMaterials(false));
  }, [isOpen]);

  // Focus en el primer control al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedMaterial = materials.find((m) => String(m.id) === String(form.material_id));
  const currentTypeInfo = ADJUSTMENT_TYPES.find((t) => t.value === form.tipo) || ADJUSTMENT_TYPES[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!form.material_id) {
      newErrors.material_id = 'Seleccione una materia prima.';
    }

    if (!form.tipo) {
      newErrors.tipo = 'Seleccione el tipo de ajuste.';
    }

    const cantNum = parseFloat(form.cantidad);
    if (!form.cantidad || isNaN(cantNum) || cantNum <= 0) {
      newErrors.cantidad = 'Ingrese una cantidad válida mayor a 0.';
    }

    if (!form.motivo || form.motivo.trim().length < 10) {
      newErrors.motivo = 'La justificación del motivo debe tener al menos 10 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');

    try {
      const response = await adjustmentsApi.createAdjustment({
        material_id: form.material_id,
        tipo: form.tipo,
        cantidad: form.cantidad,
        motivo: form.motivo,
      });

      onSuccess(response, 'Solicitud de ajuste registrada con éxito.');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al registrar la solicitud de ajuste.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              color: '#38bdf8',
            }}>
              ⚖️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                Solicitar Ajuste Manual de Inventario
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                HU13 — Auditoría de Stock y Doble Firma
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {apiError && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.85rem',
              display: 'flex',
              gap: '0.5rem',
            }}>
              <span>⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          {/* Select Material */}
          <div>
            <label style={LABEL_STYLE}>
              Materia Prima <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              ref={firstInputRef}
              name="material_id"
              value={form.material_id}
              onChange={handleChange}
              disabled={loadingMaterials}
              style={{
                ...INPUT_STYLE,
                borderColor: errors.material_id ? '#f87171' : '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Seleccione un material --</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} (Stock actual: {m.stock_actual} {m.unidad_medida})
                </option>
              ))}
            </select>
            {errors.material_id && <div style={ERROR_STYLE}>{errors.material_id}</div>}
          </div>

          {/* Tipo de Ajuste */}
          <div>
            <label style={LABEL_STYLE}>
              Tipo de Ajuste <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {ADJUSTMENT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setForm((prev) => ({ ...prev, tipo: t.value }))}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: form.tipo === t.value ? `1px solid ${t.color}` : '1px solid #334155',
                    backgroundColor: form.tipo === t.value ? 'rgba(30, 41, 59, 0.8)' : '#0f172a',
                    color: form.tipo === t.value ? '#f8fafc' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: form.tipo === t.value ? '600' : '400',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {errors.tipo && <div style={ERROR_STYLE}>{errors.tipo}</div>}
          </div>

          {/* Cantidad */}
          <div>
            <label style={LABEL_STYLE}>
              Cantidad a Ajustar <span style={{ color: '#f87171' }}>*</span>
              {selectedMaterial && (
                <span style={{ color: '#38bdf8', textTransform: 'none', marginLeft: '0.5rem' }}>
                  ({selectedMaterial.unidad_medida})
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.001"
                min="0.001"
                name="cantidad"
                value={form.cantidad}
                onChange={handleChange}
                placeholder="Ej. 15.500"
                style={{
                  ...INPUT_STYLE,
                  borderColor: errors.cantidad ? '#f87171' : '#334155',
                }}
              />
              {selectedMaterial && (
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.8rem',
                  color: '#64748b',
                }}>
                  {selectedMaterial.unidad_medida}
                </span>
              )}
            </div>
            {errors.cantidad && <div style={ERROR_STYLE}>{errors.cantidad}</div>}
          </div>

          {/* Indicador de impacto */}
          {selectedMaterial && form.cantidad && !isNaN(parseFloat(form.cantidad)) && (
            <div style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              border: `1px solid ${currentTypeInfo.color}40`,
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>💡</span>
              <span>
                Impacto estimado: <strong>{currentTypeInfo.impact} {form.cantidad} {selectedMaterial.unidad_medida}</strong> al inventario de <em>{selectedMaterial.nombre}</em> tras aprobación.
              </span>
            </div>
          )}

          {/* Motivo / Justificación */}
          <div>
            <label style={LABEL_STYLE}>
              Justificación / Motivo del Ajuste <span style={{ color: '#f87171' }}>* (Mínimo 10 caracteres)</span>
            </label>
            <textarea
              name="motivo"
              rows={3}
              value={form.motivo}
              onChange={handleChange}
              placeholder="Describa el motivo técnico u operativo (ej: Rotura durante descarga de camión por parte del montacargas)."
              style={{
                ...INPUT_STYLE,
                borderColor: errors.motivo ? '#f87171' : '#334155',
                resize: 'vertical',
                minHeight: '75px',
              }}
            />
            {errors.motivo && <div style={ERROR_STYLE}>{errors.motivo}</div>}
          </div>

          {/* Botones de acción */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #1f2937',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.6rem 1.4rem',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              {submitting ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>Enviar Solicitud</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdjustmentModal;
