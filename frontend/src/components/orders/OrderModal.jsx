/**
 * components/orders/OrderModal.jsx — Modal de creación de Pedidos de Producción (HU07).
 *
 * Formulario controlado con:
 * - Campo de cliente (texto libre).
 * - Select dinámico de Tipo de Casetón (cargado desde /api/v1/product-types).
 * - Campo de cantidad (entero positivo).
 * - Date picker de fecha estimada de entrega.
 * - Textarea de observaciones (opcional).
 * - Badge de naturaleza BOM (RECUPERABLE / PERDIDO) según el tipo seleccionado.
 */

import React, { useEffect, useRef, useState } from 'react';
import productTypesApi from '../../api/productTypesApi';
import ordersApi from '../../api/ordersApi';

/* ─── Helpers de estilo ─────────────────────────────────────────────────── */

const today = () => new Date().toISOString().split('T')[0];

const NATURE_BADGE = {
  RECUPERABLE: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)', label: 'Recuperable ♻️' },
  PERDIDO:     { bg: 'rgba(248,113,113,0.15)', color: '#f87171', border: 'rgba(248,113,113,0.3)', label: 'Material Perdido 🔥' },
};

/* ─── Estilos base reutilizables ────────────────────────────────────────── */

const INPUT_STYLE = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const ERROR_STYLE = {
  color: '#f87171',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
};

/* ─── Componente principal ──────────────────────────────────────────────── */

