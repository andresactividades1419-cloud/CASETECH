/**
 * tests/renderWithProviders.jsx — Dibuja un componente con rutas y sesión de usuario.
 *
 * ¿Qué? Envuelve el componente en un MemoryRouter (rutas en memoria) y en el
 *       AuthContext con un usuario de mentira.
 * ¿Para qué? Los componentes de CASETECH usan useNavigate/useLocation y useAuth;
 *       sin estos proveedores, render() falla. Se comparte para no repetirlo en cada test.
 * ¿Impacto? Cada test elige en qué ruta empieza y qué usuario (o ninguno) tiene sesión.
 *
 * Uso:
 *   const { user } = renderWithProviders(<MiComponente />, {
 *     route: '/orders',
 *     auth: { user: usuarioAdmin, isAuthenticated: true, isAdmin: true },
 *   });
 *   await user.click(screen.getByRole('button', { name: /guardar/i }));
 */
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AuthContext from '../context/AuthContext';

// Usuarios de ejemplo para los tests (no son cuentas reales).
export const usuarioAdmin = {
  id: 1,
  nombre: 'Admin Prueba',
  email: 'admin@casetech.com',
  rol_id: 1,
  rol: 'ADMINISTRADOR',
};

export const usuarioOperario = {
  id: 2,
  nombre: 'Operario Prueba',
  email: 'operario@casetech.com',
  rol_id: 2,
  rol: 'OPERARIO',
};

export function renderWithProviders(ui, { route = '/', auth = {} } = {}) {
  // Sesión por defecto: nadie ha iniciado sesión. Cada test cambia solo lo que necesita.
  const authValue = {
    user: null,
    token: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...auth,
  };

  const result = render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );

  // user-event simula a una persona: escribe tecla por tecla y hace clic.
  return { user: userEvent.setup(), auth: authValue, ...result };
}
