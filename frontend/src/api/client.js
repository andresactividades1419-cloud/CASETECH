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
// ¿Qué? Usa "??" (y no "||") para respetar un VITE_API_URL vacío.
// ¿Para qué? En producción VITE_API_URL se compila como "" y las llamadas van a la
// MISMA dirección del sitio (/api/v1/...), que Nginx reenvía al backend. Sin URLs fijas ni CORS.
// ¿Impacto? Si la variable no existe (undefined) sigue usando http://localhost:8000 como antes.
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
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
  // ¿Qué? Rechaza las respuestas HTML (por ejemplo, la página "502 Bad Gateway" de
  //   Nginx cuando el backend está caído). Las descargas de CSV (blob) no se tocan.
  // ¿Para qué? Antes el HTML llegaba como si fueran datos: la pantalla leía
  //   data.items === undefined y mostraba "no hay registros" en vez de un error
  //   (hallazgo bootcamp semana 5, descubierto con MSW).
  // ¿Impacto? Las pantallas muestran su aviso de error con un mensaje claro.
  (response) => {
    const tipo = String(response.headers?.['content-type'] || '');
    if (response.config?.responseType !== 'blob' && tipo.includes('text/html')) {
      const error = new Error('El servidor respondió una página HTML en lugar de datos. Intente de nuevo en unos minutos.');
      error.response = response;
      error.config = response.config;
      return Promise.reject(error);
    }
    return response;
  },
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
