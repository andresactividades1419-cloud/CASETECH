import React from 'react';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        maxWidth: '550px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #334155'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏗️</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.025em' }}>
          CASETECH ERP
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: 0, marginBottom: '2rem' }}>
          Gestión de Producción y Control de Inventarios de Casetones
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#38bdf8' }}>Frontend React 18 + Vite</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Puerto 3000</div>
            </div>
            <span style={{
              backgroundColor: '#064e3b',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px'
            }}>ACTIVO</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#38bdf8' }}>Backend FastAPI + Swagger</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Puerto 8000</div>
            </div>
            <a
              href="http://localhost:8000/api/v1/docs"
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '600',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Abrir Docs ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
