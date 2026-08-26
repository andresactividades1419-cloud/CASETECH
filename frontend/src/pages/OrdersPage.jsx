/**
 * pages/OrdersPage.jsx — Vista de Pedidos de Producción (HU07, HU08, HU11).
 *
 * Características:
 * - Métricas en cards superiores (Total, Pendientes, En Producción, Completados).
 * - Filtros por estado (pills) y buscador por cliente.
 * - Tabla interactiva con badges de estado por color.
 * - Botón "Iniciar Producción" que dispara sp_descontar_receta.
 * - Toast en pantalla con detalle de stock insuficiente si el SP falla.
 * - Modal de creación integrado.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ordersApi from '../api/ordersApi';
import OrderModal from '../components/orders/OrderModal';
import { useAuth } from '../context/AuthContext';

/* ─── Configuración de estados ─────────────────────────────────────────── */

const STATUS_CONFIG = {
  PENDIENTE: {
    label: 'Pendiente',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.3)',
    icon: '⏳',
  },
  EN_PRODUCCION: {
    label: 'En Producción',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.3)',
    icon: '⚙️',
  },
  COMPLETADO: {
    label: 'Completado',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.3)',
    icon: '✅',
  },
  CANCELADO: {
    label: 'Cancelado',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.3)',
    icon: '✖️',
  },
};

const FILTER_TABS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PRODUCCION', label: 'En Producción' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

/* ─── Sub-componente: Badge de estado ──────────────────────────────────── */

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] || {
    label: estado,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.1)',
    border: 'rgba(148,163,184,0.3)',
    icon: '●',
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ─── Sub-componente: Toast de error de stock ──────────────────────────── */

function StockErrorToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 9000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 999,
      maxWidth: '480px',
      backgroundColor: '#1c0b0b',
      border: '1px solid rgba(239,68,68,0.5)',
      borderLeft: '4px solid #ef4444',
      borderRadius: '10px',
      padding: '1rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'slideInRight 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f87171', marginBottom: '0.4rem' }}>
            ⚠️ Stock insuficiente para iniciar producción
          </div>
          <div style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5 }}>
            {message}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}
        >
          ×
        </button>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

/* ─── Sub-componente: Toast de éxito ───────────────────────────────────── */

function SuccessToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 999,
      maxWidth: '380px',
      backgroundColor: '#0a1f1a',
      border: '1px solid rgba(52,211,153,0.4)',
      borderLeft: '4px solid #34d399',
      borderRadius: '10px',
      padding: '0.85rem 1.1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'slideInRight 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
    }}>
      <span style={{ fontSize: '1.1rem' }}>✅</span>
      <span style={{ fontSize: '0.85rem', color: '#6ee7b7' }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: 'auto' }}
      >
        ×
      </button>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────────────────── */

