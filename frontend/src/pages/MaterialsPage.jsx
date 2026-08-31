/**
 * pages/MaterialsPage.jsx — Control de Inventario y Gestión de Insumos para CASETECH ERP.
 *
 * Características:
 * - Cabecera "Control de Inventario" con botones "+ Nuevo Material" y "⚖️ Ajuste Manual de Stock".
 * - Tarjetas de métricas y alertas de stock crítico.
 * - Tabla completa con acciones: Editar, Ajustar (con preselección de insumo) y Desactivar/Reactivar.
 * - Conectado a MaterialModal y AdjustmentModal con retroalimentación vía Toast.
 */

import React, { useState, useEffect, useCallback } from 'react';
import materialsApi from '../api/materialsApi';
import { useAuth } from '../context/AuthContext';
import MaterialModal from '../components/materials/MaterialModal';
import AdjustmentModal from '../components/adjustments/AdjustmentModal';

export function MaterialsPage() {
  const { isAdmin } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal State para Materiales
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal State para Ajustes de Inventario
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentMaterialId, setAdjustmentMaterialId] = useState(null);

  const showToast = (message, type = 'success') => {
    const text = typeof message === 'string'
      ? message
      : (message?.detail || message?.message || 'Operación completada.');
    setToast({ message: text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialsApi.getMaterials({
        nombre: search.trim() || undefined,
        alerta_stock: onlyLowStock ? true : undefined,
        activo: includeInactive ? undefined : true,
        limit: 100,
        skip: 0,
      });

      setMaterials(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error al cargar insumos:', err);
      setError('No se pudieron recuperar los insumos de inventario.');
    } finally {
      setLoading(false);
    }
  }, [search, onlyLowStock, includeInactive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaterials();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchMaterials]);

  const handleOpenCreate = () => {
    setSelectedMaterial(null);
    setMaterialModalOpen(true);
  };

  const handleOpenEdit = (mat) => {
    setSelectedMaterial(mat);
    setMaterialModalOpen(true);
  };

  const handleOpenAdjustment = (materialId = null) => {
    setAdjustmentMaterialId(materialId);
    setAdjustmentModalOpen(true);
  };

  const handleToggleStatus = async (mat) => {
    const actionName = mat.activo ? 'desactivar (borrado lógico)' : 'reactivar';
    const confirmed = window.confirm(`¿Está seguro de que desea ${actionName} el insumo "${mat.nombre}"?`);
    if (!confirmed) return;

    try {
      setActionLoadingId(mat.id);
      const updated = await materialsApi.toggleMaterialStatus(mat.id);
      showToast(`Insumo "${updated.nombre}" ${updated.activo ? 'reactivado' : 'desactivado'} correctamente.`);
      fetchMaterials();
    } catch (err) {
      console.error('Error al alternar estado del material:', err);
      showToast(err.response?.data?.detail || 'No se pudo cambiar el estado del insumo.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Métricas
  const lowStockCount = materials.filter((m) => Number(m.stock_actual) <= Number(m.stock_minimo)).length;
  const activeCount = materials.filter((m) => m.activo).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: toast.type === 'error' ? '#7f1d1d' : '#064e3b',
          color: toast.type === 'error' ? '#fecaca' : '#d1fae5',
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem',
          fontWeight: '500',
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header del Módulo */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>📦</span>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Control de Inventario
              </h1>
              <p style={{ color: '#94a3b8', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                Inventario de materias primas, insumos de colado y control de stock en tiempo real
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción de Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Botón Secundario: Ajuste Manual de Stock */}
          <button
            onClick={() => handleOpenAdjustment(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#1e293b',
              color: '#c084fc',
              border: '1px solid rgba(192, 132, 252, 0.35)',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.15)';
              e.currentTarget.style.borderColor = '#c084fc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.35)';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⚖️</span>
            <span>Ajuste Manual de Stock</span>
          </button>

          {/* Botón Primario: + Nuevo Material */}
          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.35rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              <span style={{ fontSize: '1.1rem' }}>➕</span>
              <span>Nuevo Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas y Alertas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        <div style={{
          backgroundColor: '#111827',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>TOTAL MATERIALES</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', marginTop: '0.25rem' }}>{total}</div>
          </div>
          <span style={{ fontSize: '2rem', opacity: 0.7 }}>📦</span>
        </div>

        <div style={{
          backgroundColor: '#111827',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>ACTIVOS PARA PRODUCCIÓN</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>{activeCount}</div>
          </div>
          <span style={{ fontSize: '2rem' }}>✅</span>
        </div>

        {/* Alerta Stock Crítico */}
        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          style={{
            backgroundColor: lowStockCount > 0 ? '#1c131d' : '#111827',
            padding: '1.25rem',
            borderRadius: '12px',
            border: `1px solid ${lowStockCount > 0 ? '#ef4444' : '#1f2937'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          title="Clic para filtrar insumos con stock crítico"
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: lowStockCount > 0 ? '#fca5a5' : '#94a3b8', fontWeight: '700' }}>
              STOCK CRÍTICO
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: lowStockCount > 0 ? '#ef4444' : '#94a3b8', marginTop: '0.25rem' }}>
              {lowStockCount} {lowStockCount > 0 && <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>Reabastecer</span>}
            </div>
          </div>
          <span style={{ fontSize: '2rem' }}>{lowStockCount > 0 ? '🚨' : '🛡️'}</span>
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
        {/* Buscador */}
        <div style={{ flex: '1 1 300px', maxWidth: '450px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar material por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              backgroundColor: '#0d131f',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Checkboxes de Filtro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }}
            />
            <span>Solo Alerta de Stock Crítico</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <span>Incluir Desactivados</span>
          </label>
        </div>
      </div>

      {/* Tabla de Materiales */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>Cargando inventario de materiales...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ marginTop: '0.5rem' }}>{error}</p>
            <button
              onClick={fetchMaterials}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        ) : materials.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '2.5rem' }}>🧱</span>
            <p style={{ marginTop: '0.75rem', fontSize: '1rem', color: '#94a3b8' }}>
              No se encontraron materiales con los filtros aplicados.
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenCreate}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                + Registrar Primer Material
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0d131f', borderBottom: '1px solid #1f2937', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Insumo / Materia Prima</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Unidad</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Stock Actual</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Stock Mínimo</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Alerta de Stock</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Estado</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const stockActualNum = Number(m.stock_actual);
                  const stockMinimoNum = Number(m.stock_minimo);
                  const isCritical = stockActualNum <= stockMinimoNum;

                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid #1f2937',
                        transition: 'background-color 0.15s ease',
                        opacity: m.activo ? 1 : 0.65,
                        backgroundColor: isCritical && m.activo ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2234'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isCritical && m.activo ? 'rgba(239, 68, 68, 0.04)' : 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{m.nombre}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: '#1e293b',
                          color: '#93c5fd',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                        }}>
                          {m.unidad_medida}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', fontSize: '1rem', color: isCritical ? '#ef4444' : '#38bdf8' }}>
                        {Number(m.stock_actual).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontWeight: '500' }}>
                        {Number(m.stock_minimo).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {isCritical ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.18)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            animation: 'pulse 2s infinite',
                          }}>
                            <span>🚨</span>
                            <span>STOCK CRÍTICO</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}>
                            <span>🟢</span>
                            <span>NORMAL</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          letterSpacing: '0.04em',
                          backgroundColor: m.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: m.activo ? '#34d399' : '#f87171',
                          border: m.activo ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        }}>
                          {m.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>

                      {/* Columna de Acciones: Editar, Ajustar, Desactivar */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
                          {/* 1. Botón Editar */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEdit(m)}
                              title="Editar datos del material"
                              style={{
                                backgroundColor: '#1f2937',
                                color: '#38bdf8',
                                border: '1px solid #374151',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#38bdf8';
                                e.currentTarget.style.backgroundColor = '#1e293b';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#374151';
                                e.currentTarget.style.backgroundColor = '#1f2937';
                              }}
                            >
                              <span>✏️</span>
                              <span>Editar</span>
                            </button>
                          )}

                          {/* 2. Botón Ajustar Stock */}
                          <button
                            onClick={() => handleOpenAdjustment(m.id)}
                            title={`Solicitar ajuste manual de inventario para ${m.nombre}`}
                            style={{
                              backgroundColor: '#1e293b',
                              color: '#c084fc',
                              border: '1px solid rgba(192, 132, 252, 0.35)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#c084fc';
                              e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.35)';
                              e.currentTarget.style.backgroundColor = '#1e293b';
                            }}
                          >
                            <span>⚖️</span>
                            <span>Ajustar</span>
                          </button>

                          {/* 3. Botón Toggle Estado (Borrado Lógico) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleStatus(m)}
                              disabled={actionLoadingId === m.id}
                              title={m.activo ? 'Desactivar insumo (Borrado Lógico)' : 'Reactivar insumo'}
                              style={{
                                backgroundColor: m.activo ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: m.activo ? '#f87171' : '#34d399',
                                border: m.activo ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: actionLoadingId === m.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {actionLoadingId === m.id ? (
                                <span>⏳</span>
                              ) : m.activo ? (
                                <>
                                  <span>🚫</span>
                                  <span>Desactivar</span>
                                </>
                              ) : (
                                <>
                                  <span>✅</span>
                                  <span>Reactivar</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro / Edición de Material */}
      <MaterialModal
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchMaterials();
        }}
        materialToEdit={selectedMaterial}
      />

      {/* Modal de Ajuste Manual de Inventario */}
      <AdjustmentModal
        isOpen={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchMaterials();
        }}
        initialMaterialId={adjustmentMaterialId}
      />
    </div>
  );
}

export default MaterialsPage;
