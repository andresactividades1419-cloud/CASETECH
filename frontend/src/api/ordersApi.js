/**
 * api/ordersApi.js — Servicio API para el módulo de Pedidos de Producción (HU07, HU08, HU11).
 *
 * Conecta con los endpoints de FastAPI bajo /api/v1/orders.
 */

import apiClient from './client';

export const ordersApi = {
  /**
   * Obtiene la lista paginada de pedidos de producción con soporte de filtros.
   * @param {Object} params - { skip, limit, estado, cliente, tipo_caseton_id, fecha_inicio, fecha_fin }
   */
  async getOrders(params = {}) {
    const queryParams = {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
    };

    if (params.estado) queryParams.estado = params.estado;
    if (params.cliente?.trim()) queryParams.cliente = params.cliente.trim();
    if (params.tipo_caseton_id) queryParams.tipo_caseton_id = params.tipo_caseton_id;
    if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
    if (params.fecha_fin) queryParams.fecha_fin = params.fecha_fin;

    const response = await apiClient.get('/orders', { params: queryParams });
    return response.data;
  },

  /**
   * Obtiene el detalle completo de un pedido por su ID.
   * @param {number|string} id
   */
  async getOrderById(id) {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  /**
   * Registra un nuevo pedido de producción.
   * @param {Object} data - { cliente, tipo_caseton_id, cantidad, fecha_entrega_estimada, observaciones? }
   */
  async createOrder(data) {
    const payload = {
      cliente: String(data.cliente).trim(),
      tipo_caseton_id: Number(data.tipo_caseton_id),
      cantidad: Number(data.cantidad),
      fecha_entrega_estimada: data.fecha_entrega_estimada,
      observaciones: data.observaciones?.trim() || null,
    };
    const response = await apiClient.post('/orders', payload);
    return response.data;
  },

  /**
   * Actualiza el estado de un pedido. Al pasar a EN_PRODUCCION ejecuta el SP BOM.
   * @param {number|string} id
   * @param {string} estado - 'PENDIENTE'|'EN_PRODUCCION'|'COMPLETADO'|'CANCELADO'
   */
  async updateOrderStatus(id, estado) {
    const response = await apiClient.patch(`/orders/${id}/status`, { estado });
    return response.data;
  },

  /**
   * Obtiene la previsualización de consumo BOM y balance de stock para un pedido (HU11).
   * @param {number|string} id
   */
  async getRecipePreview(id) {
    const response = await apiClient.get(`/orders/${id}/recipe-preview`);
    return response.data;
  },
};

export default ordersApi;

