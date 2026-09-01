/**
 * components/orders/RecipePreviewModal.jsx — Previsualización de Consumo BOM (HU11).
 *
 * Muestra la explosión de materiales requeridos vs disponibles en inventario
 * antes de confirmar el paso a producción.
 */

import React, { useEffect, useState } from 'react';
import ordersApi from '../../api/ordersApi';

export function RecipePreviewModal({ order, isOpen, onClose, onConfirmStart, isStarting }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !order?.id) return;

    setLoading(true);
    setError('');
    setPreview(null);

    ordersApi.getRecipePreview(order.id)
      .then((data) => {
        setPreview(data);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || 'No se pudo cargar la previsualización de la receta BOM.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, order?.id]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !isStarting) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 250,
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
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🧱</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc' }}>
                Previsualización de Consumo BOM
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Pedido: <strong style={{ color: '#38bdf8' }}>{order?.codigo_pedido}</strong> · {order?.tipo_caseton_nombre || 'Casetón'} ({order?.cantidad} uds)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isStarting}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{
                width: '36px', height: '36px', border: '3px solid #1f2937',
                borderTopColor: '#38bdf8', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
              }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Calculando explosión de materiales BOM...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              color: '#fca5a5',
              fontSize: '0.88rem',
            }}>
              ⚠️ {error}
            </div>
          ) : preview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: preview.es_viable ? 'rgba(52, 211, 153, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${preview.es_viable ? 'rgba(52, 211, 153, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}>
                <span style={{ fontSize: '1.6rem' }}>{preview.es_viable ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: preview.es_viable ? '#34d399' : '#f87171',
                  }}>
                    {preview.es_viable ? 'Producción Viable — Stock Completo' : 'Déficit de Inventario Detectado'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: preview.es_viable ? '#6ee7b7' : '#fca5a5', marginTop: '0.15rem' }}>
                    {preview.es_viable
                      ? 'Todas las materias primas cuentan con existencias suficientes en bodega para fabricar las unidades solicitadas.'
                      : 'El inventario no cuenta con suficiente stock de una o más materias primas para completar la orden.'}
                  </div>
                </div>
              </div>

              {!preview.es_viable && preview.resumen_deficits?.length > 0 && (
                <div style={{
                  backgroundColor: '#1f1315',
                  border: '1px solid #451a1a',
                  borderRadius: '10px',
                  padding: '0.9rem 1.1rem',
                  fontSize: '0.82rem',
                  color: '#fca5a5',
                }}>
                  <div style={{ fontWeight: '700', color: '#f87171', marginBottom: '0.4rem' }}>
                    Materias primas faltantes:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {preview.resumen_deficits.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{
                backgroundColor: '#0b0f19',
                border: '1px solid #1f2937',
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#111827', borderBottom: '1px solid #1f2937', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Materia Prima</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Por Unidad</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Requerido Total</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Stock Actual</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.materiales.map((m) => (
                      <tr key={m.material_id} style={{ borderBottom: '1px solid #1a2332' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#f8fafc' }}>
                          {m.material_nombre}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.82rem' }}>
                          {m.cantidad_por_unidad} {m.unidad_medida}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#e2e8f0' }}>
                          {m.cantidad_total_requerida.toLocaleString()} {m.unidad_medida}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          color: m.suficiente ? '#34d399' : '#f87171',
                        }}>
                          {m.stock_actual.toLocaleString()} {m.unidad_medida}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: m.suficiente ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: m.suficiente ? '#34d399' : '#f87171',
                            border: `1px solid ${m.suficiente ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}>
                            {m.suficiente ? '✓ Suficiente' : `✗ Déficit (${m.deficit} ${m.unidad_medida})`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid #1f2937',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          backgroundColor: '#0f172a',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: 'transparent',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onConfirmStart(order)}
            disabled={isStarting || loading || !preview?.es_viable}
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: !preview?.es_viable ? '#334155' : isStarting ? '#075985' : '#0284c7',
              color: !preview?.es_viable ? '#64748b' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: '700',
              cursor: !preview?.es_viable || isStarting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: preview?.es_viable ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            }}
          >
            {isStarting ? (
              <>
                <span style={{
                  width: '14px', height: '14px', border: '2px solid #ffffff',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }} />
                Iniciando Producción...
              </>
            ) : (
              '⚙️ Confirmar Inicio de Producción'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecipePreviewModal;
