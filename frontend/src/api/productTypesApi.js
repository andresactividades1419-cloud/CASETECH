/**
 * api/productTypesApi.js — Servicio API para el catálogo de Tipos de Casetón.
 *
 * Conecta con el endpoint /api/v1/product-types para poblar
 * el selector dinámico en el formulario de creación de pedidos.
 */

import apiClient from './client';

export const productTypesApi = {
  /**
   * Obtiene todos los tipos de casetón activos (Lona, Guadua, Icopor, etc.).
   * @returns {Promise<{ total: number, items: Array }>}
   */
  async getProductTypes() {
    const response = await apiClient.get('/product-types');
    return response.data;
  },
};

export default productTypesApi;
