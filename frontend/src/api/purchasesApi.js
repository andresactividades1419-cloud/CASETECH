/**
 * api/purchasesApi.js — Servicio API para el Módulo de Compras a Proveedores e Ingreso de Stock (HU07).
 *
 * Conecta con los endpoints de FastAPI bajo /api/v1/purchases.
 */

import apiClient from './client';

export const purchasesApi = {
  /**
   * Obtiene la lista paginada de compras con soporte de filtros.
   * @param {Object} params - { page, limit, proveedor_id, fecha_desde, fecha_hasta, codigo_compra }
   */
  async getPurchases(params = {}) {
    const queryParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };

    if (params.proveedor_id) queryParams.proveedor_id = Number(params.proveedor_id);
    if (params.fecha_desde) queryParams.fecha_desde = params.fecha_desde;
    if (params.fecha_hasta) queryParams.fecha_hasta = params.fecha_hasta;
    if (params.codigo_compra?.trim()) queryParams.codigo_compra = params.codigo_compra.trim();

    const response = await apiClient.get('/purchases/', { params: queryParams });
    return response.data;
  },

  /**
   * Obtiene el detalle completo de una orden de compra por su ID.
   * @param {number|string} id
   */
  async getPurchaseById(id) {
    const response = await apiClient.get(`/purchases/${id}`);
    return response.data;
  },

  /**
   * Registra una nueva compra a proveedor e ingresa stock a inventario.
   * @param {Object} data - { proveedor_id, fecha_compra, items: [{ material_id, cantidad, precio_unitario }], observaciones? }
   */
  async createPurchase(data) {
    const payload = {
      proveedor_id: Number(data.proveedor_id),
      fecha_compra: data.fecha_compra,
      items: data.items.map((it) => ({
        material_id: Number(it.material_id),
        cantidad: parseFloat(it.cantidad),
        precio_unitario: parseFloat(it.precio_unitario),
      })),
      observaciones: data.observaciones?.trim() || null,
    };

    const response = await apiClient.post('/purchases/', payload);
    return response.data;
  },
};

export default purchasesApi;
