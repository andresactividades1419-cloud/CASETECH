/**
 * pages/LoginPage.jsx — Pantalla de inicio de sesión inspirada en Katana MRP para CASETECH.
 *
 * Ajustes aplicados:
 * 1. Logo 50% más grande con animación interactiva fluida.
 * 2. Removido el bloque inferior de acceso rápido de prueba.
 * 3. Subtítulo del mockup actualizado a "(acceso al sistema integral CASETECH)".
 * 4. Eliminados los badges BOM y Stored Procedures.
 * 5. Nombre principal simplificado a únicamente "CASETECH".
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
  const [showPassword, setShowPassword] = useState(false);
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
        setError('No se pudo conectar con el servidor backend. Verifique que esté encendido.');
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
      width: '100%',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      alignItems: 'stretch',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* =========================================================================
          CONTENEDOR PRINCIPAL: Grid Asimétrico (5 / 7)
          ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        width: '100%',
        minHeight: '100vh',
      }}>

        {/* ─────────────────────────────────────────────────────────────────────────
            COLUMNA IZQUIERDA: Formulario de Autenticación (5 columnas en Desktop)
            ───────────────────────────────────────────────────────────────────────── */}
        <div style={{
          gridColumn: 'span 12',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem 2rem',
          backgroundColor: '#f8fafc',
          boxShadow: '4px 0 24px -10px rgba(0, 0, 0, 0.05)',
          zIndex: 10,
        }}
        className="login-left-col"
        >
          <div style={{
            maxWidth: '420px',
            width: '100%',
            margin: '0 auto',
          }}>
            {/* Header Superior: Logo de CASETECH (50% más grande + animado) */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                textDecoration: 'none',
                cursor: 'default',
              }}>
                <div
                  className="animate-logo"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    backgroundColor: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                    overflow: 'hidden',
                    border: '2px solid #e2e8f0',
                  }}
                >
                  <img
                    src="/caseton-logo.jpg"
                    alt="CASETECH Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <span style={{
                  fontSize: '1.95rem',
                  fontWeight: '900',
                  letterSpacing: '-0.04em',
                  color: '#0f172a',
                  lineHeight: '1',
                }}>
                  CASETECH
                </span>
              </div>
            </div>

            {/* Título Principal */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2.35rem',
                fontWeight: '800',
                letterSpacing: '-0.03em',
                color: '#0f172a',
                margin: '0 0 0.5rem 0',
                lineHeight: '1.15',
              }}>
                Iniciar sesión
              </h1>
              <p style={{
                fontSize: '0.95rem',
                color: '#64748b',
                margin: 0,
                lineHeight: '1.4',
              }}>
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {/* Alerta de Error */}
            {error && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                color: '#991b1b',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                lineHeight: '1.4',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.05)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Input: Correo Electrónico */}
              <div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {/* Icono de Correo integrado a la izquierda */}
                  <div style={{
                    position: 'absolute',
                    left: '1rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>

                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Correo electrónico (dominio de la empresa)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.95rem 1rem 0.95rem 3rem',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      color: '#0f172a',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0f172a';
                      e.target.style.boxShadow = '0 0 0 4px rgba(15, 23, 42, 0.06)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
                    }}
                  />
                </div>
              </div>

              {/* Input: Contraseña */}
              <div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {/* Icono de Candado integrado a la izquierda */}
                  <div style={{
                    position: 'absolute',
                    left: '1rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>

                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.95rem 3rem 0.95rem 3rem',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      color: '#0f172a',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0f172a';
                      e.target.style.boxShadow = '0 0 0 4px rgba(15, 23, 42, 0.06)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
                    }}
                  />

                  {/* Toggle para ver contraseña */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '0.9rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                    }}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Enlace: ¿No recuerdas tu contraseña? */}
              <div style={{ textAlign: 'center', marginTop: '-0.25rem' }}>
                <a
                  href="#recuperar"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Para restablecer su contraseña, contacte al Administrador del sistema CASETECH (admin@casetech.com).');
                  }}
                  style={{
                    fontSize: '0.875rem',
                    color: '#64748b',
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#0f172a'}
                  onMouseLeave={(e) => e.target.style.color = '#64748b'}
                >
                  ¿No recuerdas tu contraseña?
                </a>
              </div>

              {/* Botón Principal Submit — Katana Lime Neón */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem 1.5rem',
                  backgroundColor: loading ? '#c2e93b' : '#d4f84c',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '1rem',
                  fontWeight: '800',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 14px rgba(212, 248, 76, 0.35), 0 1px 2px rgba(0, 0, 0, 0.05)',
                  letterSpacing: '-0.01em',
                  opacity: loading ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#c8ee3a';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 248, 76, 0.45)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#d4f84c';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(212, 248, 76, 0.35)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      border: '2.5px solid rgba(15, 23, 42, 0.2)',
                      borderTopColor: '#0f172a',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>
            </form>
          </div>
        </div>


        {/* ─────────────────────────────────────────────────────────────────────────
            COLUMNA DERECHA: Mockup Katana MRP + Patrón Geométrico (7 columnas)
            ───────────────────────────────────────────────────────────────────────── */}
        <div style={{
          gridColumn: 'span 12',
          display: 'none',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          backgroundColor: '#eef2f6',
          overflow: 'hidden',
        }}
        className="login-right-col"
        >
          {/* Patrón de Fondo Geométrico Sutil estilo Katana (Líneas redondeadas concéntricas) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 800 800"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '120%',
                height: '120%',
                opacity: 0.55,
              }}
            >
              <rect x="80" y="80" width="640" height="640" rx="60" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="6 6" />
              <rect x="140" y="140" width="520" height="520" rx="48" stroke="#cbd5e1" strokeWidth="2" />
              <rect x="200" y="200" width="400" height="400" rx="36" stroke="#94a3b8" strokeWidth="1.5" opacity="0.6" />
              <circle cx="200" cy="200" r="4" fill="#d4f84c" />
              <circle cx="600" cy="200" r="4" fill="#d4f84c" />
              <circle cx="200" cy="600" r="4" fill="#cbd5e1" />
              <circle cx="600" cy="600" r="4" fill="#cbd5e1" />
            </svg>
          </div>

          {/* Card Flotante Centralizada tipo Mockup ERP */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '540px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            overflow: 'hidden',
            zIndex: 5,
            transition: 'transform 0.3s ease',
          }}
          className="animate-float"
          >
            {/* Barra Superior Oscura de la App */}
            <div style={{
              backgroundColor: '#0f172a',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
            }}>
              {/* Logo / Marca en la app */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  boxShadow: '16px 0 0 #f59e0b, 32px 0 0 #10b981',
                }} />
                <span style={{
                  marginLeft: '2.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}>
                  CASETECH
                </span>
              </div>

              {/* Tabs simulados con indicador activo en Lima Neón */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '28px', height: '5px', borderRadius: '3px', backgroundColor: '#334155' }} />
                {/* Tab Activo en Lima */}
                <div style={{
                  width: '38px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: '#d4f84c',
                  boxShadow: '0 0 10px rgba(212, 248, 76, 0.6)',
                }} />
                <div style={{ width: '28px', height: '5px', borderRadius: '3px', backgroundColor: '#334155' }} />
                <div style={{ width: '28px', height: '5px', borderRadius: '3px', backgroundColor: '#334155' }} />
                <div style={{ width: '28px', height: '5px', borderRadius: '3px', backgroundColor: '#334155' }} />
              </div>
            </div>

            {/* Cuerpo del Mockup: Esqueleto Tenue y Mensaje de Bienvenida */}
            <div style={{
              padding: '3rem 2rem',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              backgroundColor: '#fafbfc',
            }}>
              {/* Esqueleto Tenue de Fondo (Grid y Filas de Datos ERP) */}
              <div style={{
                position: 'absolute',
                inset: '1.25rem',
                opacity: 0.35,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <div style={{ width: '80px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                  <div style={{ width: '60px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                  <div style={{ width: '100px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginLeft: 'auto' }} />
                </div>
                <div style={{ width: '100%', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '100%', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '100%', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '100%', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '100%', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
              </div>

              {/* Contenido en Primer Plano */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.5rem 0',
              }}>
                {/* Icono de Producción / Celebración (Estilo Katana) */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08), 0 0 0 1px #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  position: 'relative',
                }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                  {/* Punto Neón Acéntico */}
                  <span style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#d4f84c',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 8px rgba(212, 248, 76, 0.8)',
                  }} />
                </div>

                {/* Título de Marca */}
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  margin: '0 0 0.5rem 0',
                  letterSpacing: '-0.025em',
                }}>
                  ¡Todo listo para producir!
                </h3>

                {/* Subtítulo Actualizado */}
                <p style={{
                  fontSize: '0.95rem',
                  color: '#64748b',
                  margin: 0,
                  maxWidth: '340px',
                  lineHeight: '1.45',
                  fontWeight: '500',
                }}>
                  (acceso al sistema integral CASETECH)
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Reglas CSS Responsivas para breakpoints Desktop (lg:grid-cols-12) */}
      <style>{`
        @media (min-width: 1024px) {
          .login-left-col {
            grid-column: span 5 !important;
            padding: 3.5rem 4rem !important;
          }
          .login-right-col {
            grid-column: span 7 !important;
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
