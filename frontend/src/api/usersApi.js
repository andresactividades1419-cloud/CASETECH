/**
 * api/usersApi.js — Servicio API para la gestión de usuarios del sistema (HU02, HU14).
 *
 * Conecta con los endpoints bajo /api/v1/auth/users y /api/v1/auth/register.
 */

import apiClient from './client';

export const usersApi = {
  /**
   * Obtiene la lista completa de usuarios registrados.
   */
  async getUsers() {
    const response = await apiClient.get('/auth/users');
    return response.data;
  },

  /**
   * Registra una nueva cuenta de usuario (solo Administrador).
   * @param {Object} data - { email, nombre_completo, password, rol_id, activo }
   */
  async createUser(data) {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Actualiza los datos de un usuario existente.
   * @param {number|string} id
   * @param {Object} data - { nombre_completo?, email?, rol_id?, activo?, password? }
   */
  async updateUser(id, data) {
    const response = await apiClient.patch(`/auth/users/${id}`, data);
    return response.data;
  },

  /**
   * Desactiva lógicamente una cuenta de usuario.
   * @param {number|string} id
   */
  async deactivateUser(id) {
    const response = await apiClient.delete(`/auth/users/${id}`);
    return response.data;
  },
};

export default usersApi;
