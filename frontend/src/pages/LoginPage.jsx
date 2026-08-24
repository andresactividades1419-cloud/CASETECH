/**
 * pages/LoginPage.jsx — Pantalla de inicio de sesión con JWT para CASETECH ERP.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Si ya está autenticado, redirigir al panel principal
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Error durante inicio de sesión:', err);
      if (err.response?.status === 401) {
        setError('Credenciales inválidas. Verifique su correo y contraseña.');
      } else if (err.response?.status === 422) {
        setError('Formato de datos no procesable. Revise la información ingresada.');
      } else if (!err.response) {
        setError('No se pudo conectar con el servidor backend (http://localhost:8000). Verifique que esté encendido.');
      } else {
        setError(err.response?.data?.detail || 'Ocurrió un error inesperado al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0b0f19',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '1.5rem',
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      }}>
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            marginBottom: '1rem',
            overflow: 'hidden',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.25)',
            border: '2px solid #334155',
          }}>
            <img
              src="/caseton-logo.jpg"
              alt="Casetón de Icopor CASETECH"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            CASETECH <span style={{ color: '#38bdf8' }}>ERP</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              autoFocus
              placeholder="ejemplo@casetech.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              backgroundColor: loading ? '#1d4ed8' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s, transform 0.1s',
            }}
            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? (
              <>
                <span style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.6s linear infinite',
                }} />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>

        {/* Ayuda de Roles y Pruebas */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#0d131f',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          fontSize: '0.8rem',
          color: '#64748b',
          textAlign: 'center',
        }}>
          <div style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Autenticación JWT + RBAC (HU01 & HU14)
          </div>
          <div>Acceso protegido mediante roles <strong>ADMINISTRADOR</strong> y <strong>OPERARIO</strong></div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
