/**
 * components/layout/MainLayout.jsx — Layout principal para la aplicación CASETECH ERP.
 *
 * Contiene:
 * - Sidebar lateral responsivo con navegación por módulos.
 * - Topbar con información de usuario, badge de rol (RBAC) y botón de cierre de sesión.
 * - Contenedor principal con Outlet para vistas anidadas.
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: '📊',
      badge: null,
    },
    {
      to: '/providers',
      label: 'Proveedores',
      icon: '🏢',
      badge: 'HU02/HU03',
    },
    {
      to: '/materials',
      label: 'Materiales & BOM',
      icon: '🧱',
      badge: 'HU10/HU12',
    },
    {
      to: '/orders',
      label: 'Pedidos Producción',
      icon: '📋',
      badge: 'Fase 5',
      disabled: true,
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc' }}>
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar Lateral */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#111827',
          borderRight: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'none',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Brand / Logo */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)',
            border: '1px solid #334155',
            flexShrink: 0,
          }}>
            <img
              src="/caseton-logo.jpg"
              alt="Logo Casetón"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              CASETECH <span style={{ color: '#38bdf8', fontSize: '0.85rem' }}>ERP</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Producción Casetones</div>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Módulos del Sistema
          </div>

          {navItems.map((item) => {
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    color: '#475569',
                    fontSize: '0.9rem',
                    cursor: 'not-allowed',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#1e293b', color: '#64748b', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '600' : '500',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    backgroundColor: isActive ? '#0369a1' : '#1e293b',
                    color: isActive ? '#e0f2fe' : '#94a3b8',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontWeight: '600',
                  }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #1f2937',
          backgroundColor: '#0d131f',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: '#64748b',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span>API Conectada (PostgreSQL 16)</span>
        </div>
      </aside>

      {/* Contenedor Principal (Topbar + Contenido) */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: '64px',
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#e2e8f0' }}>
              ERP CASETECH <span style={{ color: '#64748b', fontWeight: '400' }}>/ Producción</span>
            </div>
          </div>

          {/* Perfil de Usuario y Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>
                  {user?.nombre_completo || 'Usuario'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {user?.email}
                </span>
              </div>

              {/* Badge de Rol */}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                backgroundColor: isAdmin ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isAdmin ? '#c084fc' : '#34d399',
                border: isAdmin ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                {user?.rol || (isAdmin ? 'ADMINISTRADOR' : 'OPERARIO')}
              </span>
            </div>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: '#1e293b',
                color: '#f87171',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.borderColor = '#334155';
              }}
            >
              <span>🚪</span>
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Contenido Principal */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
