import { test, expect } from '@playwright/test';

test.describe('Autenticación - Manejo de Errores', () => {

  test('debe mostrar un mensaje en rojo al ingresar una contraseña incorrecta', async ({ page }) => {
    // 1. ARRANGE (Navegar a la pantalla de login)
    await page.goto('/login');

    // 2. ACT (Ingresar usuario existente pero con contraseña incorrecta)
    await page.getByPlaceholder(/correo electrónico/i).fill('admin@casetech.com');
    await page.getByPlaceholder(/contraseña/i).fill('ContrasenaTotalmenteErronea123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // 3. ASSERT:
    // Localizamos el contenedor del mensaje de error
    const alertError = page.locator('div').filter({ hasText: /credenciales inválidas/i });

    // a) Validar que el mensaje es visible en pantalla
    await expect(alertError).toBeVisible();

    // b) Validar que el texto del mensaje es rojo (#fca5a5 en CSS -> rgb(252, 165, 165))
    await expect(alertError).toHaveCSS('color', 'rgb(252, 165, 165)');

    // c) Validar que el usuario sigue en /login y no fue redirigido
    await expect(page).toHaveURL(/\/login/);
  });

});