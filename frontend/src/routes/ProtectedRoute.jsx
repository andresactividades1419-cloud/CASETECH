/**
 * routes/ProtectedRoute.jsx — Guarda de rutas privadas y control de acceso basado en roles (RBAC).
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b0f19',
        color: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #1e293b',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ fontSize: '0.95rem' }}>Verificando credenciales del sistema...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Validación de rol si se especifican roles permitidos
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.rol)) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: '#f87171',
        backgroundColor: '#1e1e2d',
        margin: '2rem',
        borderRadius: '12px',
        border: '1px solid #ef4444'
      }}>
        <h2>⛔ Acceso Restringido</h2>
        <p style={{ color: '#cbd5e1', marginTop: '0.5rem' }}>
          Su rol actual (<strong>{user?.rol || 'OPERARIO'}</strong>) no cuenta con los permisos requeridos para acceder a esta sección.
        </p>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
