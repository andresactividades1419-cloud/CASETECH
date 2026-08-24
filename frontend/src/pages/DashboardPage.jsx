/**
 * pages/DashboardPage.jsx — Panel de control principal de CASETECH ERP.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Banner de Bienvenida */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '2rem 2.5rem',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
              ¡Bienvenido, {user?.nombre_completo || 'Usuario'}!
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
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem' }}>
            ERP de Gestión de Producción y Control de Inventarios para Casetones de Concreto.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to="/providers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span>🏢</span>
            <span>Gestionar Proveedores</span>
          </Link>

          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#0f172a',
              color: '#cbd5e1',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
              border: '1px solid #334155',
            }}
          >
            <span>📖</span>
            <span>Swagger API ↗</span>
          </a>
        </div>
      </div>

      {/* Grid de Resumen del Negocio y BOM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Card: Motor BOM */}
        <div style={{
          backgroundColor: '#111827',
          padding: '1.75rem',
          borderRadius: '12px',
          border: '1px solid #1f2937',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚙️</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f1f5f9' }}>Motor BOM de Casetones</h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
            Clasificación y descuento automatizado de materiales según su naturaleza de consumo:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              borderLeft: '4px solid #38bdf8',
            }}>
              <div style={{ fontWeight: '600', color: '#38bdf8', fontSize: '0.85rem' }}>♻️ Materiales Recuperables</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Lona, Guadua (se reutilizan; descuento parcial por desgaste).
              </div>
            </div>

            <div style={{
              padding: '0.75rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              borderLeft: '4px solid #f59e0b',
            }}>
              <div style={{ fontWeight: '600', color: '#f59e0b', fontSize: '0.85rem' }}>📦 Material Perdido</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Icopor EPS, Cemento, Acero (se consumen íntegramente en cada colada).
              </div>
            </div>
          </div>
        </div>

        {/* Card: Stored Procedures Atómicos */}
        <div style={{
          backgroundColor: '#111827',
          padding: '1.75rem',
          borderRadius: '12px',
          border: '1px solid #1f2937',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f1f5f9' }}>Transaccionalidad y BD</h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
            Procedimientos almacenados en PostgreSQL 16 con concurrencia segura (FOR UPDATE):
          </p>

          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <code style={{ color: '#a78bfa' }}>sp_crear_proveedor</code>: Registro atómico con validación de NIT.
            </li>
            <li>
              <code style={{ color: '#a78bfa' }}>sp_descontar_receta</code>: Descuento seguro de inventario en órdenes.
            </li>
            <li>
              <code style={{ color: '#a78bfa' }}>sp_ajuste_inventario</code>: Ajuste con doble firma y auditoría.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
