/**
 * pages/DashboardPage.jsx — Panel de Control Ejecutivo, Kardex de Trazabilidad y Auditoría (HU14, HU15).
 *
 * Características:
 * - 5 Tarjetas KPI consolidadas en tiempo real.
 * - Desglose analítico de producción por tipo de casetón y naturaleza BOM (Recuperable vs. Perdido).
 * - Pestañas interactivas:
 *   * Tab 1: Kardex inmutable de movimientos de stock con filtros y snapshots (antes/después).
 *   * Tab 2: Bitácora de auditoría de acciones del sistema con visor de payloads JSON.
 * - Exportación de reporte a formato CSV e impresión ejecutiva.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dashboardApi from '../api/dashboardApi';
import { useAuth } from '../context/AuthContext';

const formatCOP = (val) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const MOVEMENT_TYPE_CONFIG = {
  INGRESO_COMPRA: { label: 'Ingreso Compra', icon: '📥', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.3)' },
  DESCUENTO_PRODUCCION: { label: 'Descuento BOM (Recup.)', icon: '♻️', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)' },
  DESCUENTO_PRODUCCION_DEFINITIVO: { label: 'Consumo BOM (Perdido)', icon: '🔥', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.3)' },
  AJUSTE_APROBADO: { label: 'Ajuste Aprobado', icon: '⚖️', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.3)' },
  DEVOLUCION_CANCELACION: { label: 'Devolución Cancelación', icon: '↩️', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)' },
};

export function DashboardPage() {
  const { user, isAdmin } = useAuth();

  // Estados de datos
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Pestañas
  const [activeTab, setActiveTab] = useState('kardex'); // 'kardex' | 'audit'

  // Kardex state
  const [movements, setMovements] = useState([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementTypeFilter, setMovementTypeFilter] = useState('TODOS');
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('TODAS');
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedJsonPayload, setSelectedJsonPayload] = useState(null);

  // 1. Cargar Métricas Principales
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const data = await dashboardApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // 2. Cargar Kardex
  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const data = await dashboardApi.getStockMovements({
        page: movementsPage,
        limit: 20,
        tipo_movimiento: movementTypeFilter !== 'TODOS' ? movementTypeFilter : undefined,
      });
      setMovements(data.items || []);
      setTotalMovements(data.total || 0);
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  }, [movementsPage, movementTypeFilter]);

  // 3. Cargar Auditoría
  const fetchAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAudit(true);
    try {
      const data = await dashboardApi.getAuditLogs({
        page: auditPage,
        limit: 20,
        entidad: entityFilter !== 'TODAS' ? entityFilter : undefined,
      });
      setAuditLogs(data.items || []);
      setTotalAuditLogs(data.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, [isAdmin, auditPage, entityFilter]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (activeTab === 'kardex') {
      fetchMovements();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchMovements, fetchAuditLogs]);

  // Exportar Kardex a CSV
  const handleExportCSV = () => {
    if (movements.length === 0) return;

    const headers = ['ID', 'Fecha', 'Material', 'Tipo Movimiento', 'Cantidad', 'Stock Antes', 'Stock Después', 'Referencia Tipo', 'Referencia ID', 'Usuario'];
    const rows = movements.map((m) => [
      m.id,
      `"${new Date(m.created_at).toLocaleString()}"`,
      `"${m.material_nombre}"`,
      `"${m.tipo_movimiento}"`,
      m.cantidad,
      m.stock_antes,
      m.stock_despues,
      `"${m.referencia_tipo || ''}"`,
      m.referencia_id || '',
      `"${m.usuario_nombre || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kardex_casetech_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = metrics?.kpis || {
    total_pedidos: 0,
    pedidos_en_produccion: 0,
    compras_mes_cop: 0,
    materiales_alerta_stock: 0,
    ajustes_pendientes: 0,
  };

  const produccion = metrics?.produccion_por_tipo || [];
  const totalUnidadesProd = produccion.reduce((acc, p) => acc + (parseFloat(p.total_unidades) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Banner de Bienvenida y Accesos Rápidos */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        border: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Panel General · Auditoría y Reportes (HU15)
            </h1>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: isAdmin ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isAdmin ? '#c084fc' : '#34d399',
              border: isAdmin ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
            }}>
              {user?.rol || (isAdmin ? 'ADMINISTRADOR' : 'OPERARIO')}
            </span>
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
            Monitor central de producción BOM, abastecimiento a proveedores y Kardex inmutable de inventario.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { fetchMetrics(); if (activeTab === 'kardex') fetchMovements(); else fetchAuditLogs(); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <span>🔄</span>
            <span>Refrescar</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              backgroundColor: '#0369a1',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(3, 105, 161, 0.3)',
            }}
          >
            <span>📥</span>
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              backgroundColor: '#0f172a',
              color: '#94a3b8',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 5 Tarjetas KPI Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Pedidos Totales */}
        <Link to="/orders" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1f2937'; }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
            }}>
              📦
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                Órdenes Totales
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.15rem' }}>
                {loadingMetrics ? '—' : kpis.total_pedidos}
              </div>
            </div>
          </div>
        </Link>

        {/* KPI 2: En Fabricación */}
        <Link to="/orders" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1f2937'; }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
            }}>
              ⚙️
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                En Fabricación Activa
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0284c7', marginTop: '0.15rem' }}>
                {loadingMetrics ? '—' : kpis.pedidos_en_produccion}
              </div>
            </div>
          </div>
        </Link>

        {/* KPI 3: Inversión en Compras */}
        <Link to="/purchases" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#34d399'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1f2937'; }}
          >
            <div style={{
              width: '46px',
              height: '46px',
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
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                Gasto Compras (COP)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399', marginTop: '0.15rem' }}>
                {loadingMetrics ? '—' : formatCOP(kpis.compras_mes_cop)}
              </div>
            </div>
          </div>
        </Link>

        {/* KPI 4: Alertas de Stock */}
        <Link to="/materials" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#111827',
            border: kpis.materiales_alerta_stock > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1f2937',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f87171'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = kpis.materiales_alerta_stock > 0 ? 'rgba(239, 68, 68, 0.4)' : '#1f2937'; }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: kpis.materiales_alerta_stock > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.12)',
              border: `1px solid ${kpis.materiales_alerta_stock > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
            }}>
              ⚠️
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                Stock Crítico
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: kpis.materiales_alerta_stock > 0 ? '#f87171' : '#cbd5e1', marginTop: '0.15rem' }}>
                {loadingMetrics ? '—' : kpis.materiales_alerta_stock}
              </div>
            </div>
          </div>
        </Link>

        {/* KPI 5: Ajustes Pendientes */}
        <Link to="/adjustments" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#111827',
            border: kpis.ajustes_pendientes > 0 ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid #1f2937',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fbbf24'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = kpis.ajustes_pendientes > 0 ? 'rgba(251, 191, 36, 0.4)' : '#1f2937'; }}
          >
            <div style={{
              width: '46px',
              height: '46px',
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
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                Ajustes por Firma
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.15rem' }}>
                {loadingMetrics ? '—' : kpis.ajustes_pendientes}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Desglose de Producción BOM */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '14px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
              Distribución de Producción por Tipo de Casetón (BOM)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Comparativa de volumen según naturaleza de consumo: Material Recuperable ♻️ vs. Material Perdido 🔥.
            </p>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>
            Total Fabricado: {totalUnidadesProd} unidades
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {produccion.map((item, idx) => {
            const isRecuperable = item.naturaleza === 'RECUPERABLE';
            const percentage = totalUnidadesProd > 0 ? Math.round((parseFloat(item.total_unidades) / totalUnidadesProd) * 100) : 0;

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.95rem' }}>
                    {item.tipo_caseton}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: isRecuperable ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                    color: isRecuperable ? '#4ade80' : '#f87171',
                    border: `1px solid ${isRecuperable ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                  }}>
                    {isRecuperable ? 'Recuperable ♻️' : 'Material Perdido 🔥'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800', color: isRecuperable ? '#4ade80' : '#f87171' }}>
                    {item.total_unidades} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#94a3b8' }}>unidades</span>
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {item.total_pedidos} {item.total_pedidos === 1 ? 'pedido' : 'pedidos'} ({percentage}%)
                  </span>
                </div>

                {/* Barra de progreso */}
                <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: isRecuperable ? '#4ade80' : '#f87171',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pestañas de Kardex y Auditoría */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        {/* Cabecera de Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid #1f2937',
          backgroundColor: '#1e293b',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('kardex')}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: activeTab === 'kardex' ? '1px solid #38bdf8' : '1px solid transparent',
                backgroundColor: activeTab === 'kardex' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: activeTab === 'kardex' ? '#38bdf8' : '#94a3b8',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>📊</span>
              <span>Trazabilidad de Stock (Kardex)</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('audit')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'audit' ? '1px solid #c084fc' : '1px solid transparent',
                  backgroundColor: activeTab === 'audit' ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
                  color: activeTab === 'audit' ? '#c084fc' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🛡️</span>
                <span>Bitácora de Auditoría del Sistema</span>
              </button>
            )}
          </div>

          {/* Filtros para la pestaña activa */}
          {activeTab === 'kardex' ? (
            <select
              value={movementTypeFilter}
              onChange={(e) => { setMovementTypeFilter(e.target.value); setMovementsPage(1); }}
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            >
              <option value="TODOS">Todos los movimientos</option>
              <option value="INGRESO_COMPRA">Ingreso Compra</option>
              <option value="DESCUENTO_PRODUCCION">Descuento BOM (Recuperable)</option>
              <option value="DESCUENTO_PRODUCCION_DEFINITIVO">Consumo BOM (Perdido)</option>
              <option value="AJUSTE_APROBADO">Ajustes de Inventario</option>
              <option value="DEVOLUCION_CANCELACION">Devoluciones</option>
            </select>
          ) : (
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setAuditPage(1); }}
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            >
              <option value="TODAS">Todas las entidades</option>
              <option value="pedidos">Pedidos</option>
              <option value="compras">Compras</option>
              <option value="ajustes_inventario">Ajustes Inventario</option>
              <option value="proveedores">Proveedores</option>
            </select>
          )}
        </div>

        {/* Contenido: Tab 1 (Kardex) */}
        {activeTab === 'kardex' && (
          <div>
            {loadingMovements ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '1.75rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
                <div style={{ marginTop: '0.5rem' }}>Cargando movimientos de inventario...</div>
              </div>
            ) : movements.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No se registraron movimientos con los filtros seleccionados.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0b0f19', borderBottom: '1px solid #1f2937', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Fecha / Hora</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Materia Prima</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Tipo Movimiento</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Cantidad</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Trazabilidad Stock</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Referencia</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Ejecutado Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov) => {
                      const cfg = MOVEMENT_TYPE_CONFIG[mov.tipo_movimiento] || { label: mov.tipo_movimiento, icon: '🔹', color: '#94a3b8', bg: '#1e293b', border: '#334155' };
                      const isPositive = parseFloat(mov.cantidad) > 0 && mov.tipo_movimiento === 'INGRESO_COMPRA';

                      return (
                        <tr key={mov.id} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.78rem' }}>
                            {new Date(mov.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#f8fafc' }}>
                            {mov.material_nombre}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
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
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: isPositive ? '#4ade80' : '#f87171' }}>
                            {isPositive ? `+${mov.cantidad}` : `-${Math.abs(mov.cantidad)}`}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            <span>{mov.stock_antes}</span> <span style={{ color: '#64748b' }}>➔</span> <strong style={{ color: '#38bdf8' }}>{mov.stock_despues}</strong>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                            {mov.referencia_tipo ? `${mov.referencia_tipo} #${mov.referencia_id}` : '—'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                            👤 {mov.usuario_nombre || 'Sistema'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contenido: Tab 2 (Auditoría del Sistema) */}
        {activeTab === 'audit' && isAdmin && (
          <div>
            {loadingAudit ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '1.75rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
                <div style={{ marginTop: '0.5rem' }}>Cargando bitácora de auditoría...</div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No se registraron logs con los filtros actuales.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0b0f19', borderBottom: '1px solid #1f2937', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Fecha / Hora</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Acción</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Entidad Afectada</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Usuario Ejecutor</th>
                      <th style={{ padding: '0.75rem 1rem' }}>IP Origen</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Detalle JSON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #1f2937' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.78rem' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                          }}>
                            {log.accion}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: '600' }}>
                          {log.entidad} {log.entidad_id ? `(#${log.entidad_id})` : ''}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          👤 {log.usuario_nombre || 'Sistema'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>
                          {log.ip_address || 'localhost'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedJsonPayload(log.detalles_json)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#38bdf8',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Ver JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Visor de JSON para Auditoría */}
      {selectedJsonPayload && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #334155',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #1f2937',
              backgroundColor: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>
                Payload Estructurado de Auditoría
              </span>
              <button
                onClick={() => setSelectedJsonPayload(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, backgroundColor: '#0b0f19' }}>
              <pre style={{
                margin: 0,
                color: '#38bdf8',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {JSON.stringify(selectedJsonPayload, null, 2)}
              </pre>
            </div>
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #1f2937', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedJsonPayload(null)}
                style={{
                  padding: '0.45rem 1rem',
                  backgroundColor: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
