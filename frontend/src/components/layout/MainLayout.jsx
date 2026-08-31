/**
 * components/layout/MainLayout.jsx — Layout principal moderno para CASETECH ERP.
 *
 * Configuración:
 * - Menú Lateral con 5 enlaces directos y planos (sin submenús anidados):
 *   1. Dashboard ('/')
 *   2. Proveedores ('/providers')
 *   3. Pedidos ('/orders')
 *   4. Control de Inventario ('/materials')
 *   5. Abastecimiento ('/purchases')
 * - Sidebar colapsable mediante botón hamburguesa en Topbar con animación fluida (0.3s).
 * - Ajuste dinámico de ancho (100% al colapsar).
 * - Libre de etiquetas de backlog / HU y textos técnicos innecesarios.
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para colapsar/expandir el sidebar (Desktop y Móvil)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Enlaces Planos Directos
  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/providers', label: 'Proveedores', icon: '🏢' },
    { to: '/orders', label: 'Pedidos', icon: '📋' },
    { to: '/materials', label: 'Control de Inventario', icon: '📦' },
    { to: '/adjustments', label: 'Ajustes de Inventario', icon: '⚖️' },
    { to: '/purchases', label: 'Abastecimiento', icon: '🛒' },
  ];

  // Helper para el breadcrumb en el Topbar
  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path === '/providers') return 'Proveedores';
    if (path === '/orders') return 'Pedidos';
    if (path === '/materials') return 'Control de Inventario';
    if (path === '/purchases') return 'Abastecimiento';
    if (path === '/adjustments') return 'Ajustes de Inventario';
    return 'Producción';
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0b0f19',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Overlay para móviles */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            zIndex: 45,
          }}
        />
      )}

      {/* =========================================================================
          SIDEBAR LATERAL (260px, con transición suave)
          ========================================================================= */}
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
          transform: window.innerWidth < 1024
            ? (mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)')
            : (sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)'),
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Brand / Header del Sidebar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.4)',
              border: '1.5px solid #334155',
              flexShrink: 0,
            }}>
              <img
                src="/caseton-logo.jpg"
                alt="Logo CASETECH"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div>
              <div style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '-0.03em', color: '#f8fafc', lineHeight: 1 }}>
                CASETECH
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>
                Sistema de Producción
              </div>
            </div>
          </div>

          {/* Botón de cierre en móviles */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="mobile-close-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Navegación del Menú Lateral — 5 Enlaces Planos */}
        <nav style={{
          padding: '1.25rem 0.85rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          overflowY: 'auto',
        }}>
          <div style={{
            padding: '0.4rem 0.75rem',
            fontSize: '0.68rem',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Menú de Operaciones
          </div>

          {navLinks.map((item) => {
            const isActive = location.pathname === item.to || (item.to === '/' && location.pathname === '/dashboard');

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.925rem',
                  fontWeight: isActive ? '700' : '500',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>


      {/* =========================================================================
          CONTENEDOR PRINCIPAL: Topbar + Outlet (Ajuste dinámico al colapsar)
          ========================================================================= */}
      <div
        className="main-layout-content"
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '0px' : '260px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Topbar Superior */}
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}>
          {/* Lado Izquierdo: Botón Hamburguesa Toggle y Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#334155';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.borderColor = '#334155';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>CASETECH</span>
              <span style={{ color: '#64748b' }}>/</span>
              <span style={{ color: '#38bdf8' }}>{getBreadcrumbTitle()}</span>
            </div>
          </div>

          {/* Lado Derecho: Perfil de Usuario, Badge de Rol y Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f1f5f9' }}>
                  {user?.nombre_completo || 'Usuario'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {user?.email}
                </span>
              </div>

              {/* Badge de Rol (RBAC) */}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                backgroundColor: isAdmin ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isAdmin ? '#c084fc' : '#34d399',
                border: isAdmin ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                {user?.rol || (isAdmin ? 'ADMINISTRADOR' : 'OPERARIO')}
              </span>
            </div>

            {/* Botón Salir */}
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

        {/* Contenido Dinámico de la Vista */}
        <main style={{
          flex: 1,
          padding: '2rem',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Reglas CSS para soporte móvil */}
      <style>{`
        @media (max-width: 1023px) {
          .main-layout-content {
            margin-left: 0 !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default MainLayout;
