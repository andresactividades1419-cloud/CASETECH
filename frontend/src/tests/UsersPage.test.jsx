/**
 * tests/UsersPage.test.jsx — Página de gestión de cuentas de usuario (HU02, HU14).
 *
 * ¿Qué? Prueba la lista de usuarios, los contadores, la búsqueda y el filtro por rol,
 *       el registro y la edición (con y sin contraseña nueva), y activar/desactivar,
 *       incluida la regla "el administrador no puede desactivar su propia cuenta".
 * ¿Para qué? Es la pantalla que controla quién entra al sistema: un error aquí deja
 *       a alguien sin acceso o con un rol que no le corresponde.
 * ¿Impacto? El backend se reemplaza con vi.mock (no hace falta Docker); si cambia
 *       lo que la página envía o muestra, estos tests fallan.
 */
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsersPage from '../pages/UsersPage';
import usersApi from '../api/usersApi';
import { renderWithProviders, usuarioAdmin } from './renderWithProviders';

// Reemplaza las llamadas al backend de la página de Usuarios.
vi.mock('../api/usersApi', () => ({
  default: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    toggleUserStatus: vi.fn(),
  },
}));

// El id 1 es el mismo de usuarioAdmin: es la cuenta "en sesión".
const usuarios = [
  {
    id: 1,
    nombre_completo: 'Admin Prueba',
    email: 'admin@casetech.com',
    rol_id: 1,
    rol_nombre: 'ADMINISTRADOR',
    activo: true,
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 7,
    nombre_completo: 'Carlos Gómez',
    email: 'carlos@casetech.com',
    rol_id: 2,
    rol_nombre: 'OPERARIO',
    activo: true,
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 8,
    nombre_completo: 'Diana Torres',
    email: 'diana@casetech.com',
    rol_id: 2,
    rol_nombre: 'OPERARIO',
    activo: false,
    created_at: '2026-11-03T10:00:00Z',
  },
];

function abrirPagina() {
  usersApi.getUsers.mockResolvedValue({ items: usuarios, total: usuarios.length });
  return renderWithProviders(<UsersPage />, {
    route: '/users',
    auth: { user: usuarioAdmin, isAuthenticated: true, isAdmin: true },
  });
}

// Botones de la fila de un usuario (se ubica la fila por su correo).
function filaDe(email) {
  return within(screen.getByText(email).parentElement);
}

// Valor de una tarjeta de contadores (se ubica por su título). selector 'div':
// "Administradores" y "Operarios" también son botones del filtro por rol.
function contador(titulo) {
  return screen.getByText(titulo, { selector: 'div' }).nextElementSibling;
}

