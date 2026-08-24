/**
 * pages/ProvidersPage.jsx — Módulo de gestión de Proveedores para CASETECH ERP (HU02/HU03).
 */

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export function ProvidersPage() {
  const { isAdmin } = useAuth();
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState(null);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        skip: 0,
        limit: 50,
        include_inactive: includeInactive,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await apiClient.get('/providers', { params });
      setProviders(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setError('No se pudieron cargar los proveedores. Verifique su conexión con el backend.');
    } finally {
      setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProviders();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [fetchProviders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header del Módulo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
            Directorio de Proveedores
          </h1>
          <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Gestión y consulta de proveedores de materias primas (HU02 & HU03)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => alert('Pronto disponible: Formulario modal para sp_crear_proveedor')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span>➕</span>
            <span>Nuevo Proveedor</span>
          </button>
        )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px', maxWidth: '450px' }}>
          <input
            type="text"
            placeholder="Buscar por NIT o Razón Social..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        {isAdmin && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Mostrar dados de baja (inactivos)</span>
          </label>
        )}
      </div>

      {/* Error si ocurre */}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabla de Proveedores */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '12px',
        border: '1px solid #1f2937',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #1e293b',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              margin: '0 auto 1rem auto',
              animation: 'spin 0.7s linear infinite',
            }} />
            <p style={{ margin: 0 }}>Cargando directorio de proveedores...</p>
          </div>
        ) : providers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
            <p style={{ margin: 0, fontSize: '1rem', color: '#94a3b8' }}>No se encontraron proveedores registrados.</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
              Los registros se crean consumiendo el Stored Procedure <code>sp_crear_proveedor</code>.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0d131f', borderBottom: '1px solid #1f2937', color: '#94a3b8' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>NIT</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Empresa / Razón Social</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Contacto</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Teléfono</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #1f2937',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: '#38bdf8' }}>{p.nit}</td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: '#f8fafc' }}>{p.nombre_empresa}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>{p.contacto_nombre || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>{p.contacto_telefono || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>{p.contacto_email || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: p.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: p.activo ? '#34d399' : '#f87171',
                        border: p.activo ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      }}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProvidersPage;
