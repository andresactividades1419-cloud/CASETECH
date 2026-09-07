/**
 * api/client.js — Cliente HTTP Axios configurado para CASETECH ERP.
 *
 * Características:
 * - Base URL dinámica desde VITE_API_URL o default a http://localhost:8000/api/v1.
 * - Inyección automática de token Bearer desde tokenStore (memoria, no localStorage — Issue #76).
 * - withCredentials: true para que la cookie httpOnly de refresh viaje con cada request (Issue #86).
 * - En un 401 (fuera de login/refresh), intenta una renovación silenciosa vía /auth/refresh
 *   antes de rendirse y avisar que la sesión expiró.
 */

import axios from 'axios';
import { getToken, setToken, clearToken } from './tokenStore';

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
  withCredentials: true,
});

// Event target para notificar cierre de sesión global
export const authEvents = new EventTarget();

// Interceptor de Solicitudes: inyecta Bearer token desde memoria (tokenStore)
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Promesa compartida para no disparar varios /auth/refresh en paralelo
// si varias requests reciben 401 al mismo tiempo.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setToken(res.data.access_token);
        return res.data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Interceptor de Respuestas: en 401 intenta renovar la sesión una vez;
// si falla también, recién ahí avisa que la sesión expiró.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        clearToken();
        authEvents.dispatchEvent(new CustomEvent('session-expired'));
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && isAuthEndpoint && !url.includes('/auth/login')) {
      clearToken();
      authEvents.dispatchEvent(new CustomEvent('session-expired'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
