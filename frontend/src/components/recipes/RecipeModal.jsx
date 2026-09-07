/**
 * components/recipes/RecipeModal.jsx — Modal de Creación y Edición de Recetas BOM (Issue #88).
 */

import React, { useState, useEffect } from 'react';
import recipesApi from '../../api/recipesApi';
import { primaryButtonStyle } from '../../styles/buttons';

export function RecipeModal({ isOpen, onClose, onSuccess, tipoCasetonId, tipoCasetonNombre, materials, recipeToEdit = null }) {
  const isEdit = Boolean(recipeToEdit);

  const [formData, setFormData] = useState({
    material_id: '',
    cantidad_por_unidad: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (recipeToEdit) {
      setFormData({
        material_id: String(recipeToEdit.material_id),
        cantidad_por_unidad: String(recipeToEdit.cantidad_por_unidad),
      });
    } else {
      setFormData({ material_id: '', cantidad_por_unidad: '' });
    }
    setErrors({});
    setApiError(null);
  }, [recipeToEdit, isOpen]);

  if (!isOpen) return null;

  const selectedMaterial = materials.find((m) => String(m.id) === String(formData.material_id));

  const getValidationErrors = () => {
    const newErrors = {};
    if (!isEdit && !formData.material_id) {
      newErrors.material_id = 'Seleccione un material.';
    }
    const cantidad = Number(formData.cantidad_por_unidad);
    if (!formData.cantidad_por_unidad || isNaN(cantidad) || cantidad <= 0) {
      newErrors.cantidad_por_unidad = 'La cantidad debe ser un número mayor que cero.';
    }
    return newErrors;
  };

  const isFormValid = Object.keys(getValidationErrors()).length === 0;

  const validate = () => {
    const newErrors = getValidationErrors();
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;

    try {
      setLoading(true);
      if (isEdit) {
        await recipesApi.updateRecipe(recipeToEdit.id, formData.cantidad_por_unidad);
      } else {
        await recipesApi.createRecipe({
          tipo_caseton_id: tipoCasetonId,
          material_id: formData.material_id,
          cantidad_por_unidad: formData.cantidad_por_unidad,
        });
      }
      onSuccess(isEdit ? 'Receta actualizada correctamente.' : 'Material agregado a la receta.');
      onClose();
    } catch (err) {
      console.error('Error al guardar receta:', err);
      if (err.response?.status === 409) {
        setApiError(err.response?.data?.detail || 'Ya existe una receta para ese material en este tipo de casetón.');
      } else if (err.response?.status === 404) {
        setApiError(err.response?.data?.detail || 'Tipo de casetón o material no encontrado.');
      } else if (err.response?.status === 403) {
        setApiError('Acceso denegado: se requiere rol ADMINISTRADOR.');
      } else if (!err.response) {
        setApiError('No se pudo conectar con el servidor backend.');
      } else {
        setApiError(err.response?.data?.detail || 'Error inesperado al guardar la receta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '16px',
          maxWidth: '460px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d131f',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{isEdit ? '✏️' : '🧾'}</span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                {isEdit ? 'Editar Cantidad de Receta' : 'Agregar Material a Receta'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{tipoCasetonNombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '6px' }}
          >
            ✕
          </button>
        </div>

        {apiError && (
          <div style={{
            margin: '1rem 1.5rem 0 1.5rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span>⚠️</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Material / Insumo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {isEdit ? (
              <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#1e293b', borderRadius: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>
                {recipeToEdit.material_nombre} ({recipeToEdit.unidad_medida})
              </div>
            ) : (
              <select
                name="material_id"
                value={formData.material_id}
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: '100%', padding: '0.7rem 0.85rem', backgroundColor: '#1f2937',
                  border: errors.material_id ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">— Seleccionar material —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.unidad_medida})</option>
                ))}
              </select>
            )}
            {errors.material_id && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.material_id}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Cantidad por Unidad de Casetón <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                name="cantidad_por_unidad"
                value={formData.cantidad_por_unidad}
                onChange={handleChange}
                disabled={loading}
                placeholder="Ej: 2.5"
                style={{
                  flex: 1, padding: '0.7rem 0.85rem', backgroundColor: '#1f2937',
                  border: errors.cantidad_por_unidad ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none',
                }}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                {isEdit ? recipeToEdit.unidad_medida : (selectedMaterial?.unidad_medida || 'unidad')}
              </span>
            </div>
            {errors.cantidad_por_unidad && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.cantidad_por_unidad}</span>}
          </div>

          <div style={{
            marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1f2937',
            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '0.65rem 1.25rem', backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={primaryButtonStyle(isFormValid, loading)}
            >
              {isEdit ? 'Guardar Cambios' : 'Agregar a Receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecipeModal;
