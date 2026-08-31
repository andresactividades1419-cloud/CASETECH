/**
 * pages/PurchasesPage.jsx — Pantalla Principal de Compras a Proveedores e Ingreso de Stock (HU07).
 *
 * Características:
 * - Tarjetas KPI con métricas financieras y operativas de abastecimiento.
 * - Barra de filtros por proveedor, código CMP y fechas.
 * - Tabla interactiva con desglose de órdenes de compra, total en COP y botón para ver detalle.
 * - Integración con PurchaseModal para nuevas compras e ingreso atómico de inventario.
 * - Integración con PurchaseDetailModal para consultar el detalle de líneas de compra.
 * - Manejo de Toasts informativos.
 */

import React, { useCallback, useEffect, useState } from 'react';
import providersApi from '../api/providersApi';
import purchasesApi from '../api/purchasesApi';
import PurchaseDetailModal from '../components/purchases/PurchaseDetailModal';
import PurchaseModal from '../components/purchases/PurchaseModal';

const formatCOP = (val) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
};

/* ─── Toast Sub-component ────────────────────────────────────────────────── */

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 999,
      maxWidth: '480px',
      backgroundColor: isSuccess ? '#064e3b' : '#7f1d1d',
      border: `1px solid ${isSuccess ? '#059669' : '#dc2626'}`,
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#ffffff',
      animation: 'slideUp 0.25s ease-out',
    }}>
      <span style={{ fontSize: '1.25rem' }}>{isSuccess ? '✅' : '⚠️'}</span>
      <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: '1.4' }}>{message}</div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0.2rem',
          lineHeight: 1,
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ─── Componente Principal ───────────────────────────────────────────────── */

export function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Filtros
  const [proveedorFilter, setProveedorFilter] = useState('');
  const [codigoFilter, setCodigoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchaseToView, setSelectedPurchaseToView] = useState(null);

  // Toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Cargar proveedores para selector
  useEffect(() => {
    providersApi.getProviders({ limit: 100 })
      .then((data) => setProviders(data.items || []))
      .catch(() => {});
  }, []);

  // Cargar compras
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasesApi.getPurchases({
        page,
        limit,
        proveedor_id: proveedorFilter || undefined,
        codigo_compra: codigoFilter || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      });

      setPurchases(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al cargar las órdenes de compra.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, proveedorFilter, codigoFilter, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Métricas para KPI cards
  const totalAmount = purchases.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
  const totalItemsCount = purchases.reduce((acc, p) => acc + (p.items ? p.items.length : 0), 0);
  const uniqueProvidersCount = new Set(purchases.map((p) => p.proveedor_id)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header y Botón Principal */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Gestión de Abastecimiento
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Compras y abastecimiento de materias primas con ingreso directo a inventario y Kardex.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#0284c7',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0369a1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0284c7'; }}
        >
          <span>➕</span>
          <span>Registrar Compra</span>
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* KPI: Total Inversión */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: 'rgba(52, 211, 153, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            💵
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inversión en Compras
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#34d399', marginTop: '0.15rem' }}>
              {formatCOP(totalAmount)}
            </div>
          </div>
        </div>

        {/* KPI: Compras Registradas */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Órdenes de Compra
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.15rem' }}>
              {total}
            </div>
          </div>
        </div>

        {/* KPI: Insumos Abastecidos */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: 'rgba(251, 146, 60, 0.12)',
            border: '1px solid rgba(251, 146, 60, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            📦
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Líneas Abastecidas
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fb923c', marginTop: '0.15rem' }}>
              {totalItemsCount}
            </div>
          </div>
        </div>

        {/* KPI: Proveedores Involucrados */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Proveedores
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c084fc', marginTop: '0.15rem' }}>
              {uniqueProvidersCount}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Selector de Proveedor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={proveedorFilter}
            onChange={(e) => { setProveedorFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.45rem 0.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Todos los proveedores</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre_empresa}
              </option>
            ))}
          </select>

          {/* Rango de Fechas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
              style={{
                padding: '0.4rem 0.6rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
              style={{
                padding: '0.4rem 0.6rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
          </div>

          {(proveedorFilter || fechaDesde || fechaHasta || codigoFilter) && (
            <button
              onClick={() => {
                setProveedorFilter('');
                setFechaDesde('');
                setFechaHasta('');
                setCodigoFilter('');
                setPage(1);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Buscador por Código CMP */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar por código CMP..."
            value={codigoFilter}
            onChange={(e) => { setCodigoFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.45rem 0.75rem 0.45rem 2rem',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9',
              fontSize: '0.8rem',
              outline: 'none',
              minWidth: '220px',
            }}
          />
          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Tabla de Compras */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
            <div>Cargando órdenes de compra...</div>
          </div>
        ) : purchases.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🛒</div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#cbd5e1', fontSize: '1rem', fontWeight: '600' }}>
              No se encontraron órdenes de compra
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Registre su primera compra con el botón "+ Registrar Compra".
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Código / Fecha</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Proveedor</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Insumos</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total (COP)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Registrado Por</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Observaciones</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #1f2937',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {/* Código y Fecha */}
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '700', color: '#38bdf8' }}>{p.codigo_compra}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.fecha_compra}</div>
                    </td>

                    {/* Proveedor */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                        {p.proveedor_nombre || `Proveedor #${p.proveedor_id}`}
                      </div>
                    </td>

                    {/* Cantidad de ítems */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#38bdf8',
                      }}>
                        {p.items ? p.items.length : 0} {p.items?.length === 1 ? 'ítem' : 'ítems'}
                      </span>
                    </td>

                    {/* Total en COP */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontWeight: '800', color: '#4ade80', fontSize: '0.95rem' }}>
                        {formatCOP(p.total)}
                      </span>
                    </td>

                    {/* Registrado por */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      👤 {p.registrado_por_nombre || `Usuario #${p.registrado_por}`}
                    </td>

                    {/* Observaciones */}
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '240px' }}>
                      <div style={{
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }} title={p.observaciones || ''}>
                        {p.observaciones || '—'}
                      </div>
                    </td>

                    {/* Botón Ver Detalle */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedPurchaseToView(p)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0284c7';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
                          e.currentTarget.style.color = '#38bdf8';
                        }}
                      >
                        <span>👁️</span>
                        <span>Ver Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro de Compra */}
      <PurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created, msg) => {
          showToast(msg || 'Compra registrada exitosamente.', 'success');
          fetchPurchases();
        }}
      />

      {/* Modal de Detalle */}
      <PurchaseDetailModal
        isOpen={Boolean(selectedPurchaseToView)}
        purchase={selectedPurchaseToView}
        onClose={() => setSelectedPurchaseToView(null)}
      />
    </div>
  );
}

export default PurchasesPage;
