import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrdersPage from '../pages/OrdersPage';
import ordersApi from '../api/ordersApi';
import { renderWithProviders, usuarioAdmin } from './renderWithProviders';

// Reemplaza las llamadas al backend de la página de Pedidos.
vi.mock('../api/ordersApi', () => ({
  default: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
    exportOrdersCSV: vi.fn(),
  },
}));

const pedidoEnProduccion = {
  id: 7,
  codigo_pedido: 'PED-2026-00007',
  cliente: 'Constructora Andina',
  tipo_caseton_id: 1,
  tipo_caseton_nombre: 'Lona',
  cantidad: 120,
  fecha_entrega_estimada: '2099-12-31',
  estado: 'EN_PRODUCCION',
};

function abrirPagina() {
  return renderWithProviders(<OrdersPage />, {
    route: '/orders',
    auth: { user: usuarioAdmin, isAuthenticated: true, isAdmin: true },
  });
}

describe('OrdersPage (listado de pedidos)', () => {
  it('muestra los pedidos que llegan del backend', async () => {
    // Arrange
    ordersApi.getOrders.mockResolvedValue({ items: [pedidoEnProduccion], total: 1 });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText('PED-2026-00007')).toBeInTheDocument();
    expect(screen.getByText('Constructora Andina')).toBeInTheDocument();
    expect(screen.queryByText(/no se encontraron pedidos/i)).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay pedidos', async () => {
    // Arrange
    ordersApi.getOrders.mockResolvedValue({ items: [], total: 0 });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText(/no se encontraron pedidos/i)).toBeInTheDocument();
  });

  it('marca un pedido en producción como completado', async () => {
    // Arrange
    ordersApi.getOrders.mockResolvedValue({ items: [pedidoEnProduccion], total: 1 });
    ordersApi.updateOrderStatus.mockResolvedValue({});
    const { user } = abrirPagina();
    await screen.findByText('PED-2026-00007');

    // Act
    await user.click(screen.getByRole('button', { name: /completar/i }));

    // Assert: se pidió el cambio correcto y la persona ve la confirmación
    expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(7, 'COMPLETADO');
    expect(
      await screen.findByText(/pedido PED-2026-00007 marcada como completada/i),
    ).toBeInTheDocument();
  });
});

