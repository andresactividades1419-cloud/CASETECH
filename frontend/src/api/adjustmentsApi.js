/**
 * api/adjustmentsApi.js — Servicio API para el Módulo de Ajustes Manuales de Inventario y Auditoría (HU13).
 *
 * Conecta con los endpoints de FastAPI bajo /api/v1/stock-adjustments.
 */

import apiClient from './client';

export const adjustmentsApi = {
  /**
   * Obtiene la lista paginada de solicitudes y ajustes de inventario con filtros.
   * @param {Object} params - { page, limit, estado, tipo, material_id }
   */
  async getAdjustments(params = {}) {
    const queryParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };

    if (params.estado && params.estado !== 'TODOS') queryParams.estado = params.estado;
    if (params.tipo && params.tipo !== 'TODOS') queryParams.tipo = params.tipo;
    if (params.material_id) queryParams.material_id = Number(params.material_id);

    const response = await apiClient.get('/stock-adjustments/', { params: queryParams });
    return response.data;
  },

  /**
   * Obtiene el detalle completo de un ajuste de inventario por su ID.
   * @param {number|string} id
   */
  async getAdjustmentById(id) {
    const response = await apiClient.get(`/stock-adjustments/${id}`);
    return response.data;
  },

  /**
   * Registra una nueva solicitud de ajuste manual de inventario.
   * @param {Object} data - { material_id, tipo, cantidad, motivo }
   */
  async createAdjustment(data) {
    const payload = {
      material_id: Number(data.material_id),
      tipo: data.tipo,
      cantidad: parseFloat(data.cantidad),
      motivo: String(data.motivo).trim(),
    };
    const response = await apiClient.post('/stock-adjustments/', payload);
    return response.data;
  },

  /**
   * Revisa y aprueba o rechaza una solicitud de ajuste (Exclusivo ADMINISTRADOR).
   * @param {number|string} id
   * @param {Object} reviewData - { aprobado: boolean, observaciones?: string }
   */
  async reviewAdjustment(id, reviewData) {
    const payload = {
      aprobado: Boolean(reviewData.aprobado),
      observaciones: reviewData.observaciones?.trim() || null,
    };
    const response = await apiClient.post(`/stock-adjustments/${id}/review`, payload);
    return response.data;
  },
};

export default adjustmentsApi;
