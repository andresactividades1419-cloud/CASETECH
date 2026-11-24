import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderModal } from '../components/orders/OrderModal';
import ordersApi from '../api/ordersApi';
import productTypesApi from '../api/productTypesApi';
import { renderWithProviders } from './renderWithProviders';

// Reemplaza los módulos que llaman al backend: el test no necesita servidor.
vi.mock('../api/productTypesApi', () => ({
  default: { getProductTypes: vi.fn() },
}));
vi.mock('../api/ordersApi', () => ({
  default: { createOrder: vi.fn() },
}));

const tiposDeCaseton = {
  items: [
    { id: 1, nombre: 'Lona' },
    { id: 2, nombre: 'Guadua' },
  ],
};

// Abre el modal como lo hace la página de Pedidos.
function abrirModal() {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const resultado = renderWithProviders(
    <OrderModal isOpen onClose={onClose} onSuccess={onSuccess} />,
  );
  return { ...resultado, onClose, onSuccess };
}

// Llena el formulario con un pedido válido. La fecha es lejana para que el
// test no dependa del día en que se corra (FIRST: Repeatable).
async function llenarPedidoValido(user) {
  await user.type(screen.getByLabelText(/cliente/i), 'Constructora Andina');
  await user.selectOptions(screen.getByLabelText(/tipo de casetón/i), 'Lona');
  await user.type(screen.getByLabelText(/cantidad/i), '10');
  await user.type(screen.getByLabelText(/fecha entrega/i), '2099-12-31');
}

describe('OrderModal (formulario "Nuevo Pedido")', () => {
  beforeEach(() => {
    productTypesApi.getProductTypes.mockResolvedValue(tiposDeCaseton);
  });

  it('carga los tipos de casetón del backend en el selector', async () => {
    // Arrange / Act
    abrirModal();

    // Assert: el título del modal y las opciones que llegaron del API
    expect(
      screen.getByRole('dialog', { name: /nuevo pedido de producción/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Lona' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Guadua' })).toBeInTheDocument();
  });

  it('registra el pedido con los datos escritos y avisa a la página', async () => {
    // Arrange
    ordersApi.createOrder.mockResolvedValue({ id: 99 });
    const { user, onSuccess, onClose } = abrirModal();
    await screen.findByRole('option', { name: 'Lona' });

    // Act
    await llenarPedidoValido(user);
    await user.click(screen.getByRole('button', { name: /registrar pedido/i }));

    // Assert: se envió lo que escribió la persona y el modal se cerró
    expect(ordersApi.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente: 'Constructora Andina',
        tipo_caseton_id: '1',
        cantidad: '10',
        fecha_entrega_estimada: '2099-12-31',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mantiene el botón deshabilitado si el cliente tiene menos de 3 caracteres', async () => {
    // Arrange
    const { user } = abrirModal();
    await screen.findByRole('option', { name: 'Lona' });
    await llenarPedidoValido(user);

    // Act: deja el cliente con solo 2 caracteres (justo debajo del límite)
    await user.clear(screen.getByLabelText(/cliente/i));
    await user.type(screen.getByLabelText(/cliente/i), 'Ab');

    // Assert: no se puede enviar y no se llamó al backend
    expect(screen.getByRole('button', { name: /registrar pedido/i })).toBeDisabled();
    expect(ordersApi.createOrder).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del backend si el registro falla y no cierra el modal', async () => {
    // Arrange: el backend rechaza el pedido
    ordersApi.createOrder.mockRejectedValue({
      response: { data: { detail: 'El tipo de casetón no tiene receta configurada.' } },
    });
    const { user, onSuccess, onClose } = abrirModal();
    await screen.findByRole('option', { name: 'Lona' });

    // Act
    await llenarPedidoValido(user);
    await user.click(screen.getByRole('button', { name: /registrar pedido/i }));

    // Assert
    expect(
      await screen.findByText(/el tipo de casetón no tiene receta configurada/i),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('avisa cuando no se puede cargar el catálogo de tipos', async () => {
    // Arrange: el backend no responde al pedir los tipos
    productTypesApi.getProductTypes.mockRejectedValue(new Error('Network Error'));

    // Act
    abrirModal();

    // Assert
    expect(
      await screen.findByText(/no se pudo cargar el catálogo de tipos de casetón/i),
    ).toBeInTheDocument();
  });

  it('se cierra al presionar Escape', async () => {
    // Arrange
    const { user, onClose } = abrirModal();
    await screen.findByRole('option', { name: 'Lona' });

    // Act
    await user.keyboard('{Escape}');

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

