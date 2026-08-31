/**
 * components/materials/MaterialModal.jsx — Modal de Creación y Edición de Insumos y Materias Primas.
 */

import React, { useState, useEffect } from 'react';
import materialsApi from '../../api/materialsApi';

const UNITS_OPTIONS = [
  { value: 'm2', label: 'Metros cuadrados (m²) — Ej: Lonas, láminas' },
  { value: 'm', label: 'Metros lineales (m) — Ej: Varillas, perfiles' },
  { value: 'm3', label: 'Metros cúbicos (m³) — Ej: Icopor EPS, arena' },
  { value: 'kg', label: 'Kilogramos (kg) — Ej: Cemento, aditivos' },
  { value: 'und', label: 'Unidades (und) — Ej: Conectores, accesorios' },
  { value: 'culmo', label: 'Culmos — Ej: Guadua Angustifolia' },
];

export function MaterialModal({ isOpen, onClose, onSuccess, materialToEdit = null }) {
  const isEdit = Boolean(materialToEdit);

  const [formData, setFormData] = useState({
    nombre: '',
    unidad_medida: 'und',
    stock_actual: '0',
    stock_minimo: '0',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (materialToEdit) {
      setFormData({
        nombre: materialToEdit.nombre || '',
        unidad_medida: materialToEdit.unidad_medida || 'und',
        stock_actual: String(materialToEdit.stock_actual ?? '0'),
        stock_minimo: String(materialToEdit.stock_minimo ?? '0'),
      });
    } else {
      setFormData({
        nombre: '',
        unidad_medida: 'm2',
        stock_actual: '0',
        stock_minimo: '10',
      });
    }
    setErrors({});
    setApiError(null);
  }, [materialToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
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
    if (isNaN(stockMin) || stockMin < 0) {
      newErrors.stock_minimo = 'El stock mínimo no puede ser negativo.';
    }

    const stockAct = Number(formData.stock_actual);
    if (isNaN(stockAct) || stockAct < 0) {
      newErrors.stock_actual = 'El stock actual no puede ser negativo.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    try {
      setLoading(true);
      if (isEdit) {
        await materialsApi.updateMaterial(materialToEdit.id, formData);
      } else {
        await materialsApi.createMaterial(formData);
      }
      onSuccess(isEdit ? 'Insumo actualizado correctamente.' : 'Insumo registrado exitosamente en el inventario.');
      onClose();
    } catch (err) {
      console.error('Error al guardar material:', err);
      if (err.response?.status === 409) {
        setApiError(`Ya existe un material registrado con el nombre "${formData.nombre}".`);
      } else if (err.response?.status === 422) {
        setApiError(err.response?.data?.detail || 'Datos no válidos. Verifique los valores ingresados.');
      } else if (err.response?.status === 403) {
        setApiError('Acceso denegado: se requiere rol ADMINISTRADOR.');
      } else if (!err.response) {
        setApiError('No se pudo conectar con el servidor backend.');
      } else {
        setApiError(err.response?.data?.detail || 'Error inesperado al guardar el material.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0d131f',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{isEdit ? '✏️' : '🧱'}</span>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                {isEdit ? 'Editar Insumo de Producción' : 'Registrar Nuevo Insumo'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                {isEdit ? `ID #${materialToEdit.id}` : 'Inventario maestro para recetas BOM'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '6px',
            }}
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Alerta de Error de API */}
        {apiError && (
          <div style={{
            margin: '1rem 1.5rem 0 1.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>⚠️</span>
            <span>{apiError}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Nombre */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Nombre del Insumo / Materia Prima <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: Icopor EPS Densidad 10, Lona 600D, Guadua..."
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                backgroundColor: '#1f2937',
                border: errors.nombre ? '1px solid #ef4444' : '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {errors.nombre && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.nombre}</span>}
          </div>

          {/* Unidad de Medida */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Unidad de Medida <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              name="unidad_medida"
              value={formData.unidad_medida}
              onChange={handleChange}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                backgroundColor: '#1f2937',
                border: errors.unidad_medida ? '1px solid #ef4444' : '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {UNITS_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            {errors.unidad_medida && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.unidad_medida}</span>}
          </div>

          {/* Fila: Stock Actual y Stock Mínimo de Alerta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Stock {isEdit ? 'Actual' : 'Inicial en Bodega'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                name="stock_actual"
                value={formData.stock_actual}
                onChange={handleChange}
                disabled={loading}
                placeholder="0.000"
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  backgroundColor: '#1f2937',
                  border: errors.stock_actual ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {errors.stock_actual && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.stock_actual}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Stock Mínimo (Alerta Crítica) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                name="stock_minimo"
                value={formData.stock_minimo}
                onChange={handleChange}
                disabled={loading}
                placeholder="10.000"
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  backgroundColor: '#1f2937',
                  border: errors.stock_minimo ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {errors.stock_minimo && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.stock_minimo}</span>}
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                Dispara alerta roja si stock &le; mínimo
              </span>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #1f2937',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem 1.5rem',
                backgroundColor: loading ? '#1d4ed8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              }}
            >
              {loading && (
                <span style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.6s linear infinite',
                }} />
              )}
              <span>{isEdit ? 'Guardar Cambios' : 'Registrar Insumo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MaterialModal;
