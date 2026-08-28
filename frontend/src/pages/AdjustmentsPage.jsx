/**
 * pages/AdjustmentsPage.jsx — Pantalla Principal de Ajustes Manuales de Inventario y Auditoría (HU13).
 *
 * Características:
 * - Tarjetas KPI: Pendientes de Revisión, Mermas Aprobadas, Sobrantes Aprobados, Total de Solicitudes.
 * - Filtros rápidos por estado (Todos, Pendiente, Aprobado, Rechazado) y selector por tipo de ajuste.
 * - Tabla interactiva y responsive con snapshots de stock (antes/después), trazabilidad de usuarios (solicitante/revisor) y motivo.
 * - Acciones RBAC: Los administradores pueden abrir el ReviewModal para aprobar/rechazar con doble firma.
 * - Manejo de Toasts y feedback en tiempo real.
 */

import React, { useCallback, useEffect, useState } from 'react';
import adjustmentsApi from '../api/adjustmentsApi';
import AdjustmentModal from '../components/adjustments/AdjustmentModal';
import ReviewModal from '../components/adjustments/ReviewModal';
import { useAuth } from '../context/AuthContext';

/* ─── Configuraciones de Estado y Tipos ──────────────────────────────────── */

const STATUS_CONFIG = {
  PENDIENTE: {
    label: 'Pendiente',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    icon: '🟡',
  },
  PENDIENTE_APROBACION: {
    label: 'Pendiente',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    icon: '🟡',
  },
  APROBADO: {
    label: 'Aprobado',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.3)',
    icon: '🟢',
  },
  RECHAZADO: {
    label: 'Rechazado',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.3)',
    icon: '🔴',
  },
};

