import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../pages/DashboardPage';
import dashboardApi from '../api/dashboardApi';
import { renderWithProviders, usuarioAdmin, usuarioOperario } from './renderWithProviders';

// Reemplaza las llamadas al backend del Dashboard.
vi.mock('../api/dashboardApi', () => ({
  default: {
    getDashboardMetrics: vi.fn(),
    getStockMovements: vi.fn(),
    getAuditLogs: vi.fn(),
    exportStockMovementsCSV: vi.fn(),
    exportAuditLogsCSV: vi.fn(),
  },
}));

const metricas = {
  kpis: {
    total_pedidos: 42,
    pedidos_en_produccion: 5,
    compras_mes_cop: 1500000,
    materiales_alerta_stock: 2,
  },
  produccion_por_tipo: [{ tipo_caseton: 'Guadua', total_unidades: 300, total_pedidos: 4 }],
};

const movimientoKardex = {
  id: 1,
  created_at: '2026-11-20T10:00:00',
  tipo_movimiento: 'INGRESO_COMPRA',
  material_nombre: 'Malla electrosoldada',
  cantidad: '50',
  stock_antes: '100',
  stock_despues: '150',
  referencia_tipo: 'COMPRA',
  referencia_id: 3,
  usuario_nombre: 'Admin Prueba',
};

function abrirDashboard(usuario) {
  return renderWithProviders(<DashboardPage />, {
    route: '/',
    auth: {
      user: usuario,
      isAuthenticated: true,
      isAdmin: usuario.rol === 'ADMINISTRADOR',
    },
  });
}

describe('DashboardPage (panel general)', () => {
  beforeEach(() => {
    dashboardApi.getDashboardMetrics.mockResolvedValue(metricas);
    dashboardApi.getStockMovements.mockResolvedValue({ items: [movimientoKardex], total: 1 });
    dashboardApi.getAuditLogs.mockResolvedValue({ items: [], total: 0 });
  });

  it('muestra los indicadores que calcula el backend', async () => {
    // Act
    abrirDashboard(usuarioAdmin);

    // Assert: el total de pedidos y la producción por tipo de casetón
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('Guadua')).toBeInTheDocument();
  });

  it('muestra los movimientos del Kardex', async () => {
    // Act
    abrirDashboard(usuarioAdmin);

    // Assert
    expect(await screen.findByText('Malla electrosoldada')).toBeInTheDocument();
  });

  it('el administrador ve la pestaña de auditoría y el operario no', async () => {
    // Act: primero como ADMINISTRADOR
    const { unmount } = abrirDashboard(usuarioAdmin);

    // Assert
    expect(
      await screen.findByRole('button', { name: /bitácora de auditoría/i }),
    ).toBeInTheDocument();

    // Act: ahora como OPERARIO
    unmount();
    abrirDashboard(usuarioOperario);
    await screen.findByText('Malla electrosoldada');

    // Assert: queryBy porque esperamos que NO exista
    expect(
      screen.queryByRole('button', { name: /bitácora de auditoría/i }),
    ).not.toBeInTheDocument();
  });
});
