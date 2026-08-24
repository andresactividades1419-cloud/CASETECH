/**
 * pages/MaterialsPage.jsx — Gestión de Insumos y Materias Primas para Casetones (HU10 y HU12).
 */

import React, { useState, useEffect, useCallback } from 'react';
import materialsApi from '../api/materialsApi';
import { useAuth } from '../context/AuthContext';
import MaterialModal from '../components/materials/MaterialModal';

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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
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
    setModalOpen(true);
  };

  const handleOpenEdit = (mat) => {
    setSelectedMaterial(mat);
    setModalOpen(true);
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
            <span style={{ fontSize: '2rem' }}>🧱</span>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                Inventario de Materiales e Insumos
              </h1>
              <p style={{ color: '#94a3b8', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                Materias primas para recetas de casetones y monitoreo de stock mínimo (HU10 & HU12)
              </p>
            </div>
          </div>
        </div>

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
            <span>Nuevo Insumo</span>
          </button>
        )}
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
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>TOTAL INSUMOS</div>
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
            <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>DISPONIBLES (ACTIVOS)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>{activeCount}</div>
          </div>
          <span style={{ fontSize: '2rem', opacity: 0.7 }}>🟢</span>
        </div>

        {/* Card Alerta de Stock Crítico */}
        <div
          onClick={() => setOnlyLowStock((prev) => !prev)}
          style={{
            backgroundColor: lowStockCount > 0 ? '#450a0a' : '#111827',
            padding: '1.25rem',
            borderRadius: '12px',
            border: lowStockCount > 0 ? '1px solid #ef4444' : '1px solid #1f2937',
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
              STOCK CRÍTICO (HU12)
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
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '0 0.75rem',
            width: '100%',
          }}>
            <span style={{ color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar insumo (ej: Icopor, Lona, Guadua)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Switch de Alerta de Stock */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: onlyLowStock ? '#ef4444' : '#cbd5e1',
            fontWeight: onlyLowStock ? '700' : '500',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#ef4444' }}
            />
            <span>Solo en Alerta de Stock (&le; Mínimo)</span>
          </label>

          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
              />
              <span>Incluir inactivos</span>
            </label>
          )}

          <button
            onClick={fetchMaterials}
            title="Refrescar inventario"
            style={{
              padding: '0.55rem 0.85rem',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>🔄</span>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          color: '#fca5a5',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchMaterials}
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla de Materiales */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '12px',
        border: '1px solid #1f2937',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid #1e293b',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              margin: '0 auto 1rem auto',
              animation: 'spin 0.7s linear infinite',
            }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Consultando stock en tiempo real...</p>
          </div>
        ) : materials.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              No se encontraron insumos de producción
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.5rem 0', maxWidth: '420px', marginInline: 'auto' }}>
              {search || onlyLowStock
                ? 'No hay registros que coincidan con los filtros aplicados.'
                : 'Aún no se han registrado insumos o materias primas en el inventario.'}
            </p>
            {isAdmin && !search && !onlyLowStock && (
              <button
                onClick={handleOpenCreate}
                style={{
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ➕ Registrar Primer Insumo
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
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Alerta de Stock (HU12)</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Estado</th>
                  {isAdmin && <th style={{ padding: '1rem 1.25rem', fontWeight: '700', textAlign: 'center' }}>Acciones</th>}
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

                      {/* Columna de Acciones */}
                      {isAdmin && (
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            {/* Botón Editar */}
                            <button
                              onClick={() => handleOpenEdit(m)}
                              title="Editar datos del insumo"
                              style={{
                                backgroundColor: '#1f2937',
                                color: '#38bdf8',
                                border: '1px solid #374151',
                                borderRadius: '6px',
                                padding: '0.4rem 0.65rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
                            >
                              <span>✏️</span>
                              <span>Editar</span>
                            </button>

                            {/* Botón Toggle Estado (Borrado Lógico) */}
                            <button
                              onClick={() => handleToggleStatus(m)}
                              disabled={actionLoadingId === m.id}
                              title={m.activo ? 'Desactivar insumo (Borrado Lógico)' : 'Reactivar insumo'}
                              style={{
                                backgroundColor: m.activo ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: m.activo ? '#f87171' : '#34d399',
                                border: m.activo ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '6px',
                                padding: '0.4rem 0.65rem',
                                fontSize: '0.85rem',
                                cursor: actionLoadingId === m.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
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
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro / Edición */}
      <MaterialModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchMaterials();
        }}
        materialToEdit={selectedMaterial}
      />
    </div>
  );
}

export default MaterialsPage;
