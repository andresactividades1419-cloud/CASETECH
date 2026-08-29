/**
 * components/purchases/PurchaseDetailModal.jsx — Modal de solo lectura para el detalle de una compra (HU07).
 *
 * Muestra:
 * - Cabecera con datos del proveedor, fecha, código de orden y usuario registrador.
 * - Tabla con el desglose de materias primas abastecidas, cantidades, precios unitarios y subtotales.
 * - Gran total en moneda COP.
 */

import React from 'react';

const formatCOP = (val) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export function PurchaseDetailModal({ isOpen, onClose, purchase }) {
  if (!isOpen || !purchase) return null;

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
        maxWidth: '750px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
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
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              color: '#34d399',
            }}>
              📄
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc' }}>
                Detalle de Orden de Compra {purchase.codigo_compra}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Registro de Abastecimiento & Kardex
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

        {/* Información general */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1f2937', backgroundColor: '#0b0f19' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Proveedor</span>
              <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>{purchase.proveedor_nombre || `Proveedor #${purchase.proveedor_id}`}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Fecha Compra</span>
              <span style={{ color: '#cbd5e1' }}>{purchase.fecha_compra}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Registrado Por</span>
              <span style={{ color: '#cbd5e1' }}>👤 {purchase.registrado_por_nombre || `Usuario #${purchase.registrado_por}`}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Total de la Orden</span>
              <strong style={{ color: '#4ade80', fontSize: '1.1rem' }}>{formatCOP(purchase.total)}</strong>
            </div>
          </div>

          {purchase.observaciones && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Observaciones / Factura</span>
              <p style={{ margin: '0.25rem 0 0 0', color: '#cbd5e1', fontSize: '0.82rem', fontStyle: 'italic' }}>
                "{purchase.observaciones}"
              </p>
            </div>
          )}
        </div>

        {/* Tabla de ítems con scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <div style={{
            backgroundColor: '#0b0f19',
            border: '1px solid #1f2937',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Materia Prima</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Cantidad</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Precio Unitario</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Subtotal (COP)</th>
                </tr>
              </thead>
              <tbody>
                {(purchase.items || []).map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                        {it.material_nombre || `Material #${it.material_id}`}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                      <span style={{ color: '#38bdf8', fontWeight: '700' }}>
                        +{it.cantidad} {it.unidad_medida || ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#cbd5e1' }}>
                      {formatCOP(it.precio_unitario)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#4ade80' }}>
                      {formatCOP(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #1f2937',
          backgroundColor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Registrado el {purchase.created_at ? new Date(purchase.created_at).toLocaleString() : '—'}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchaseDetailModal;
