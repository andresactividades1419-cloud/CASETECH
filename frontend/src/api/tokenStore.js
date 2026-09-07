/**
 * api/tokenStore.js — Almacén del access token en memoria (Issue #76).
 *
 * El access token NUNCA se guarda en localStorage/sessionStorage: vive solo
 * en esta variable de módulo, por lo que se pierde al recargar la página o
 * cerrar la pestaña. Eso es intencional (mitiga robo de token vía XSS). La
 * sesión sobrevive a un F5 gracias al refresh token en cookie httpOnly
 * (Issue #86) — ver AuthContext.jsx, que llama a /auth/refresh al montar.
 */

let accessToken = null;

export function getToken() {
  return accessToken;
}

export function setToken(token) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}
