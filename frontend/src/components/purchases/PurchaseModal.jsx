/**
 * components/purchases/PurchaseModal.jsx — Modal interactivo de creación de Órdenes de Compra (HU07).
 *
 * Características:
 * - Selector dinámico de Proveedores activos.
 * - Fecha de compra y observaciones (factura / remisión).
 * - Lista dinámica de materias primas con cálculo reactivo de subtotales y gran total en COP.
 * - Validación por cada línea de material.
 * - Ingreso automático de stock y movimiento de kardex al confirmar.
 */

import React, { useEffect, useRef, useState } from 'react';
import materialsApi from '../../api/materialsApi';
import providersApi from '../../api/providersApi';
import purchasesApi from '../../api/purchasesApi';

const today = () => new Date().toISOString().split('T')[0];

const formatCOP = (val) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

const INPUT_STYLE = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#94a3b8',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export function PurchaseModal({ isOpen, onClose, onSuccess }) {
  const [providers, setProviders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [proveedorId, setProveedorId] = useState('');
  const [fechaCompra, setFechaCompra] = useState(today());
  const [observaciones, setObservaciones] = useState('');

  const [items, setItems] = useState([
    { material_id: '', cantidad: '', precio_unitario: '' },
  ]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const firstSelectRef = useRef(null);

  // Cargar catálogo de proveedores y materiales al abrir modal
  useEffect(() => {
    if (!isOpen) return;

    setLoadingData(true);
    setApiError('');
    setErrors({});
    setProveedorId('');
    setFechaCompra(today());
    setObservaciones('');
    setItems([{ material_id: '', cantidad: '', precio_unitario: '' }]);

    Promise.all([
      providersApi.getProviders({ limit: 100, include_inactive: false }),
      materialsApi.getMaterials({ limit: 100, activo: true }),
    ])
      .then(([provData, matData]) => {
        const activeProviders = (provData.items || []).filter((p) => p.activo !== false);
        const activeMaterials = (matData.items || []).filter((m) => m.activo !== false);
        setProviders(activeProviders);
        setMaterials(activeMaterials);
      })
      .catch((err) => {
        setApiError('Error al cargar catálogos de proveedores o materiales.');
      })
      .finally(() => setLoadingData(false));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstSelectRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejo de ítems dinámicos
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);

    if (errors[`item_${index}_${field}`]) {
      setErrors((prev) => ({ ...prev, [`item_${index}_${field}`]: '' }));
    }
    if (apiError) setApiError('');
  };

  const addItemRow = () => {
    setItems([...items, { material_id: '', cantidad: '', precio_unitario: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Cálculo del Total General
  const calculateTotal = () => {
    return items.reduce((acc, it) => {
      const cant = parseFloat(it.cantidad) || 0;
      const precio = parseFloat(it.precio_unitario) || 0;
      return acc + (cant * precio);
    }, 0);
  };

  const validate = () => {
    const newErrors = {};

    if (!proveedorId) {
      newErrors.proveedor_id = 'Seleccione un proveedor.';
    }

    if (!fechaCompra) {
      newErrors.fecha_compra = 'Indique la fecha de la compra.';
    }

    if (items.length === 0) {
      newErrors.general = 'Debe agregar al menos un material a la compra.';
    }

    items.forEach((it, idx) => {
      if (!it.material_id) {
        newErrors[`item_${idx}_material_id`] = 'Seleccione material.';
      }
      const c = parseFloat(it.cantidad);
      if (!it.cantidad || isNaN(c) || c <= 0) {
        newErrors[`item_${idx}_cantidad`] = 'Cantidad > 0.';
      }
      const p = parseFloat(it.precio_unitario);
      if (it.precio_unitario === '' || isNaN(p) || p < 0) {
        newErrors[`item_${idx}_precio_unitario`] = 'Precio >= 0.';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');

    try {
      const payload = {
        proveedor_id: proveedorId,
        fecha_compra: fechaCompra,
        items: items.map((it) => ({
          material_id: it.material_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
        observaciones: observaciones,
      };

      const response = await purchasesApi.createPurchase(payload);
      onSuccess(response, `Orden de compra ${response.codigo_compra} registrada exitosamente.`);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al procesar la compra.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCOP = calculateTotal();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              color: '#38bdf8',
            }}>
              🛒
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc' }}>
                Registrar Orden de Compra & Abastecimiento
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Ingreso atómico de stock e historial inmutable en Kardex (HU07)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario con scroll */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {apiError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
              }}>
                <span>⚠️</span>
                <span>{apiError}</span>
              </div>
            )}

            {/* Cabecera: Proveedor y Fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={LABEL_STYLE}>
                  Proveedor <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  ref={firstSelectRef}
                  value={proveedorId}
                  onChange={(e) => {
                    setProveedorId(e.target.value);
                    if (errors.proveedor_id) setErrors((prev) => ({ ...prev, proveedor_id: '' }));
                  }}
                  disabled={loadingData}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: errors.proveedor_id ? '#f87171' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- Seleccione un proveedor activo --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_empresa} (NIT: {p.nit})
                    </option>
                  ))}
                </select>
                {errors.proveedor_id && (
                  <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {errors.proveedor_id}
                  </div>
                )}
              </div>

              <div>
                <label style={LABEL_STYLE}>
                  Fecha de Compra <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="date"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: errors.fecha_compra ? '#f87171' : '#334155',
                  }}
                />
              </div>
            </div>

            {/* Observaciones / Factura */}
            <div>
              <label style={LABEL_STYLE}>Observaciones / N° Factura o Remisión (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Factura Electrónica FE-8921 - Entrega directa en bodega central"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            {/* Tabla Dinámica de Ítems */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Detalle de Materias Primas a Abastecer
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <span>➕</span>
                  <span>Agregar Material</span>
                </button>
              </div>

              <div style={{
                backgroundColor: '#0b0f19',
                border: '1px solid #1f2937',
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', width: '40%' }}>Materia Prima</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '20%' }}>Cantidad</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '20%' }}>Precio Unit. (COP)</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '15%' }}>Subtotal</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '5%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const selMat = materials.find((m) => String(m.id) === String(it.material_id));
                      const cantNum = parseFloat(it.cantidad) || 0;
                      const precNum = parseFloat(it.precio_unitario) || 0;
                      const subtotal = cantNum * precNum;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                          {/* Selector de Material */}
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <select
                              value={it.material_id}
                              onChange={(e) => handleItemChange(idx, 'material_id', e.target.value)}
                              style={{
                                ...INPUT_STYLE,
                                padding: '0.45rem 0.6rem',
                                fontSize: '0.8rem',
                                borderColor: errors[`item_${idx}_material_id`] ? '#f87171' : '#334155',
                              }}
                            >
                              <option value="">-- Seleccione --</option>
                              {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nombre} ({m.unidad_medida})
                                </option>
                              ))}
                            </select>
                            {selMat && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Stock actual: {selMat.stock_actual} {selMat.unidad_medida}
                              </div>
                            )}
                          </td>

                          {/* Cantidad */}
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                placeholder="0.00"
                                value={it.cantidad}
                                onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                                style={{
                                  ...INPUT_STYLE,
                                  padding: '0.45rem 0.6rem',
                                  fontSize: '0.8rem',
                                  textAlign: 'right',
                                  borderColor: errors[`item_${idx}_cantidad`] ? '#f87171' : '#334155',
                                }}
                              />
                            </div>
                          </td>

                          {/* Precio Unitario */}
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="$ 0.00"
                              value={it.precio_unitario}
                              onChange={(e) => handleItemChange(idx, 'precio_unitario', e.target.value)}
                              style={{
                                ...INPUT_STYLE,
                                padding: '0.45rem 0.6rem',
                                fontSize: '0.8rem',
                                textAlign: 'right',
                                borderColor: errors[`item_${idx}_precio_unitario`] ? '#f87171' : '#334155',
                              }}
                            />
                          </td>

                          {/* Subtotal Calculado */}
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#38bdf8', fontSize: '0.85rem' }}>
                            {formatCOP(subtotal)}
                          </td>

                          {/* Botón Eliminar */}
                          <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={items.length <= 1}
                              title="Eliminar fila"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: items.length > 1 ? '#f87171' : '#475569',
                                cursor: items.length > 1 ? 'pointer' : 'not-allowed',
                                fontSize: '1rem',
                                padding: '0.2rem',
                              }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer con Resumen y Total */}
          <div style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid #1f2937',
            backgroundColor: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>
                  Ítems
                </span>
                <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>
                  {items.length} {items.length === 1 ? 'material' : 'materiales'}
                </strong>
              </div>
              <div style={{ borderLeft: '1px solid #334155', paddingLeft: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>
                  Total Compra
                </span>
                <strong style={{ color: '#4ade80', fontSize: '1.35rem', fontWeight: '800' }}>
                  {formatCOP(totalCOP)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.6rem 1.5rem',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                    <span>Procesando Ingreso...</span>
                  </>
                ) : (
                  <>
                    <span>📦</span>
                    <span>Confirmar Compra & Ingresar Stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PurchaseModal;
