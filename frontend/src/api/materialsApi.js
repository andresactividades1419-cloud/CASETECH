/**
 * api/materialsApi.js — Servicio API para el módulo de Materiales e Insumos (HU10 y HU12).
 */

import apiClient from './client';

export const materialsApi = {
  /**
   * Consulta lista paginada de materiales con filtros.
   * @param {Object} params - { nombre, activo, alerta_stock, skip, limit }
   */
  async getMaterials(params = {}) {
    const queryParams = {
      skip: params.skip || 0,
      limit: params.limit || 100,
    };

    if (params.nombre && String(params.nombre).trim()) {
      queryParams.nombre = String(params.nombre).trim();
    }
    if (params.activo !== undefined && params.activo !== null && params.activo !== 'all') {
      queryParams.activo = params.activo;
    }
    if (params.alerta_stock !== undefined && params.alerta_stock !== null) {
      queryParams.alerta_stock = params.alerta_stock;
    }

    const response = await apiClient.get('/materials', { params: queryParams });
    return response.data;
  },

  /**
   * Obtiene detalle de un material por ID.
   * @param {number|string} id 
   */
  async getMaterialById(id) {
    const response = await apiClient.get(`/materials/${id}`);
    return response.data;
  },

  /**
   * Crea un nuevo material en el inventario maestro (requiere ADMINISTRADOR).
   * @param {Object} data - { nombre, unidad_medida, stock_actual, stock_minimo }
   */
  async createMaterial(data) {
    const payload = {
      nombre: String(data.nombre || '').trim(),
      unidad_medida: String(data.unidad_medida || 'und').trim().toLowerCase(),
      stock_actual: Number(data.stock_actual) || 0,
      stock_minimo: Number(data.stock_minimo) || 0,
    };
    const response = await apiClient.post('/materials', payload);
    return response.data;
  },

  /**
   * Actualiza los datos de un material existente (requiere ADMINISTRADOR).
   * @param {number|string} id 
   * @param {Object} data 
   */
  async updateMaterial(id, data) {
    const payload = {};
    if (data.nombre !== undefined) payload.nombre = String(data.nombre).trim();
    if (data.unidad_medida !== undefined) payload.unidad_medida = String(data.unidad_medida).trim().toLowerCase();
    if (data.stock_minimo !== undefined) payload.stock_minimo = Number(data.stock_minimo);
    if (data.stock_actual !== undefined) payload.stock_actual = Number(data.stock_actual);

    const response = await apiClient.put(`/materials/${id}`, payload);
    return response.data;
  },

  /**
   * Alterna el estado activo/inactivo (borrado lógico) del material.
   * @param {number|string} id 
   */
  async toggleMaterialStatus(id) {
    const response = await apiClient.patch(`/materials/${id}/status`);
    return response.data;
  },
};

export default materialsApi;
