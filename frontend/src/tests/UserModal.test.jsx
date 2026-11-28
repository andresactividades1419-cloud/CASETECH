/**
 * tests/UserModal.test.jsx — Formulario para crear y editar cuentas de usuario (HU02).
 *
 * ¿Qué? Prueba las reglas del formulario: campos obligatorios, contraseña segura
 *       (8 caracteres, 1 mayúscula, 1 número), contraseña opcional al editar, y las
 *       formas de cerrar el modal.
 * ¿Para qué? Que nadie pueda registrar una cuenta con datos inválidos desde la pantalla.
 * ¿Impacto? Si alguien afloja una regla, el botón se habilita con datos malos y estos tests fallan.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserModal } from '../components/users/UserModal';

const operarioExistente = {
  id: 7,
  nombre_completo: 'Carlos Gómez',
  email: 'carlos@casetech.com',
  rol_id: 2,
  activo: true,
};

function abrirModal(props = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <UserModal
      isOpen
      onClose={onClose}
      user={null}
      onSave={onSave}
      isSubmitting={false}
      errorMessage=""
      {...props}
    />,
  );
  return { user: userEvent.setup(), onSave, onClose };
}

async function llenarFormulario(user, { nombre, email, password }) {
  await user.type(screen.getByLabelText(/nombre completo/i), nombre);
  await user.type(screen.getByLabelText(/correo electrónico/i), email);
  await user.type(screen.getByLabelText(/contraseña/i), password);
}

describe('UserModal (crear y editar cuentas)', () => {
  it('no muestra nada cuando está cerrado', () => {
    // Act
    render(<UserModal isOpen={false} onClose={vi.fn()} user={null} onSave={vi.fn()} />);

    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cada campo tiene un nombre accesible (su etiqueta)', () => {
    // Act
    abrirModal();

    // Assert: se encuentran por la etiqueta, como los anuncia un lector de pantalla
    expect(screen.getByLabelText(/nombre completo/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/rol del usuario/i)).toHaveValue('2');
    expect(screen.getByLabelText(/estado de la cuenta/i)).toHaveValue('true');
  });

  it('registra un usuario nuevo con los datos escritos', async () => {
    // Arrange
    const { user, onSave } = abrirModal();
    expect(screen.getByRole('heading', { name: /registrar nuevo usuario/i })).toBeInTheDocument();

    // Act: llena el formulario, elige ADMINISTRADOR e Inactivo, y guarda
    await llenarFormulario(user, {
      nombre: 'Ana Ruiz',
      email: 'ana@casetech.com',
      password: 'Segura123',
    });
    await user.selectOptions(screen.getByLabelText(/rol del usuario/i), '1');
    await user.selectOptions(screen.getByLabelText(/estado de la cuenta/i), 'false');
    await user.click(screen.getByRole('button', { name: /registrar usuario/i }));

    // Assert
    expect(onSave).toHaveBeenCalledWith({
      nombre_completo: 'Ana Ruiz',
      email: 'ana@casetech.com',
      password: 'Segura123',
      rol_id: 1,
      activo: false,
    });
  });

  it.each([
    ['sin mayúscula', 'segura123'],
    ['sin número', 'SeguraSegura'],
    ['con 7 caracteres', 'Segur12'],
  ])('no deja registrar con una contraseña %s', async (_caso, password) => {
    // Arrange
    const { user } = abrirModal();

    // Act
    await llenarFormulario(user, { nombre: 'Ana Ruiz', email: 'ana@casetech.com', password });

    // Assert: el botón sigue deshabilitado
    expect(screen.getByRole('button', { name: /registrar usuario/i })).toBeDisabled();
  });

  it('acepta una contraseña de exactamente 8 caracteres con mayúscula y número', async () => {
    // Arrange: el valor límite de la regla
    const { user } = abrirModal();

    // Act
    await llenarFormulario(user, {
      nombre: 'Ana Ruiz',
      email: 'ana@casetech.com',
      password: 'Segura12',
    });

    // Assert
    expect(screen.getByRole('button', { name: /registrar usuario/i })).toBeEnabled();
  });

  it.each([
    ['un nombre de 2 letras', { nombre: 'An', email: 'ana@casetech.com' }],
    ['un correo sin dominio', { nombre: 'Ana Ruiz', email: 'ana@casetech' }],
  ])('no deja registrar con %s', async (_caso, datos) => {
    // Arrange
    const { user } = abrirModal();

    // Act
    await llenarFormulario(user, { ...datos, password: 'Segura123' });

    // Assert
    expect(screen.getByRole('button', { name: /registrar usuario/i })).toBeDisabled();
  });

  it('al editar, llena el formulario y la contraseña es opcional', async () => {
    // Arrange + Act
    const { user, onSave } = abrirModal({ user: operarioExistente });

    // Assert: datos precargados y título de edición
    expect(
      screen.getByRole('heading', { name: /editar usuario: carlos@casetech.com/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Carlos Gómez');
    expect(screen.getByLabelText(/nueva contraseña \(opcional\)/i)).toHaveValue('');

    // Se puede guardar sin escribir contraseña
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'carlos@casetech.com', password: '' }),
    );
  });

  it('al editar, si escribe una contraseña nueva débil, no deja guardar', async () => {
    // Arrange
    const { user } = abrirModal({ user: operarioExistente });

    // Act
    await user.type(screen.getByLabelText(/nueva contraseña/i), 'debil');

    // Assert
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled();
  });

  it('muestra el error que devuelve el backend', () => {
    // Act
    abrirModal({ errorMessage: 'El correo ya está registrado.' });

    // Assert
    expect(screen.getByText(/el correo ya está registrado/i)).toBeInTheDocument();
  });

  it('mientras guarda, muestra "Guardando..." y no deja cerrar con Escape', async () => {
    // Arrange
    const { user, onClose } = abrirModal({ isSubmitting: true });

    // Act
    await user.keyboard('{Escape}');

    // Assert
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('se cierra con Escape, con Cancelar y con clic en el fondo oscuro', async () => {
    // Arrange
    const { user, onClose } = abrirModal();

    // Act
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    // El fondo es el elemento que envuelve al diálogo
    await user.click(screen.getByRole('dialog').parentElement);

    // Assert: las 3 formas cierran
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
