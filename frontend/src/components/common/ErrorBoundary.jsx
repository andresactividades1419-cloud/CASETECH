/**
 * components/common/ErrorBoundary.jsx — Capturador de Errores Global en React 18.
 *
 * Previene pantallas en blanco/negro capturando cualquier excepción de renderizado
 * y mostrando una interfaz de recuperación moderna y amigable con el usuario.
 */

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó una excepción no controlada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0b0f19',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '1.25rem',
            }}>
              🛡️
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
              Ha ocurrido un problema inesperado
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1.75rem 0' }}>
              El sistema detectó una excepción en la interfaz. Tus datos están a salvo en la base de datos.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                color: '#f87171',
                fontSize: '0.8rem',
                textAlign: 'left',
                marginBottom: '1.75rem',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}>
                <strong>Detalle:</strong> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                <span>🔄</span>
                <span>Recargar página</span>
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Ir al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