describe('UsersPage (gestión de cuentas)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks(); // devuelve window.alert a su versión original
  });

  it('muestra los usuarios y los contadores por rol y estado', async () => {
    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText('Carlos Gómez')).toBeInTheDocument();
    expect(contador('Total Cuentas')).toHaveTextContent('3');
    expect(contador('Administradores')).toHaveTextContent('1');
    expect(contador('Operarios')).toHaveTextContent('2');
    expect(contador('Cuentas Activas')).toHaveTextContent('2');
    expect(filaDe('diana@casetech.com').getByText(/inactivo/i)).toBeInTheDocument();
  });

  it('muestra el error del backend si no puede cargar la lista', async () => {
    // Arrange
    usersApi.getUsers.mockRejectedValue({
      response: { data: { detail: 'No tiene permisos para ver usuarios.' } },
    });

    // Act
    renderWithProviders(<UsersPage />, {
      auth: { user: usuarioAdmin, isAuthenticated: true, isAdmin: true },
    });

    // Assert
    expect(await screen.findByText(/no tiene permisos para ver usuarios/i)).toBeInTheDocument();
  });

  it('busca por nombre o por correo sin distinguir mayúsculas', async () => {
    // Arrange
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');
    const buscador = screen.getByPlaceholderText(/buscar por nombre o correo/i);

    // Act + Assert: por nombre
    await user.type(buscador, 'CARLOS');
    expect(screen.getByText('Carlos Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Diana Torres')).not.toBeInTheDocument();

    // Act + Assert: por correo
    await user.clear(buscador);
    await user.type(buscador, 'diana@');
    expect(screen.getByText('Diana Torres')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Gómez')).not.toBeInTheDocument();
  });

  it('filtra por rol y avisa cuando ninguno coincide', async () => {
    // Arrange
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act + Assert: solo administradores
    await user.click(screen.getByRole('button', { name: 'Administradores' }));
    expect(screen.getByText('admin@casetech.com')).toBeInTheDocument();
    expect(screen.queryByText('carlos@casetech.com')).not.toBeInTheDocument();

    // Act + Assert: solo operarios
    await user.click(screen.getByRole('button', { name: 'Operarios' }));
    expect(screen.getByText('carlos@casetech.com')).toBeInTheDocument();
    expect(screen.queryByText('admin@casetech.com')).not.toBeInTheDocument();

    // Act + Assert: operario + búsqueda que no coincide
    await user.type(screen.getByPlaceholderText(/buscar/i), 'admin');
    expect(screen.getByText(/no se encontraron usuarios/i)).toBeInTheDocument();
  });

  it('registra un usuario nuevo, muestra el aviso y recarga la lista', async () => {
    // Arrange
    usersApi.createUser.mockResolvedValue({ id: 9 });
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act
    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Ruiz');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'ana@casetech.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Segura123');
    await user.click(screen.getByRole('button', { name: /registrar usuario/i }));

    // Assert: lo que se envía al backend (rol como número)
    expect(usersApi.createUser).toHaveBeenCalledWith({
      nombre_completo: 'Ana Ruiz',
      email: 'ana@casetech.com',
      password: 'Segura123',
      rol_id: 2,
      activo: true,
    });
    expect(await screen.findByText(/ana@casetech.com registrado exitosamente/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(usersApi.getUsers).toHaveBeenCalledTimes(2); // carga inicial + recarga
  });

  it('si el backend rechaza el registro, muestra el error dentro del formulario', async () => {
    // Arrange
    usersApi.createUser.mockRejectedValue({
      response: { data: { detail: 'El correo ya está registrado.' } },
    });
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act
    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(screen.getByLabelText(/nombre completo/i), 'Carlos Duplicado');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'carlos@casetech.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Segura123');
    await user.click(screen.getByRole('button', { name: /registrar usuario/i }));

    // Assert: el modal sigue abierto con el mensaje
    const dialogo = screen.getByRole('dialog');
    expect(await within(dialogo).findByText(/el correo ya está registrado/i)).toBeInTheDocument();
  });

  it('edita un usuario SIN enviar contraseña cuando se deja en blanco', async () => {
    // Arrange
    usersApi.updateUser.mockResolvedValue({});
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act: cambia el rol a ADMINISTRADOR y guarda
    await user.click(filaDe('carlos@casetech.com').getByRole('button', { name: /editar/i }));
    await user.selectOptions(screen.getByLabelText(/rol del usuario/i), '1');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    // Assert: el payload no trae "password" (se conserva la actual)
    expect(usersApi.updateUser).toHaveBeenCalledWith(7, {
      nombre_completo: 'Carlos Gómez',
      email: 'carlos@casetech.com',
      rol_id: 1,
      activo: true,
    });
    expect(await screen.findByText(/carlos@casetech.com actualizado correctamente/i)).toBeInTheDocument();
  });

  it('edita un usuario y envía la contraseña nueva cuando se escribe una', async () => {
    // Arrange
    usersApi.updateUser.mockResolvedValue({});
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act
    await user.click(filaDe('carlos@casetech.com').getByRole('button', { name: /editar/i }));
    await user.type(screen.getByLabelText(/nueva contraseña/i), 'Nueva1234');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    // Assert
    expect(usersApi.updateUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ password: 'Nueva1234' }),
    );
  });

  it('desactiva la cuenta de otro usuario y muestra el mensaje del backend', async () => {
    // Arrange
    usersApi.toggleUserStatus.mockResolvedValue({ message: 'Usuario desactivado.' });
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act
    await user.click(filaDe('carlos@casetech.com').getByRole('button', { name: /desactivar/i }));

    // Assert
    expect(usersApi.toggleUserStatus).toHaveBeenCalledWith(7);
    expect(await screen.findByText(/usuario desactivado/i)).toBeInTheDocument();

    // Y el aviso se puede cerrar con ×
    await user.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByText(/usuario desactivado/i)).not.toBeInTheDocument();
  });

  it('no deja que el administrador desactive su propia cuenta en sesión', async () => {
    // Arrange: window.alert no existe en jsdom; se reemplaza para ver el mensaje
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { user } = abrirPagina();
    await screen.findByText('Carlos Gómez');

    // Act: el usuario 1 es el mismo que tiene la sesión (usuarioAdmin)
    await user.click(filaDe('admin@casetech.com').getByRole('button', { name: /desactivar/i }));

    // Assert: avisa y NO llama al backend
    expect(alerta).toHaveBeenCalledWith(
      'No puede desactivar su propia cuenta de Administrador en sesión.',
    );
    expect(usersApi.toggleUserStatus).not.toHaveBeenCalled();
  });

  it('muestra el error del backend si no puede cambiar el estado', async () => {
    // Arrange
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});
    usersApi.toggleUserStatus.mockRejectedValue({
      response: { data: { detail: 'Usuario no encontrado.' } },
    });
    const { user } = abrirPagina();
    await screen.findByText('Diana Torres');

    // Act: activar a Diana (está inactiva)
    await user.click(filaDe('diana@casetech.com').getByRole('button', { name: /activar/i }));

    // Assert
    expect(usersApi.toggleUserStatus).toHaveBeenCalledWith(8);
    await vi.waitFor(() => expect(alerta).toHaveBeenCalledWith('Usuario no encontrado.'));
  });
});
