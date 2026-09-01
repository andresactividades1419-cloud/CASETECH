/**
 * components/users/UserModal.jsx — Modal para crear y editar cuentas de usuario (HU02).
 */

import React, { useEffect, useState } from 'react';

export function UserModal({ isOpen, onClose, user, onSave, isSubmitting, errorMessage }) {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: 2,
    activo: true,
  });

  const isEditing = !!user?.id;

  useEffect(() => {
    if (user) {
      setFormData({
        nombre_completo: user.nombre_completo || '',
        email: user.email || '',
        password: '',
        rol_id: user.rol_id || 2,
        activo: user.activo ?? true,
      });
    } else {
      setFormData({
        nombre_completo: '',
        email: '',
        password: '',
        rol_id: 2,
        activo: true,
      });
    }
  }, [user, isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1f2937',
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem' }}>{isEditing ? '✏️' : '👤'}</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
              {isEditing ? `Editar Usuario: ${user.email}` : 'Registrar Nuevo Usuario'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.4rem', cursor: 'pointer', padding: '0.25rem' }}
          >
            ×
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {errorMessage && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.82rem',
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Carlos Gómez"
              value={formData.nombre_completo}
              onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0b0f19',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              placeholder="usuario@casetech.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0b0f19',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
              {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña * (mín 8 caracteres, 1 mayúscula, 1 número)'}
            </label>
            <input
              type="password"
              required={!isEditing}
              placeholder={isEditing ? '•••••••• (dejar en blanco para conservar)' : 'Contraseña segura'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0b0f19',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Rol del Usuario *
              </label>
              <select
                value={formData.rol_id}
                onChange={(e) => setFormData({ ...formData, rol_id: Number(e.target.value) })}
                style={{
                  width: '100%',
                  backgroundColor: '#0b0f19',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value={1}>ADMINISTRADOR</option>
                <option value={2}>OPERARIO</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Estado de la Cuenta
              </label>
              <select
                value={formData.activo ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                style={{
                  width: '100%',
                  backgroundColor: '#0b0f19',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: isSubmitting ? '#0369a1' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
