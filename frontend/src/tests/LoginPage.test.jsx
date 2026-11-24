import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from '../pages/LoginPage';
import { renderWithProviders, usuarioAdmin } from './renderWithProviders';

// Dibuja el login dentro de unas rutas mínimas: /login y la página de inicio.
// Así el test puede comprobar a dónde navega la app después de iniciar sesión.
function abrirLogin(auth = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Panel de inicio</h1>} />
    </Routes>,
    { route: '/login', auth },
  );
}

describe('LoginPage', () => {
  it('deshabilita el botón mientras falte el correo o la contraseña', async () => {
    // Arrange
    const { user } = abrirLogin();
    const boton = screen.getByRole('button', { name: /iniciar sesión/i });

    // Assert: al inicio, con los campos vacíos, no se puede enviar
    expect(boton).toBeDisabled();

    // Act: solo el correo
    await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@casetech.com');

    // Assert: todavía falta la contraseña
    expect(boton).toBeDisabled();

    // Act: ahora la contraseña
    await user.type(screen.getByLabelText(/^contraseña$/i), 'Clave-Segura-123');

    // Assert: con los dos campos llenos, ya se puede enviar
    expect(boton).toBeEnabled();
  });

  it('inicia sesión con lo que escribió la persona y la lleva al inicio', async () => {
    // Arrange: el login responde bien
    const login = vi.fn().mockResolvedValue(usuarioAdmin);
    const { user } = abrirLogin({ login });

    // Act
    await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@casetech.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'Clave-Segura-123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Assert: se usó lo escrito y la app navegó a la página de inicio
    expect(login).toHaveBeenCalledWith('admin@casetech.com', 'Clave-Segura-123');
    expect(
      await screen.findByRole('heading', { name: /panel de inicio/i }),
    ).toBeInTheDocument();
  });

  it('muestra "Credenciales inválidas" si el backend responde 401', async () => {
    // Arrange: el backend rechaza la contraseña
    const login = vi.fn().mockRejectedValue({ response: { status: 401 } });
    const { user } = abrirLogin({ login });

    // Act
    await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@casetech.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'ClaveIncorrecta');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Assert: aparece el error y la persona sigue en el login
    expect(await screen.findByRole('alert')).toHaveTextContent(/credenciales inválidas/i);
    expect(screen.queryByRole('heading', { name: /panel de inicio/i })).not.toBeInTheDocument();
  });

  it('avisa que no hay conexión si el backend no responde', async () => {
    // Arrange: error de red (sin respuesta del servidor)
    const login = vi.fn().mockRejectedValue(new Error('Network Error'));
    const { user } = abrirLogin({ login });

    // Act
    await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@casetech.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'Clave-Segura-123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo conectar con el servidor/i,
    );
  });

  it('manda al inicio a quien ya tiene la sesión abierta', () => {
    // Arrange / Act: la persona ya inició sesión antes
    abrirLogin({ user: usuarioAdmin, isAuthenticated: true, isAdmin: true });

    // Assert: no ve el formulario, ve la página de inicio
    expect(screen.getByRole('heading', { name: /panel de inicio/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/correo electrónico/i)).not.toBeInTheDocument();
  });
});
