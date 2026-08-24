/**
 * api/providersApi.js — Servicio API para el módulo de Proveedores (HU02, HU03, HU05).
 *
 * Conecta con los endpoints de FastAPI bajo /api/v1/providers.
 */

import apiClient from './client';

/**
 * Normaliza el payload de proveedor para cumplir con los schemas de Pydantic/SQLAlchemy.
 */
const normalizeProviderPayload = (data) => {
  return {
    nit: data.nit ? String(data.nit).trim() : undefined,
    nombre_empresa: (data.nombre_empresa || data.razon_social || '').trim(),
    contacto_nombre: data.contacto_nombre ? String(data.contacto_nombre).trim() : null,
    contacto_telefono: data.contacto_telefono || data.telefono ? String(data.contacto_telefono || data.telefono).trim() : null,
    contacto_email: data.contacto_email || data.email ? String(data.contacto_email || data.email).trim() : null,
    direccion: data.direccion ? String(data.direccion).trim() : null,
  };
};

export const providersApi = {
  /**
   * Obtiene la lista paginada de proveedores con soporte de filtros.
   * @param {Object} params - { search, limit, skip, offset, include_inactive, activo, nit, razon_social }
   */
  async getProviders(params = {}) {
    const queryParams = {
      skip: params.skip !== undefined ? params.skip : (params.offset || 0),
      limit: params.limit || 50,
      include_inactive: params.include_inactive ?? (params.activo === false || params.activo === 'all'),
    };

    // Búsqueda libre o por campos específicos
    const searchTerm = params.search || params.razon_social || params.nit;
    if (searchTerm && String(searchTerm).trim()) {
      queryParams.search = String(searchTerm).trim();
    }

    const response = await apiClient.get('/providers', { params: queryParams });
    return response.data;
  },

  /**
   * Obtiene el detalle de un proveedor por su ID.
   * @param {number|string} id 
   */
  async getProviderById(id) {
    const response = await apiClient.get(`/providers/${id}`);
    return response.data;
  },

  /**
   * Registra un nuevo proveedor ejecutando sp_crear_proveedor (solo ADMINISTRADOR).
   * @param {Object} data - { nit, nombre_empresa|razon_social, contacto_nombre, telefono, email, direccion }
   */
  async createProvider(data) {
    const payload = normalizeProviderPayload(data);
    const response = await apiClient.post('/providers', payload);
    return response.data;
  },

  /**
   * Actualiza los datos editables de un proveedor existente (el NIT es inmutable).
   * @param {number|string} id 
   * @param {Object} data 
   */
  async updateProvider(id, data) {
    const payload = normalizeProviderPayload(data);
    // Eliminar nit del payload de actualización ya que es inmutable
    delete payload.nit;
    const response = await apiClient.put(`/providers/${id}`, payload);
    return response.data;
  },

  /**
   * Alterna el estado activo/inactivo (borrado lógico) del proveedor.
   * @param {number|string} id 
   */
  async toggleProviderStatus(id) {
    const response = await apiClient.patch(`/providers/${id}/status`);
    return response.data;
  },
};

export default providersApi;
