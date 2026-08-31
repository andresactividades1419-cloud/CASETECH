/**
 * pages/ProvidersPage.jsx — Vista completa de Gestión de Proveedores (HU02, HU03, HU05).
 */

import React, { useState, useEffect, useCallback } from 'react';
import providersApi from '../api/providersApi';
import { useAuth } from '../context/AuthContext';
import ProviderModal from '../components/providers/ProviderModal';

export function ProvidersPage() {
  const { isAdmin } = useAuth();

  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await providersApi.getProviders({
        search: search.trim() || undefined,
        include_inactive: includeInactive,
        limit: 100,
        skip: 0,
      });

      setProviders(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setError('No se pudieron recuperar los proveedores. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProviders();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchProviders]);

  const handleOpenCreate = () => {
    setSelectedProvider(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (provider) => {
    setSelectedProvider(provider);
    setModalOpen(true);
  };

  const handleToggleStatus = async (provider) => {
    const actionName = provider.activo ? 'desactivar (borrado lógico)' : 'reactivar';
    const confirmed = window.confirm(`¿Está seguro de que desea ${actionName} al proveedor "${provider.nombre_empresa}"?`);
    if (!confirmed) return;

    try {
      setActionLoadingId(provider.id);
      const updated = await providersApi.toggleProviderStatus(provider.id);
      showToast(`Proveedor "${updated.nombre_empresa}" ${updated.activo ? 'reactivado' : 'desactivado'} correctamente.`);
      fetchProviders();
    } catch (err) {
      console.error('Error al alternar estado del proveedor:', err);
      showToast(err.response?.data?.detail || 'No se pudo cambiar el estado del proveedor.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cálculos para métricas
  const activeCount = providers.filter((p) => p.activo).length;
  const inactiveCount = providers.filter((p) => !p.activo).length;

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
          animation: 'slideIn 0.3s ease',
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
            <span style={{ fontSize: '2rem' }}>🏢</span>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                Directorio de Proveedores
              </h1>
              <p style={{ color: '#94a3b8', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                Gestión y catálogo de proveedores de materias primas
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
            <span>Nuevo Proveedor</span>
          </button>
        )}
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>TOTAL REGISTROS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', marginTop: '0.25rem' }}>{total}</div>
          </div>
          <span style={{ fontSize: '2rem', opacity: 0.7 }}>📋</span>
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
            <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>ACTIVOS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>{activeCount}</div>
          </div>
          <span style={{ fontSize: '2rem', opacity: 0.7 }}>🟢</span>
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
            <div style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: '600' }}>INACTIVOS (Baja Lógica)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f87171', marginTop: '0.25rem' }}>{inactiveCount}</div>
          </div>
          <span style={{ fontSize: '2rem', opacity: 0.7 }}>🔴</span>
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
              placeholder="Buscar por NIT o Razón Social..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
              />
              <span>Incluir inactivos (baja lógica)</span>
            </label>
          )}

          <button
            onClick={fetchProviders}
            title="Refrescar lista"
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

      {/* Alerta de Error de Carga */}
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
            onClick={fetchProviders}
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

      {/* Tabla de Proveedores */}
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
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Consultando base de datos PostgreSQL...</p>
          </div>
        ) : providers.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              No se encontraron proveedores
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.5rem 0', maxWidth: '400px', marginInline: 'auto' }}>
              {search ? 'No hay resultados que coincidan con la búsqueda actual.' : 'Aún no se han registrado proveedores de materiales en el sistema.'}
            </p>
            {isAdmin && !search && (
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
                ➕ Registrar Primer Proveedor
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0d131f', borderBottom: '1px solid #1f2937', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>NIT / RUC</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Razón Social / Empresa</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Contacto</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Teléfono</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Email</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Estado</th>
                  {isAdmin && <th style={{ padding: '1rem 1.25rem', fontWeight: '700', textAlign: 'center' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #1f2937',
                      transition: 'background-color 0.15s ease',
                      opacity: p.activo ? 1 : 0.65,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2234'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: '#38bdf8' }}>
                      {p.nit}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: '#f8fafc' }}>
                      <div>{p.nombre_empresa}</div>
                      {p.direccion && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                          📍 {p.direccion}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>
                      {p.contacto_nombre || <span style={{ color: '#64748b' }}>—</span>}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>
                      {p.contacto_telefono ? (
                        <a href={`tel:${p.contacto_telefono}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                          📞 {p.contacto_telefono}
                        </a>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>
                      {p.contacto_email ? (
                        <a href={`mailto:${p.contacto_email}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                          ✉️ {p.contacto_email}
                        </a>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        letterSpacing: '0.04em',
                        backgroundColor: p.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: p.activo ? '#34d399' : '#f87171',
                        border: p.activo ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      }}>
                        {p.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>

                    {/* Columna de Acciones para Administradores */}
                    {isAdmin && (
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          {/* Botón Editar */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Editar datos del proveedor"
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
                            onClick={() => handleToggleStatus(p)}
                            disabled={actionLoadingId === p.id}
                            title={p.activo ? 'Desactivar proveedor (Borrado Lógico)' : 'Reactivar proveedor'}
                            style={{
                              backgroundColor: p.activo ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: p.activo ? '#f87171' : '#34d399',
                              border: p.activo ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '6px',
                              padding: '0.4rem 0.65rem',
                              fontSize: '0.85rem',
                              cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            {actionLoadingId === p.id ? (
                              <span>⏳</span>
                            ) : p.activo ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Creación / Edición */}
      <ProviderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchProviders();
        }}
        providerToEdit={selectedProvider}
      />
    </div>
  );
}

export default ProvidersPage;
