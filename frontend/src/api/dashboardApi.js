/**
 * api/dashboardApi.js — Servicio API para el Dashboard General, Trazabilidad de Kardex y Auditoría (HU14, HU15).
 *
 * Conecta con los endpoints de FastAPI bajo /api/v1/dashboard.
 */

import apiClient from './client';

export const dashboardApi = {
  /**
   * Obtiene los KPIs consolidados y el desglose de producción BOM.
   */
  async getDashboardMetrics() {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data;
  },

  /**
   * Obtiene la lista paginada de movimientos de inventario (Kardex).
   * @param {Object} params - { page, limit, tipo_movimiento, material_id, fecha_desde, fecha_hasta }
   */
  async getStockMovements(params = {}) {
    const queryParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
    };

    if (params.tipo_movimiento && params.tipo_movimiento !== 'TODOS') {
      queryParams.tipo_movimiento = params.tipo_movimiento;
    }
    if (params.material_id) {
      queryParams.material_id = Number(params.material_id);
    }
    if (params.fecha_desde) {
      queryParams.fecha_desde = params.fecha_desde;
    }
    if (params.fecha_hasta) {
      queryParams.fecha_hasta = params.fecha_hasta;
    }

    const response = await apiClient.get('/dashboard/movements', { params: queryParams });
    return response.data;
  },

  /**
   * Obtiene la lista paginada de logs de auditoría administrativa.
   * @param {Object} params - { page, limit, entidad, usuario_id }
   */
  async getAuditLogs(params = {}) {
    const queryParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
    };

    if (params.entidad && params.entidad !== 'TODAS') {
      queryParams.entidad = params.entidad;
    }
    if (params.usuario_id) {
      queryParams.usuario_id = Number(params.usuario_id);
    }

    const response = await apiClient.get('/dashboard/audit-logs', { params: queryParams });
    return response.data;
  },
};

export default dashboardApi;
