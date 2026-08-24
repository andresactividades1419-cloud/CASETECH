/**
 * api/client.js — Cliente HTTP Axios configurado para CASETECH ERP.
 *
 * Características:
 * - Base URL dinámica desde VITE_API_URL o default a http://localhost:8000/api/v1.
 * - Inyección automática de token Bearer en encabezado Authorization.
 * - Interceptor de respuestas para manejo centralizado de errores 401 (sesión expirada).
 */

import axios from 'axios';

// Determinar la Base URL asegurando sufijo /api/v1
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const baseURL = rawApiUrl.endsWith('/api/v1') 
  ? rawApiUrl 
  : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Event target para notificar cierre de sesión global
export const authEvents = new EventTarget();

// Interceptor de Solicitudes: inyecta Bearer token desde localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('casetech_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuestas: captura 401 y dispara evento de expiración
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthLogin = error.config?.url?.includes('/auth/login');
    
    if (error.response?.status === 401 && !isAuthLogin) {
      localStorage.removeItem('casetech_token');
      authEvents.dispatchEvent(new CustomEvent('session-expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
