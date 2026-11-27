import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdjustmentsPage from '../pages/AdjustmentsPage';
import adjustmentsApi from '../api/adjustmentsApi';
import { renderWithProviders, usuarioAdmin, usuarioOperario } from './renderWithProviders';

// Reemplaza las llamadas al backend de la página de Ajustes de Inventario.
vi.mock('../api/adjustmentsApi', () => ({
  default: {
    getAdjustments: vi.fn(),
    getAdjustmentById: vi.fn(),
    createAdjustment: vi.fn(),
    reviewAdjustment: vi.fn(),
  },
}));

// Una solicitud con la forma EXACTA de StockAdjustmentResponse del backend.
const ajustePendiente = {
  id: 7,
  material_id: 1,
  tipo: 'MERMA',
  cantidad: '2.000',
  motivo: 'Lona rota durante el traslado a planta',
  stock_antes: '10.000',
  stock_despues: null,
  estado: 'PENDIENTE',
  solicitante_id: 2,
  revisor_id: null,
  solicitante_nombre: 'Operario Prueba',
  material_nombre: 'Lona Impermeable 600D',
  revisor_nombre: null,
  created_at: '2026-11-20T10:00:00',
  updated_at: null,
};

function abrirPagina(usuario) {
  return renderWithProviders(<AdjustmentsPage />, {
    route: '/adjustments',
    auth: {
      user: usuario,
      isAuthenticated: true,
      isAdmin: usuario.rol === 'ADMINISTRADOR',
    },
  });
}

describe('AdjustmentsPage (ajustes con doble firma)', () => {
  it('muestra la solicitud con el material, quién la pidió y el motivo', async () => {
    // Arrange
    adjustmentsApi.getAdjustments.mockResolvedValue({ items: [ajustePendiente], total: 1 });

    // Act
    abrirPagina(usuarioAdmin);

    // Assert
    expect(await screen.findByText('Lona Impermeable 600D')).toBeInTheDocument();
    expect(screen.getByText(/Operario Prueba/)).toBeInTheDocument();
    expect(screen.getByText('Lona rota durante el traslado a planta')).toBeInTheDocument();
  });

  it('el ADMINISTRADOR ve el botón para revisar una solicitud pendiente', async () => {
    // Arrange
    adjustmentsApi.getAdjustments.mockResolvedValue({ items: [ajustePendiente], total: 1 });

    // Act
    abrirPagina(usuarioAdmin);
    await screen.findByText('Lona Impermeable 600D');

    // Assert
    expect(screen.getByRole('button', { name: /revisar/i })).toBeInTheDocument();
  });

  it('el OPERARIO no ve el botón de revisar (la doble firma es del administrador)', async () => {
    // Arrange
    adjustmentsApi.getAdjustments.mockResolvedValue({ items: [ajustePendiente], total: 1 });

    // Act
    abrirPagina(usuarioOperario);
    await screen.findByText('Lona Impermeable 600D');

    // Assert: queryBy porque esperamos que NO exista
    expect(screen.queryByRole('button', { name: /revisar/i })).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay solicitudes', async () => {
    // Arrange
    adjustmentsApi.getAdjustments.mockResolvedValue({ items: [], total: 0 });

    // Act
    abrirPagina(usuarioAdmin);

    // Assert
    expect(
      await screen.findByText(/no se encontraron solicitudes de ajuste/i),
    ).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no se pueden cargar las solicitudes', async () => {
    // Arrange
    adjustmentsApi.getAdjustments.mockRejectedValue({
      response: { data: { detail: 'Servicio de inventario no disponible.' } },
    });

    // Act
    abrirPagina(usuarioAdmin);

    // Assert
    expect(await screen.findByText('Servicio de inventario no disponible.')).toBeInTheDocument();
  });
});