export function OrderModal({ isOpen, onClose, onSuccess }) {
  const [productTypes, setProductTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [form, setForm] = useState({
    cliente: '',
    tipo_caseton_id: '',
    cantidad: '',
    fecha_entrega_estimada: '',
    observaciones: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const firstInputRef = useRef(null);

  // ── Cargar tipos de casetón al abrir el modal ──────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setLoadingTypes(true);
    setApiError('');
    setErrors({});

    productTypesApi.getProductTypes()
      .then((data) => setProductTypes(data.items || []))
      .catch(() => setApiError('No se pudo cargar el catálogo de tipos de casetón.'))
      .finally(() => setLoadingTypes(false));

    // Reset del formulario al abrir
    setForm({
      cliente: '',
      tipo_caseton_id: '',
      cantidad: '',
      fecha_entrega_estimada: '',
      observaciones: '',
    });

    // Foco en el primer campo
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ── Tipo seleccionado (para mostrar badge de naturaleza BOM) ──────────
  const selectedType = productTypes.find(
    (t) => String(t.id) === String(form.tipo_caseton_id)
  );

  // ── Cambio de campo ────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  // ── Validación cliente ─────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.cliente.trim() || form.cliente.trim().length < 3) {
      errs.cliente = 'El nombre del cliente debe tener al menos 3 caracteres.';
    }
    if (!form.tipo_caseton_id) {
      errs.tipo_caseton_id = 'Seleccione un tipo de casetón.';
    }
    const qty = parseInt(form.cantidad, 10);
    if (!form.cantidad || isNaN(qty) || qty < 1) {
      errs.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
    }
    if (!form.fecha_entrega_estimada) {
      errs.fecha_entrega_estimada = 'Ingrese la fecha estimada de entrega.';
    } else if (form.fecha_entrega_estimada < today()) {
      errs.fecha_entrega_estimada = 'La fecha de entrega no puede ser pasada.';
    }
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      await ordersApi.createOrder(form);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Error al registrar el pedido. Intente nuevamente.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.75rem 1rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 id="order-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc' }}>
              📋 Nuevo Pedido de Producción
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              El código PED-YYYY-XXXXX se genera automáticamente
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate style={{ padding: '1.5rem 1.75rem' }}>
          {/* Error global de API */}
          {apiError && (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}>
              ⚠️ {apiError}
            </div>
          )}

          {/* Campo: Cliente */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="om-cliente" style={LABEL_STYLE}>
              Cliente / Proyecto <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="om-cliente"
              ref={firstInputRef}
              type="text"
              name="cliente"
              value={form.cliente}
              onChange={handleChange}
              placeholder="Ej: Constructora El Pinar S.A.S."
              style={{
                ...INPUT_STYLE,
                borderColor: errors.cliente ? '#ef4444' : '#334155',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; }}
              onBlur={(e) => { e.target.style.borderColor = errors.cliente ? '#ef4444' : '#334155'; }}
            />
            {errors.cliente && <p style={ERROR_STYLE}>{errors.cliente}</p>}
          </div>

          {/* Campo: Tipo de Casetón */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="om-tipo" style={LABEL_STYLE}>
              Tipo de Casetón <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              id="om-tipo"
              name="tipo_caseton_id"
              value={form.tipo_caseton_id}
              onChange={handleChange}
              disabled={loadingTypes}
              style={{
                ...INPUT_STYLE,
                borderColor: errors.tipo_caseton_id ? '#ef4444' : '#334155',
                cursor: loadingTypes ? 'wait' : 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.85rem center',
                paddingRight: '2.5rem',
              }}
            >
              <option value="">
                {loadingTypes ? 'Cargando tipos...' : '— Selecciona un tipo —'}
              </option>
              {productTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.naturaleza})
                </option>
              ))}
            </select>
            {errors.tipo_caseton_id && <p style={ERROR_STYLE}>{errors.tipo_caseton_id}</p>}

            {/* Badge BOM del tipo seleccionado */}
            {selectedType && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {(() => {
                  const badge = NATURE_BADGE[selectedType.naturaleza] || {};
                  return (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}>
                      BOM: {badge.label}
                    </span>
                  );
                })()}
                {selectedType.descripcion && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedType.descripcion}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fila: Cantidad + Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
            {/* Cantidad */}
            <div>
              <label htmlFor="om-cantidad" style={LABEL_STYLE}>
                Cantidad (unidades) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="om-cantidad"
                type="number"
                name="cantidad"
                value={form.cantidad}
                onChange={handleChange}
                min={1}
                step={1}
                placeholder="Ej: 100"
                style={{
                  ...INPUT_STYLE,
                  borderColor: errors.cantidad ? '#ef4444' : '#334155',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; }}
                onBlur={(e) => { e.target.style.borderColor = errors.cantidad ? '#ef4444' : '#334155'; }}
              />
              {errors.cantidad && <p style={ERROR_STYLE}>{errors.cantidad}</p>}
            </div>

            {/* Fecha estimada */}
            <div>
              <label htmlFor="om-fecha" style={LABEL_STYLE}>
                Fecha Entrega Estimada <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="om-fecha"
                type="date"
                name="fecha_entrega_estimada"
                value={form.fecha_entrega_estimada}
                onChange={handleChange}
                min={today()}
                style={{
                  ...INPUT_STYLE,
                  borderColor: errors.fecha_entrega_estimada ? '#ef4444' : '#334155',
                  colorScheme: 'dark',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; }}
                onBlur={(e) => { e.target.style.borderColor = errors.fecha_entrega_estimada ? '#ef4444' : '#334155'; }}
              />
              {errors.fecha_entrega_estimada && <p style={ERROR_STYLE}>{errors.fecha_entrega_estimada}</p>}
            </div>
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="om-obs" style={LABEL_STYLE}>Observaciones (opcional)</label>
            <textarea
              id="om-obs"
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={3}
              placeholder="Instrucciones especiales, referencia de obra, condiciones de entrega..."
              style={{
                ...INPUT_STYLE,
                resize: 'vertical',
                minHeight: '72px',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; }}
              onBlur={(e) => { e.target.style.borderColor = '#334155'; }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loadingTypes}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: submitting ? '#1e3a5f' : '#0369a1',
                border: '1px solid transparent',
                borderRadius: '8px',
                color: '#f0f9ff',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: submitting ? 'wait' : 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#075985'; }}
              onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#0369a1'; }}
            >
              {submitting ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid #7dd3fc',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  Registrando...
                </>
              ) : (
                '+ Registrar Pedido'
              )}
            </button>
          </div>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default OrderModal;
