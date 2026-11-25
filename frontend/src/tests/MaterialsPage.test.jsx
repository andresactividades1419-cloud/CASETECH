import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MaterialsPage from '../pages/MaterialsPage';
import materialsApi from '../api/materialsApi';
import { renderWithProviders, usuarioAdmin } from './renderWithProviders';

// Reemplaza las llamadas al backend de la página de Inventario.
vi.mock('../api/materialsApi', () => ({
  default: {
    getMaterials: vi.fn(),
    toggleMaterialStatus: vi.fn(),
    exportMaterialsCSV: vi.fn(),
  },
}));

const cemento = {
  id: 3,
  nombre: 'Cemento gris',
  unidad_medida: 'kg',
  stock_actual: '500',
  stock_minimo: '100',
  activo: true,
};

function abrirPagina() {
  return renderWithProviders(<MaterialsPage />, {
    route: '/materials',
    auth: { user: usuarioAdmin, isAuthenticated: true, isAdmin: true },
  });
}

describe('MaterialsPage (control de inventario)', () => {
  it('muestra los materiales que llegan del backend', async () => {
    // Arrange
    materialsApi.getMaterials.mockResolvedValue({ items: [cemento], total: 1 });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument();
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay materiales', async () => {
    // Arrange
    materialsApi.getMaterials.mockResolvedValue({ items: [], total: 0 });

    // Act
    abrirPagina();

    // Assert
    expect(
      await screen.findByText(/no se encontraron materiales con los filtros aplicados/i),
    ).toBeInTheDocument();
  });

  it('muestra un error si el backend no responde', async () => {
    // Arrange
    materialsApi.getMaterials.mockRejectedValue(new Error('Network Error'));

    // Act
    abrirPagina();

    // Assert
    expect(
      await screen.findByText(/no se pudieron recuperar los insumos de inventario/i),
    ).toBeInTheDocument();
  });
});

