import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../routes/ProtectedRoute';
import { renderWithProviders, usuarioAdmin, usuarioOperario } from './renderWithProviders';

const sesionAdmin = { user: usuarioAdmin, isAuthenticated: true, isAdmin: true };
const sesionOperario = { user: usuarioOperario, isAuthenticated: true, isAdmin: false };

// Mini versión de AppRoutes.jsx: las mismas guardas y el mismo layout, pero con
// páginas de mentira (solo un título) para no depender de ninguna API.
function abrirApp(ruta, auth) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Pantalla de login</h1>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<h1>Inicio</h1>} />
          <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
            <Route path="/users" element={<h1>Gestión de usuarios</h1>} />
          </Route>
        </Route>
      </Route>
    </Routes>,
    { route: ruta, auth },
  );
}

describe('ProtectedRoute (rutas protegidas por sesión y rol)', () => {
  it('manda al login a quien no ha iniciado sesión', () => {
    // Act: entra a la raíz sin sesión
    abrirApp('/', {});

    // Assert
    expect(screen.getByRole('heading', { name: /pantalla de login/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^inicio$/i })).not.toBeInTheDocument();
  });

  it('muestra un aviso mientras se verifica la sesión', () => {
    // Act: la sesión todavía se está restaurando (refresh token en curso)
    abrirApp('/', { loading: true });

    // Assert
    expect(screen.getByText(/verificando credenciales del sistema/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /pantalla de login/i })).not.toBeInTheDocument();
  });

  it('bloquea al OPERARIO en una sección solo para ADMINISTRADOR', () => {
    // Act
    abrirApp('/users', sesionOperario);

    // Assert: ve el aviso con su rol y no la página protegida
    expect(screen.getByRole('heading', { name: /acceso restringido/i })).toBeInTheDocument();
    // "OPERARIO" también sale en la barra superior: se busca dentro del aviso.
    expect(screen.getByText(/su rol actual/i)).toHaveTextContent('OPERARIO');
    expect(
      screen.queryByRole('heading', { name: /gestión de usuarios/i }),
    ).not.toBeInTheDocument();
  });

  it('deja entrar al ADMINISTRADOR a la sección de usuarios', () => {
    // Act
    abrirApp('/users', sesionAdmin);

    // Assert
    expect(screen.getByRole('heading', { name: /gestión de usuarios/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /acceso restringido/i }),
    ).not.toBeInTheDocument();
  });
});

describe('MainLayout (menú lateral según el rol)', () => {
  it('el ADMINISTRADOR ve los enlaces de Usuarios y Recetas BOM', () => {
    // Act
    abrirApp('/', sesionAdmin);

    // Assert
    expect(screen.getByRole('link', { name: /usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recetas bom/i })).toBeInTheDocument();
  });

  it('el OPERARIO no ve los enlaces de Usuarios ni Recetas BOM', () => {
    // Act
    abrirApp('/', sesionOperario);

    // Assert: queryBy porque esperamos que NO existan; los demás módulos sí
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /recetas bom/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument();
  });

  it('el botón Salir cierra la sesión y lleva al login', async () => {
    // Arrange
    const { user, auth } = abrirApp('/', sesionAdmin);

    // Act
    await user.click(screen.getByRole('button', { name: /salir/i }));

    // Assert
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('heading', { name: /pantalla de login/i }),
    ).toBeInTheDocument();
  });
});
