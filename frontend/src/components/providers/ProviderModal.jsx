/**
 * components/providers/ProviderModal.jsx — Modal accesible de Creación y Edición de Proveedores.
 */

import React, { useState, useEffect } from 'react';
import providersApi from '../../api/providersApi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIT_REGEX = /^[\w\-]+$/;

export function ProviderModal({ isOpen, onClose, onSuccess, providerToEdit = null }) {
  const isEdit = Boolean(providerToEdit);

  const [formData, setFormData] = useState({
    nit: '',
    nombre_empresa: '',
    contacto_nombre: '',
    contacto_telefono: '',
    contacto_email: '',
    direccion: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Inicializar formulario según modo (Creación vs Edición)
  useEffect(() => {
    if (providerToEdit) {
      setFormData({
        nit: providerToEdit.nit || '',
        nombre_empresa: providerToEdit.nombre_empresa || '',
        contacto_nombre: providerToEdit.contacto_nombre || '',
        contacto_telefono: providerToEdit.contacto_telefono || '',
        contacto_email: providerToEdit.contacto_email || '',
        direccion: providerToEdit.direccion || '',
      });
    } else {
      setFormData({
        nit: '',
        nombre_empresa: '',
        contacto_nombre: '',
        contacto_telefono: '',
        contacto_email: '',
        direccion: '',
      });
    }
    setErrors({});
    setApiError(null);
  }, [providerToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!isEdit) {
      if (!formData.nit.trim()) {
        newErrors.nit = 'El NIT es obligatorio.';
      } else if (!NIT_REGEX.test(formData.nit.trim())) {
        newErrors.nit = 'Solo se permiten letras, números y guiones.';
      }
    }

    if (!formData.nombre_empresa.trim()) {
      newErrors.nombre_empresa = 'La razón social / nombre de empresa es obligatorio.';
    } else if (formData.nombre_empresa.trim().length < 2) {
      newErrors.nombre_empresa = 'Debe tener al menos 2 caracteres.';
    }

    if (formData.contacto_email && formData.contacto_email.trim()) {
      if (!EMAIL_REGEX.test(formData.contacto_email.trim())) {
        newErrors.contacto_email = 'Ingrese un correo electrónico válido.';
      }
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
        await providersApi.updateProvider(providerToEdit.id, formData);
      } else {
        await providersApi.createProvider(formData);
      }
      onSuccess(isEdit ? 'Proveedor actualizado con éxito.' : 'Proveedor registrado exitosamente.');
      onClose();
    } catch (err) {
      console.error('Error al procesar proveedor:', err);
      if (err.response?.status === 409) {
        setApiError(`El NIT "${formData.nit}" ya está registrado en el sistema.`);
      } else if (err.response?.status === 422) {
        setApiError(err.response?.data?.detail || 'Datos no válidos. Verifique la información ingresada.');
      } else if (err.response?.status === 403) {
        setApiError('Acceso denegado: se requiere rol ADMINISTRADOR.');
      } else if (!err.response) {
        setApiError('No se pudo conectar con el servidor backend.');
      } else {
        setApiError(err.response?.data?.detail || 'Error inesperado al guardar el proveedor.');
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
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
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
          maxWidth: '560px',
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
            <span style={{ fontSize: '1.5rem' }}>{isEdit ? '✏️' : '🏢'}</span>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                {isEdit ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                {isEdit ? `ID #${providerToEdit.id} — NIT Inmutable` : 'Procedimiento transaccional sp_crear_proveedor'}
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
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Fila: NIT & Razón Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                NIT / RUC <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="nit"
                value={formData.nit}
                onChange={handleChange}
                disabled={isEdit || loading}
                placeholder="Ej: 900123456-1"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: isEdit ? '#0f172a' : '#1f2937',
                  border: errors.nit ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: '8px',
                  color: isEdit ? '#94a3b8' : '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: isEdit ? 'not-allowed' : 'text',
                }}
              />
              {errors.nit && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.nit}</span>}
              {isEdit && <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>🔒 Inmutable</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Razón Social / Empresa <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="nombre_empresa"
                value={formData.nombre_empresa}
                onChange={handleChange}
                disabled={loading}
                placeholder="Ej: Materiales del Valle S.A.S."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#1f2937',
                  border: errors.nombre_empresa ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {errors.nombre_empresa && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.nombre_empresa}</span>}
            </div>
          </div>

          {/* Fila: Contacto & Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Nombre del Contacto
              </label>
              <input
                type="text"
                name="contacto_nombre"
                value={formData.contacto_nombre}
                onChange={handleChange}
                disabled={loading}
                placeholder="Ej: Carlos Gómez"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Teléfono de Contacto
              </label>
              <input
                type="text"
                name="contacto_telefono"
                value={formData.contacto_telefono}
                onChange={handleChange}
                disabled={loading}
                placeholder="Ej: +57 321 456 7890"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              name="contacto_email"
              value={formData.contacto_email}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: ventas@materiales.com"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#1f2937',
                border: errors.contacto_email ? '1px solid #ef4444' : '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {errors.contacto_email && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{errors.contacto_email}</span>}
          </div>

          {/* Dirección */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Dirección de Sede / Despacho
            </label>
            <textarea
              name="direccion"
              rows={2}
              value={formData.direccion}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: Cra 10 # 25-40 Zona Industrial, Cali"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
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
              <span>{isEdit ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProviderModal;
