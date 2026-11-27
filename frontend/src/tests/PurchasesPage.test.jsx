import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasesPage from '../pages/PurchasesPage';
import providersApi from '../api/providersApi';
import purchasesApi from '../api/purchasesApi';
import { renderWithProviders, usuarioAdmin } from './renderWithProviders';

// Reemplaza las llamadas al backend de la página de Abastecimiento.
vi.mock('../api/purchasesApi', () => ({
  default: { getPurchases: vi.fn(), getPurchaseById: vi.fn(), createPurchase: vi.fn() },
}));
vi.mock('../api/providersApi', () => ({
  default: { getProviders: vi.fn() },
}));

// Una compra con la forma EXACTA de PurchaseResponse del backend.
const compra = {
  id: 1,
  codigo_compra: 'COMP-2026-00001',
  proveedor_id: 4,
  proveedor_nombre: 'Aceros del Valle S.A.S.',
  fecha_compra: '2026-11-20',
  total: '60000.00',
  registrado_por: 1,
  registrado_por_nombre: 'Admin Prueba',
  observaciones: null,
  items: [
    {
      id: 1,
      compra_id: 1,
      material_id: 1,
      material_nombre: 'Lona Impermeable 600D',
      unidad_medida: 'm2',
      cantidad: '5.000',
      precio_unitario: '12000.00',
      subtotal: '60000.00',
    },
  ],
  created_at: '2026-11-20T10:00:00',
};

function abrirPagina() {
  return renderWithProviders(<PurchasesPage />, {
    route: '/purchases',
    auth: { user: usuarioAdmin, isAuthenticated: true, isAdmin: true },
  });
}

describe('PurchasesPage (abastecimiento)', () => {
  beforeEach(() => {
    providersApi.getProviders.mockResolvedValue({ items: [], total: 0 });
  });

  it('muestra las compras con el proveedor y quién las registró', async () => {
    // Arrange
    purchasesApi.getPurchases.mockResolvedValue({ items: [compra], total: 1 });

    // Act
    abrirPagina();

    // Assert: el nombre de quien registró viene de registrado_por_nombre
    expect(await screen.findByText('COMP-2026-00001')).toBeInTheDocument();
    expect(screen.getByText('Aceros del Valle S.A.S.')).toBeInTheDocument();
    expect(screen.getByText(/Admin Prueba/)).toBeInTheDocument();
    expect(screen.queryByText(/Usuario #undefined/)).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay compras', async () => {
    // Arrange
    purchasesApi.getPurchases.mockResolvedValue({ items: [], total: 0 });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText(/no se encontraron compras registradas/i)).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no se pueden cargar las compras', async () => {
    // Arrange
    purchasesApi.getPurchases.mockRejectedValue({
      response: { data: { detail: 'Servicio de compras no disponible.' } },
    });

    // Act
    abrirPagina();

    // Assert
    expect(await screen.findByText('Servicio de compras no disponible.')).toBeInTheDocument();
  });
});
