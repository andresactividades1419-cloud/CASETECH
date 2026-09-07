/**
 * api/recipesApi.js — Servicio API para la administración de Recetas BOM (Issue #88).
 *
 * Conecta con los endpoints de FastAPI bajo /api/v1/recipes.
 */

import apiClient from './client';

export const recipesApi = {
  /**
   * Obtiene las recetas configuradas, opcionalmente filtradas por tipo de casetón.
   * @param {Object} params - { tipo_caseton_id }
   */
  async getRecipes(params = {}) {
    const queryParams = {};
    if (params.tipo_caseton_id) queryParams.tipo_caseton_id = params.tipo_caseton_id;

    const response = await apiClient.get('/recipes', { params: queryParams });
    return response.data;
  },

  /**
   * Agrega un material a la receta de un tipo de casetón.
   * @param {Object} data - { tipo_caseton_id, material_id, cantidad_por_unidad }
   */
  async createRecipe(data) {
    const response = await apiClient.post('/recipes', {
      tipo_caseton_id: Number(data.tipo_caseton_id),
      material_id: Number(data.material_id),
      cantidad_por_unidad: Number(data.cantidad_por_unidad),
    });
    return response.data;
  },

  /**
   * Actualiza la cantidad por unidad de una receta existente.
   * @param {number|string} id
   * @param {number} cantidadPorUnidad
   */
  async updateRecipe(id, cantidadPorUnidad) {
    const response = await apiClient.put(`/recipes/${id}`, {
      cantidad_por_unidad: Number(cantidadPorUnidad),
    });
    return response.data;
  },

  /**
   * Elimina un material de la receta de un tipo de casetón.
   * @param {number|string} id
   */
  async deleteRecipe(id) {
    await apiClient.delete(`/recipes/${id}`);
    return true;
  },
};

export default recipesApi;
