/**
 * context/AuthContext.jsx — Contexto global de autenticación para CASETECH ERP.
 *
 * Administra:
 * - user: { id, email, nombre_completo, rol_id, rol, activo }
 * - token: string JWT
 * - isAuthenticated: boolean
 * - loading: boolean (durante verificación inicial de token)
 * - login(email, password): autenticación OAuth2 y carga de perfil
 * - logout(): limpieza de sesión y estado
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { authEvents } from '../api/client';

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
  const [token, setToken] = useState(localStorage.getItem('casetech_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('casetech_token');
    setToken(null);
    setUser(null);
  }, []);

  // Verificar y restaurar sesión al iniciar la aplicación
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('casetech_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        const jwtPayload = parseJwt(storedToken);
        const roleName = jwtPayload?.rol || (response.data.rol_id === 1 ? 'ADMINISTRADOR' : 'OPERARIO');

        setUser({
          ...response.data,
          rol: roleName,
        });
        setToken(storedToken);
      } catch (error) {
        console.warn('Sesión previa inválida o expirada:', error.message);
        logout();
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
    localStorage.setItem('casetech_token', accessToken);
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