export function OrdersPage() {
  const { isAdmin } = useAuth();

  // ── Estado de datos ──────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID del pedido en acción

  // ── Filtros ──────────────────────────────────────────────────────────
  const [estadoFilter, setEstadoFilter] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [debouncedCliente, setDebouncedCliente] = useState('');

  // ── Modal ────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);

  // ── Toasts ───────────────────────────────────────────────────────────
  const [stockError, setStockError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Débounce del buscador de cliente ────────────────────────────────
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedCliente(clienteSearch), 400);
  }, [clienteSearch]);

  // ── Carga de pedidos ─────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getOrders({
        estado: estadoFilter || undefined,
        cliente: debouncedCliente || undefined,
        limit: 100,
      });
      setOrders(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, debouncedCliente]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Métricas derivadas ───────────────────────────────────────────────
  const metrics = {
    total,
    pendientes:    orders.filter((o) => o.estado === 'PENDIENTE').length,
    en_produccion: orders.filter((o) => o.estado === 'EN_PRODUCCION').length,
    completados:   orders.filter((o) => o.estado === 'COMPLETADO').length,
  };

  // ── Acción: cambiar estado ────────────────────────────────────────────
  const handleStatusChange = async (order, newStatus) => {
    setActionLoading(order.id);
    setStockError('');
    setSuccessMsg('');
    try {
      await ordersApi.updateOrderStatus(order.id, newStatus);
      const statusLabels = {
        EN_PRODUCCION: 'iniciada en producción',
        COMPLETADO: 'marcada como completada',
        CANCELADO: 'cancelada',
      };
      setSuccessMsg(`Pedido ${order.codigo_pedido} ${statusLabels[newStatus] || 'actualizado'}.`);
      await fetchOrders();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && (detail.toLowerCase().includes('stock') || detail.toLowerCase().includes('inventario'))) {
        setStockError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      } else {
        setStockError(
          typeof detail === 'string'
            ? detail
            : `Error al cambiar el estado del pedido ${order.codigo_pedido}.`
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── Formatear fecha ──────────────────────────────────────────────────
  const fmtDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <div style={{ color: '#f8fafc' }}>

      {/* ── Toasts ─────────────────────────────────────────────────── */}
      {stockError && (
        <StockErrorToast message={stockError} onDismiss={() => setStockError('')} />
      )}
      {successMsg && (
        <SuccessToast message={successMsg} onDismiss={() => setSuccessMsg('')} />
      )}

      {/* ── Modal ──────────────────────────────────────────────────── */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Pedido registrado exitosamente.');
          fetchOrders();
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>
            📋 Pedidos de Producción
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Gestión de órdenes de fabricación de casetones · Motor BOM automático
          </p>
        </div>
        <button
          id="btn-nuevo-pedido"
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.35rem',
            backgroundColor: '#0369a1',
            color: '#f0f9ff',
            border: 'none',
            borderRadius: '9px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            boxShadow: '0 4px 14px rgba(3,105,161,0.35)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#075985'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0369a1'; }}
        >
          <span style={{ fontSize: '1.1rem' }}>+</span> Nuevo Pedido
        </button>
      </div>

      {/* ── Cards de métricas ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Pedidos', value: metrics.total, color: '#94a3b8', icon: '📊' },
          { label: 'Pendientes',    value: metrics.pendientes, color: '#fbbf24', icon: '⏳' },
          { label: 'En Producción', value: metrics.en_produccion, color: '#38bdf8', icon: '⚙️' },
          { label: 'Completados',   value: metrics.completados, color: '#34d399', icon: '✅' },
        ].map((m) => (
          <div key={m.label} style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: m.color, lineHeight: 1 }}>
              {loading ? '—' : m.value}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Filtros y búsqueda ─────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
      }}>
        {/* Pills de estado */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {FILTER_TABS.map((tab) => {
            const active = estadoFilter === tab.value;
            const cfg = STATUS_CONFIG[tab.value];
            return (
              <button
                key={tab.value}
                id={`filter-${tab.value || 'all'}`}
                onClick={() => setEstadoFilter(tab.value)}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '9999px',
                  border: `1px solid ${active ? (cfg?.border || 'rgba(56,189,248,0.4)') : '#334155'}`,
                  backgroundColor: active ? (cfg?.bg || 'rgba(56,189,248,0.1)') : 'transparent',
                  color: active ? (cfg?.color || '#38bdf8') : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: active ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <div style={{ width: '1px', height: '28px', backgroundColor: '#1f2937', margin: '0 0.25rem' }} />

        {/* Buscador de cliente */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '0.9rem' }}>
            🔍
          </span>
          <input
            id="search-cliente"
            type="text"
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; }}
            onBlur={(e) => { e.target.style.borderColor = '#334155'; }}
          />
        </div>
      </div>

      {/* ── Tabla de pedidos ───────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Cabecera de la tabla */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 1fr 80px 100px 140px 200px',
          padding: '0.75rem 1.25rem',
          backgroundColor: '#0d131f',
          borderBottom: '1px solid #1f2937',
          fontSize: '0.72rem',
          fontWeight: '700',
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          gap: '0.5rem',
        }}>
          <span># Pedido</span>
          <span>Cliente</span>
          <span>Tipo Casetón</span>
          <span>Cant.</span>
          <span>Entrega</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {/* Filas */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            <div style={{
              width: '36px', height: '36px', border: '3px solid #1f2937',
              borderTopColor: '#38bdf8', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
            }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Cargando pedidos...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#64748b' }}>
              No se encontraron pedidos
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
              {estadoFilter || clienteSearch
                ? 'Prueba ajustando los filtros de búsqueda.'
                : 'Registra el primer pedido de producción con el botón "+ Nuevo Pedido".'}
            </p>
          </div>
        ) : (
          orders.map((order, idx) => (
            <OrderRow
              key={order.id}
              order={order}
              idx={idx}
              isActionLoading={actionLoading === order.id}
              onStatusChange={handleStatusChange}
              fmtDate={fmtDate}
            />
          ))
        )}
      </div>

      {/* ── Footer de paginación ────────────────────────────────────── */}
      {!loading && orders.length > 0 && (
        <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.78rem', color: '#475569' }}>
          Mostrando {orders.length} de {total} pedidos
        </div>
      )}
    </div>
  );
}

/* ─── Sub-componente: Fila de tabla ────────────────────────────────────── */

function OrderRow({ order, idx, isActionLoading, onStatusChange, fmtDate }) {
  const isEven = idx % 2 === 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr 1fr 80px 100px 140px 200px',
        padding: '0.9rem 1.25rem',
        borderBottom: '1px solid #1a2332',
        backgroundColor: isEven ? 'transparent' : 'rgba(255,255,255,0.015)',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'background-color 0.1s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isEven ? 'transparent' : 'rgba(255,255,255,0.015)'; }}
    >
      {/* # Código */}
      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#38bdf8', fontFamily: 'monospace' }}>
        {order.codigo_pedido}
      </span>

      {/* Cliente */}
      <span style={{ fontSize: '0.85rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.cliente}
      </span>

      {/* Tipo casetón */}
      <span style={{ fontSize: '0.82rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.tipo_caseton_nombre || `ID: ${order.tipo_caseton_id}`}
      </span>

      {/* Cantidad */}
      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9', textAlign: 'right' }}>
        {order.cantidad?.toLocaleString('es-CO')}
      </span>

      {/* Fecha entrega */}
      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
        {fmtDate(order.fecha_entrega_estimada)}
      </span>

      {/* Estado */}
      <StatusBadge estado={order.estado} />

      {/* Acciones */}
      <ActionButtons
        order={order}
        isLoading={isActionLoading}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

/* ─── Sub-componente: Botones de acción ────────────────────────────────── */

function ActionButtons({ order, isLoading, onStatusChange }) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.78rem' }}>
        <span style={{
          width: '14px', height: '14px',
          border: '2px solid #334155',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
        }} />
        Procesando...
      </div>
    );
  }

  const btnBase = {
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.12s ease',
  };

  switch (order.estado) {
    case 'PENDIENTE':
      return (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            id={`btn-iniciar-${order.id}`}
            title="Inicia producción y descuenta materiales del inventario (BOM)"
            onClick={() => onStatusChange(order, 'EN_PRODUCCION')}
            style={{
              ...btnBase,
              backgroundColor: 'rgba(56,189,248,0.12)',
              color: '#38bdf8',
              borderColor: 'rgba(56,189,248,0.3)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.12)'; }}
          >
            ⚙️ Iniciar Producción
          </button>
          <button
            id={`btn-cancelar-${order.id}`}
            onClick={() => onStatusChange(order, 'CANCELADO')}
            style={{
              ...btnBase,
              backgroundColor: 'rgba(248,113,113,0.08)',
              color: '#f87171',
              borderColor: 'rgba(248,113,113,0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)'; }}
          >
            ✖ Cancelar
          </button>
        </div>
      );

    case 'EN_PRODUCCION':
      return (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            id={`btn-completar-${order.id}`}
            onClick={() => onStatusChange(order, 'COMPLETADO')}
            style={{
              ...btnBase,
              backgroundColor: 'rgba(52,211,153,0.12)',
              color: '#34d399',
              borderColor: 'rgba(52,211,153,0.3)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(52,211,153,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(52,211,153,0.12)'; }}
          >
            ✅ Completar
          </button>
          <button
            id={`btn-cancelar-prod-${order.id}`}
            onClick={() => onStatusChange(order, 'CANCELADO')}
            style={{
              ...btnBase,
              backgroundColor: 'rgba(248,113,113,0.08)',
              color: '#f87171',
              borderColor: 'rgba(248,113,113,0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)'; }}
          >
            ✖ Cancelar
          </button>
        </div>
      );

    case 'COMPLETADO':
    case 'CANCELADO':
      return (
        <span style={{ fontSize: '0.75rem', color: '#334155', fontStyle: 'italic' }}>
          Estado final
        </span>
      );

    default:
      return null;
  }
}

export default OrdersPage;
