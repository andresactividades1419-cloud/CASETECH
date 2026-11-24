import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProvidersPage from '../pages/ProvidersPage';
import providersApi from '../api/providersApi';
import { renderWithProviders, usuarioAdmin, usuarioOperario } from './renderWithProviders';

// Reemplaza las llamadas al backend de la página de Proveedores.
vi.mock('../api/providersApi', () => ({
  default: {
    getProviders: vi.fn(),
    toggleProviderStatus: vi.fn(),
    exportProvidersCSV: vi.fn(),
  },
}));

const proveedor = {
  id: 4,
  nit: '900123456-7',
  nombre_empresa: 'Aceros del Valle S.A.S.',
  contacto_nombre: 'Laura Gómez',
  contacto_telefono: '3001234567',
  direccion: 'Cali',
  activo: true,
};

function abrirPagina(usuario = usuarioAdmin) {
  return renderWithProviders(<ProvidersPage />, {
    route: '/providers',
    auth: {
      user: usuario,
      isAuthenticated: true,
      isAdmin: usuario.rol === 'ADMINISTRADOR',
    },
  });
}

describe('ProvidersPage (directorio de proveedores)', () => {
  afterEach(() => {
    vi.restoreAllMocks(); // devuelve window.confirm a su versión original
  });

  it('muestra los proveedores que llegan del backend', async () => {
    // Arrange
    providersApi.getProviders.mockResolvedValue({ items: [proveedor], total: 1 });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText('Aceros del Valle S.A.S.')).toBeInTheDocument();
    expect(screen.getByText('900123456-7')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay proveedores', async () => {
    // Arrange
    providersApi.getProviders.mockResolvedValue({ items: [], total: 0 });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText(/no se encontraron proveedores/i)).toBeInTheDocument();
  });

  it('muestra un error si el backend no responde', async () => {
    // Arrange
    providersApi.getProviders.mockRejectedValue(new Error('Network Error'));

    // Act
    abrirPagina();

    // Assert
    expect(
      await screen.findByText(/no se pudieron recuperar los proveedores/i),
    ).toBeInTheDocument();
  });

  it('el administrador desactiva un proveedor después de confirmar', async () => {
    // Arrange: la persona acepta la ventana de confirmación
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    providersApi.getProviders.mockResolvedValue({ items: [proveedor], total: 1 });
    providersApi.toggleProviderStatus.mockResolvedValue({ ...proveedor, activo: false });
    const { user } = abrirPagina();
    await screen.findByText('Aceros del Valle S.A.S.');

    // Act
    await user.click(screen.getByRole('button', { name: /desactivar/i }));

    // Assert
    expect(window.confirm).toHaveBeenCalled();
    expect(providersApi.toggleProviderStatus).toHaveBeenCalledWith(4);
  });

  it('el operario no ve el botón de desactivar', async () => {
    // Arrange
    providersApi.getProviders.mockResolvedValue({ items: [proveedor], total: 1 });

    // Act
    abrirPagina(usuarioOperario);
    await screen.findByText('Aceros del Valle S.A.S.');

    // Assert
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument();
  });
});
