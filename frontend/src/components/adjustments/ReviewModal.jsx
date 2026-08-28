/**
 * components/adjustments/ReviewModal.jsx — Modal de revisión de ajustes para ADMINISTRADORES (HU13).
 *
 * Permite:
 * - Visualizar la auditoría de la solicitud (Material, Tipo, Cantidad, Solicitante, Motivo).
 * - Seleccionar decisión: APROBAR (aplica al inventario vía SP) o RECHAZAR.
 * - Agregar observaciones de auditoría opcionales.
 * - Control de regla de doble firma (evita que el solicitante sea el revisor).
 */

import React, { useState } from 'react';
import adjustmentsApi from '../../api/adjustmentsApi';
import { useAuth } from '../../context/AuthContext';

export function ReviewModal({ isOpen, onClose, adjustment, onSuccess }) {
  const { user } = useAuth();
  const [aprobado, setAprobado] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  if (!isOpen || !adjustment) return null;

  const isSelfRequester = user && Number(user.id) === Number(adjustment.solicitante_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError('');

    try {
      const response = await adjustmentsApi.reviewAdjustment(adjustment.id, {
        aprobado: aprobado,
        observaciones: observaciones,
      });

      const actionText = aprobado ? 'aprobado y aplicado al stock' : 'rechazado';
      onSuccess(response, `Ajuste #${adjustment.id} ${actionText} correctamente.`);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al procesar la revisión del ajuste.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
        maxWidth: '540px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
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
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              color: '#c084fc',
            }}>
              🛡️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                Revisión de Ajuste #{adjustment.id}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Autorización de Administrador · Doble Firma
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

        {/* Resumen del ajuste a auditar */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1f2937', backgroundColor: '#0b0f19' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Materia Prima</span>
              <strong style={{ color: '#f1f5f9' }}>{adjustment.material_nombre || `ID #${adjustment.material_id}`}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Tipo de Ajuste</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: adjustment.tipo === 'SOBRANTE' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                color: adjustment.tipo === 'SOBRANTE' ? '#4ade80' : '#f87171',
              }}>
                {adjustment.tipo}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Cantidad Involucrada</span>
              <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{adjustment.cantidad}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Solicitante</span>
              <span style={{ color: '#cbd5e1' }}>{adjustment.solicitante_nombre || `Usuario #${adjustment.solicitante_id}`}</span>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Justificación / Motivo</span>
            <p style={{ margin: '0.25rem 0 0 0', color: '#e2e8f0', fontSize: '0.82rem', lineHeight: '1.4', fontStyle: 'italic' }}>
              "{adjustment.motivo}"
            </p>
          </div>
        </div>

        {/* Formulario de Decisión */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          {isSelfRequester && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '8px',
              color: '#facc15',
              fontSize: '0.8rem',
              display: 'flex',
              gap: '0.5rem',
            }}>
              <span>🚫</span>
              <span>
                <strong>Regla de Doble Firma:</strong> Tú eres el usuario que solicitó este ajuste. Las políticas de auditoría exigen que otro administrador lo revise.
              </span>
            </div>
          )}

          {/* Opciones de Decisión */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Decisión del Revisor
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAprobado(true)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: aprobado ? '2px solid #22c55e' : '1px solid #334155',
                  backgroundColor: aprobado ? 'rgba(34, 197, 94, 0.15)' : '#0f172a',
                  color: aprobado ? '#4ade80' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>✅</span>
                <span>APROBAR AJUSTE</span>
              </button>

              <button
                type="button"
                onClick={() => setAprobado(false)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: !aprobado ? '2px solid #ef4444' : '1px solid #334155',
                  backgroundColor: !aprobado ? 'rgba(239, 68, 68, 0.15)' : '#0f172a',
                  color: !aprobado ? '#f87171' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>❌</span>
                <span>RECHAZAR</span>
              </button>
            </div>
          </div>

          {/* Observaciones opcionales */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Observaciones de Auditoría (Opcional)
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre la inspección o motivo de la resolución..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
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
              disabled={submitting || isSelfRequester}
              style={{
                padding: '0.6rem 1.4rem',
                backgroundColor: aprobado ? '#16a34a' : '#dc2626',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: (submitting || isSelfRequester) ? 'not-allowed' : 'pointer',
                opacity: isSelfRequester ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: aprobado ? '0 4px 12px rgba(22, 163, 74, 0.3)' : '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
            >
              {submitting ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{aprobado ? '✨ Confirmar Aprobación' : '⛔ Confirmar Rechazo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