const TYPE_CONFIG = {
  MERMA: { label: 'Merma', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.3)', icon: '📉' },
  DANO: { label: 'Daño', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.3)', icon: '⚠️' },
  SOBRANTE: { label: 'Sobrante', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.3)', icon: '📈' },
  CONTEO_FISICO: { label: 'Conteo Físico', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', icon: '⚖️' },
  DEVOLUCION_PROVEEDOR: { label: 'Devolución Prov.', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.3)', icon: '📦' },
};

/* ─── Sub-componentes ────────────────────────────────────────────────────── */

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG.PENDIENTE;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

function TypeBadge({ tipo }) {
  const cfg = TYPE_CONFIG[tipo] || { label: tipo, color: '#94a3b8', bg: '#1e293b', border: '#334155', icon: '🔹' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.2rem 0.55rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

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

export function AdjustmentsPage() {
  const { isAdmin } = useAuth();

  const [adjustments, setAdjustments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [tipoFilter, setTipoFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAdjustmentToReview, setSelectedAdjustmentToReview] = useState(null);

  // Toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Carga de datos
  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adjustmentsApi.getAdjustments({
        page,
        limit,
        estado: estadoFilter !== 'TODOS' ? estadoFilter : undefined,
        tipo: tipoFilter !== 'TODOS' ? tipoFilter : undefined,
      });

      setAdjustments(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al cargar los ajustes de inventario.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, estadoFilter, tipoFilter]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  // Filtrado local por buscador
  const filteredAdjustments = adjustments.filter((adj) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (adj.material_nombre && adj.material_nombre.toLowerCase().includes(term)) ||
      (adj.solicitante_nombre && adj.solicitante_nombre.toLowerCase().includes(term)) ||
      (adj.motivo && adj.motivo.toLowerCase().includes(term)) ||
      String(adj.id).includes(term)
    );
  });

  // Métricas para KPI cards
  const pendingCount = adjustments.filter((a) => a.estado === 'PENDIENTE' || a.estado === 'PENDIENTE_APROBACION').length;
  const approvedMermas = adjustments.filter((a) => a.estado === 'APROBADO' && (a.tipo === 'MERMA' || a.tipo === 'DANO')).length;
  const approvedSobrantes = adjustments.filter((a) => a.estado === 'APROBADO' && a.tipo === 'SOBRANTE').length;

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

      {/* Header & Acciones */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Ajustes Manuales y Auditoría de Stock
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Control de mermas, sobrantes, daños y recuentos físicos con doble firma obligatoria (HU13).
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
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0369a1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0284c7'; }}
        >
          <span>➕</span>
          <span>Solicitar Ajuste</span>
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* KPI: Pendientes */}
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
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pendientes de Firma
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.15rem' }}>
              {pendingCount}
            </div>
          </div>
        </div>

        {/* KPI: Mermas Aprobadas */}
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
            backgroundColor: 'rgba(248, 113, 113, 0.12)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            📉
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mermas / Bajas
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f87171', marginTop: '0.15rem' }}>
              {approvedMermas}
            </div>
          </div>
        </div>

        {/* KPI: Sobrantes Aprobados */}
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
            backgroundColor: 'rgba(74, 222, 128, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            📈
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sobrantes / Altas
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#4ade80', marginTop: '0.15rem' }}>
              {approvedSobrantes}
            </div>
          </div>
        </div>

        {/* KPI: Total de Solicitudes */}
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
            🗂️
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Auditoría
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.15rem' }}>
              {total}
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
        {/* Pills de Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'PENDIENTE', label: '⏳ Pendientes' },
            { id: 'APROBADO', label: '✅ Aprobados' },
            { id: 'RECHAZADO', label: '❌ Rechazados' },
          ].map((tab) => {
            const active = estadoFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setEstadoFilter(tab.id); setPage(1); }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  border: active ? '1px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: active ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                  color: active ? '#38bdf8' : '#94a3b8',
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

        {/* Selector de Tipo y Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
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
            <option value="TODOS">Todos los tipos</option>
            <option value="MERMA">Merma / Desperdicio</option>
            <option value="DANO">Material Dañado</option>
            <option value="SOBRANTE">Sobrante / Excedente</option>
            <option value="CONTEO_FISICO">Conteo Físico</option>
          </select>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por material, solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>

      {/* Tabla de Ajustes */}
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
            <div>Cargando registros de auditoría...</div>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📋</div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#cbd5e1', fontSize: '1rem', fontWeight: '600' }}>
              No se encontraron solicitudes de ajuste
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Pruebe cambiando los filtros o registre una nueva solicitud con el botón superior.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>#ID / Fecha</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Materia Prima</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Tipo</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Cantidad</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Trazabilidad Stock</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Solicitante / Revisor</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Motivo / Justificación</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((adj) => {
                  const isPending = adj.estado === 'PENDIENTE' || adj.estado === 'PENDIENTE_APROBACION';
                  return (
                    <tr
                      key={adj.id}
                      style={{
                        borderBottom: '1px solid #1f2937',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* ID & Fecha */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#38bdf8' }}>#{adj.id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {adj.created_at ? new Date(adj.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>

                      {/* Material */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                          {adj.material_nombre || `Material #${adj.material_id}`}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <TypeBadge tipo={adj.tipo} />
                      </td>

                      {/* Cantidad */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          color: adj.tipo === 'SOBRANTE' ? '#4ade80' : '#f87171',
                        }}>
                          {adj.tipo === 'SOBRANTE' ? `+${adj.cantidad}` : `-${adj.cantidad}`}
                        </span>
                      </td>

                      {/* Stock Antes / Después */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <div>Antes: <strong style={{ color: '#cbd5e1' }}>{adj.stock_antes ?? '—'}</strong></div>
                        {adj.stock_despues !== null && adj.stock_despues !== undefined && (
                          <div style={{ color: '#38bdf8' }}>
                            Después: <strong>{adj.stock_despues}</strong>
                          </div>
                        )}
                      </td>

                      {/* Solicitante y Revisor */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                        <div style={{ color: '#cbd5e1' }}>
                          👤 {adj.solicitante_nombre || `Usuario #${adj.solicitante_id}`}
                        </div>
                        {adj.revisor_nombre && (
                          <div style={{ color: '#a78bfa', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                            🛡️ {adj.revisor_nombre}
                          </div>
                        )}
                      </td>

                      {/* Motivo */}
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '280px' }}>
                        <div style={{
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          lineHeight: '1.3',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }} title={adj.motivo}>
                          {adj.motivo}
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <StatusBadge estado={adj.estado} />
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {isPending && isAdmin ? (
                          <button
                            onClick={() => setSelectedAdjustmentToReview(adj)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              backgroundColor: 'rgba(168, 85, 247, 0.15)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              borderRadius: '6px',
                              color: '#c084fc',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#9333ea';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.15)';
                              e.currentTarget.style.color = '#c084fc';
                            }}
                          >
                            <span>🛡️</span>
                            <span>Revisar</span>
                          </button>
                        ) : isPending && !isAdmin ? (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            En espera admin
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Completado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Solicitud */}
      <AdjustmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created, msg) => {
          showToast(msg || 'Solicitud de ajuste creada exitosamente.', 'success');
          fetchAdjustments();
        }}
      />

      {/* Modal de Revisión (Admin) */}
      <ReviewModal
        isOpen={Boolean(selectedAdjustmentToReview)}
        adjustment={selectedAdjustmentToReview}
        onClose={() => setSelectedAdjustmentToReview(null)}
        onSuccess={(updated, msg) => {
          showToast(msg || 'Ajuste evaluado correctamente.', 'success');
          fetchAdjustments();
        }}
      />
    </div>
  );
}

export default AdjustmentsPage;
