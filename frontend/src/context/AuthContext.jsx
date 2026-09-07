/**
 * context/AuthContext.jsx — Contexto global de autenticación para CASETECH ERP.
 *
 * Administra:
 * - user: { id, email, nombre_completo, rol_id, rol, activo }
 * - token: string JWT (vive solo en memoria — ver api/tokenStore.js, Issue #76)
 * - isAuthenticated: boolean
 * - loading: boolean (durante el intento de renovación inicial de sesión)
 * - login(email, password): autenticación OAuth2 y carga de perfil
 * - logout(): revoca la sesión en el servidor y limpia el estado local
 *
 * La sesión sobrevive a un F5 gracias al refresh token en cookie httpOnly
 * (Issue #86): al montar, se intenta POST /auth/refresh en silencio antes
 * de mostrar el login.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { authEvents } from '../api/client';
import { setToken as setStoredToken, clearToken } from '../api/tokenStore';

const AuthContext = createContext(null);

/**
 * Decodifica de forma segura el payload de un JWT en base64 sin librerías externas.
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    // Revocar la sesión en el servidor; si falla (ya expirada, sin red),
    // igual se limpia el estado local — no debe bloquear el logout.
    apiClient.post('/auth/logout').catch(() => {});
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  // Al montar la app, intentar renovar la sesión en silencio usando la
  // cookie httpOnly de refresh (Issue #86) — así sobrevive a un F5 aunque
  // el access token solo viva en memoria (Issue #76).
  useEffect(() => {
    async function restoreSession() {
      try {
        const refreshResponse = await apiClient.post('/auth/refresh');
        const newToken = refreshResponse.data.access_token;
        setStoredToken(newToken);

        const meResponse = await apiClient.get('/auth/me');
        const jwtPayload = parseJwt(newToken);
        const roleName = jwtPayload?.rol || (meResponse.data.rol_id === 1 ? 'ADMINISTRADOR' : 'OPERARIO');

        setUser({ ...meResponse.data, rol: roleName });
        setToken(newToken);
      } catch (error) {
        // Normal cuando no hay sesión previa (primera visita, o cookie expirada)
        console.warn('No hay sesión previa que renovar:', error.message);
        clearToken();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Escuchar expiración forzada por el interceptor 401
    const handleExpired = () => logout();
    authEvents.addEventListener('session-expired', handleExpired);

    return () => {
      authEvents.removeEventListener('session-expired', handleExpired);
    };
  }, [logout]);

  /**
   * Inicia sesión enviando credenciales compatibles con OAuth2PasswordRequestForm
   */
  const login = async (email, password) => {
    // Formato x-www-form-urlencoded requerido por el backend FastAPI OAuth2
    const params = new URLSearchParams();
    params.append('username', email.trim());
    params.append('password', password);

    const loginResponse = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = loginResponse.data.access_token;
    setStoredToken(accessToken);
    setToken(accessToken);

    // Obtener perfil del usuario autenticado inmediatamente
    const meResponse = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const jwtPayload = parseJwt(accessToken);
    const roleName = jwtPayload?.rol || (meResponse.data.rol_id === 1 ? 'ADMINISTRADOR' : 'OPERARIO');

    const userData = {
      ...meResponse.data,
      rol: roleName,
    };

    setUser(userData);
    return userData;
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.rol === 'ADMINISTRADOR' || user?.rol_id === 1,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}

export default AuthContext;
