/**
 * api/usersApi.js — Servicio API para la gestión integral de cuentas de usuario (HU02, HU14).
 *
 * Conecta con los endpoints bajo /api/v1/users.
 */

import apiClient from './client';

export const usersApi = {
  /**
   * Obtiene la lista paginada y filtrada de usuarios.
   * @param {Object} params - { skip, limit, search, rol_id }
   */
  async getUsers(params = {}) {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  /**
   * Obtiene el detalle de un usuario por su ID.
   * @param {number|string} id
   */
  async getUserById(id) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  /**
   * Registra una nueva cuenta de usuario (solo Administrador).
   * @param {Object} data - { email, nombre_completo, password, rol_id, activo }
   */
  async createUser(data) {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  /**
   * Actualiza los datos de un usuario existente.
   * @param {number|string} id
   * @param {Object} data - { nombre_completo?, email?, rol_id?, activo?, password? }
   */
  async updateUser(id, data) {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Activa o desactiva lógicamente una cuenta de usuario (toggle).
   * @param {number|string} id
   */
  async toggleUserStatus(id) {
    const response = await apiClient.patch(`/users/${id}/status`);
    return response.data;
  },
};

export default usersApi;

