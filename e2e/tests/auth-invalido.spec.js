import { test, expect } from '@playwright/test';

test.describe('Autenticación - Manejo de errores', () => {
  test('muestra "Credenciales inválidas" y no deja entrar con un usuario que no existe', async ({ page }) => {
    // ARRANGE: abrir la pantalla de login
    await page.goto('/login');

    // ACT: intentar entrar con un correo que no existe en la base de datos
    await page.getByRole('textbox', { name: /correo electrónico/i }).fill('usuario.inexistente@casetech.com');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('ClaveIncorrecta123*');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // ASSERT: la persona ve el mensaje de error y sigue en el login
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});