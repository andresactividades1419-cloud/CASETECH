import { test, expect } from '@playwright/test';

test.describe('Autenticación - CASETECH', () => {

  test('debe iniciar sesión exitosamente con credenciales de administrador', async ({ page }) => {
    // 1. ARRANGE (Preparar: ir al login)
    await page.goto('/login');

    // 2. ACT (Actuar: llenar formulario y enviar)
    await page.getByRole('textbox', { name: /correo electrónico/i }).fill('admin@casetech.com');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('Admin1234*');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // 3. ASSERT (Verificar: comprobar que entra al sistema y se ve el Dashboard)
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

});
