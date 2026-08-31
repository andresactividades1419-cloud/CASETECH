/**
 * pages/PurchasesPage.jsx — Pantalla Principal de Compras a Proveedores e Ingreso de Stock.
 *
 * Características:
 * - Tarjetas KPI con métricas financieras y operativas de abastecimiento (inversión monetaria restringida a ADMINISTRADOR).
 * - Barra de filtros por proveedor, código CMP y fechas.
 * - Tabla interactiva con desglose de órdenes de compra y visualizador de detalle.
 * - Integración con PurchaseModal para nuevas compras e ingreso atómico de inventario.
 * - Integración con PurchaseDetailModal para consultar el detalle de líneas de compra.
 * - Manejo de Toasts informativos.
 */

import React, { useCallback, useEffect, useState } from 'react';
import providersApi from '../api/providersApi';
import purchasesApi from '../api/purchasesApi';
import PurchaseDetailModal from '../components/purchases/PurchaseDetailModal';
import PurchaseModal from '../components/purchases/PurchaseModal';
import { useAuth } from '../context/AuthContext';

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
  const { isAdmin } = useAuth();

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
        {/* KPI 1: Inversión en Compras (Solo para Administrador) */}
        {isAdmin && (
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
        )}

        {/* KPI 2: Compras Registradas */}
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

        {/* KPI 3: Total Ítems Recibidos */}
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
            backgroundColor: 'rgba(192, 132, 252, 0.12)',
            border: '1px solid rgba(192, 132, 252, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            📦
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ítems Abastecidos
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c084fc', marginTop: '0.15rem' }}>
              {totalItemsCount}
            </div>
          </div>
        </div>

        {/* KPI 4: Proveedores Activos */}
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
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
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
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.15rem' }}>
              {uniqueProvidersCount}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'flex-end',
      }}>
        {/* Filtro por Código */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
            CÓDIGO CMP
          </label>
          <input
            type="text"
            placeholder="Ej: CMP-2026..."
            value={codigoFilter}
            onChange={(e) => setCodigoFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              backgroundColor: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtro por Proveedor */}
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
            PROVEEDOR
          </label>
          <select
            value={proveedorFilter}
            onChange={(e) => setProveedorFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              backgroundColor: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Todos los proveedores</option>
            {providers.map((prv) => (
              <option key={prv.id} value={prv.id}>
                {prv.razon_social} ({prv.nit})
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Fecha Desde */}
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
            DESDE
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              backgroundColor: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtro Fecha Hasta */}
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
            HASTA
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              backgroundColor: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Botón Limpiar */}
        {(codigoFilter || proveedorFilter || fechaDesde || fechaHasta) && (
          <button
            onClick={() => {
              setCodigoFilter('');
              setProveedorFilter('');
              setFechaDesde('');
              setFechaHasta('');
            }}
            style={{
              padding: '0.55rem 1rem',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Limpiar
          </button>
        )}
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
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📦</div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#cbd5e1', fontSize: '1rem', fontWeight: '600' }}>
              No se encontraron compras registradas
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Utilice el botón "Registrar Compra" para realizar el primer abastecimiento con ingreso a stock.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Código / Fecha</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Proveedor</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Materias Primas Abastecidas</th>
                  {isAdmin && <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Total (COP)</th>}
                  <th style={{ padding: '0.85rem 1.25rem' }}>Registrado Por</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString() : '—';
                  const itemsSummary = p.items && p.items.length > 0
                    ? p.items.map((it) => `${it.material_nombre || `Mat #${it.material_id}`} (${it.cantidad})`).join(', ')
                    : 'Sin ítems';

                  return (
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
                      <td style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#38bdf8', fontSize: '0.9rem' }}>
                          {p.codigo_compra}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {dateStr}
                        </div>
                      </td>

                      {/* Proveedor */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                          {p.proveedor_nombre || `Proveedor #${p.proveedor_id}`}
                        </div>
                        {p.proveedor_nit && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            NIT: {p.proveedor_nit}
                          </div>
                        )}
                      </td>

                      {/* Ítems Abastecidos */}
                      <td style={{ padding: '0.85rem 1.25rem', maxWidth: '320px' }}>
                        <div style={{
                          color: '#cbd5e1',
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }} title={itemsSummary}>
                          {itemsSummary}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {p.items ? p.items.length : 0} {p.items?.length === 1 ? 'línea de insumo' : 'líneas de insumo'}
                        </div>
                      </td>

                      {/* Total COP (Solo para Administrador) */}
                      {isAdmin && (
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', color: '#34d399', fontSize: '0.95rem' }}>
                            {formatCOP(p.total)}
                          </span>
                        </td>
                      )}

                      {/* Registrado Por */}
                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        👤 {p.usuario_nombre || `Usuario #${p.usuario_id}`}
                      </td>

                      {/* Botón Ver Detalle */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedPurchaseToView(p)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#38bdf8',
                            fontSize: '0.8rem',
                            fontWeight: '600',
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
                            e.currentTarget.style.backgroundColor = '#1e293b';
                            e.currentTarget.style.color = '#38bdf8';
                          }}
                        >
                          <span>🔍</span>
                          <span>Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar Compra */}
      <PurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchPurchases();
        }}
      />

      {/* Modal: Ver Detalle de Compra */}
      <PurchaseDetailModal
        isOpen={Boolean(selectedPurchaseToView)}
        onClose={() => setSelectedPurchaseToView(null)}
        purchase={selectedPurchaseToView}
      />
    </div>
  );
}

export default PurchasesPage;
