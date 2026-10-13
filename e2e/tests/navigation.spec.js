import { test, expect } from '@playwright/test';

test('Navegación secuencial por los módulos del ERP', async ({ page }) => {
  // 1. Iniciar sesión
  await page.goto('/login');
  await page.getByRole('textbox', { name: /correo electrónico/i }).fill('admin@casetech.com');
  await page.getByRole('textbox', { name: /contraseña/i }).fill('Admin1234*');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL('/');

  // 2. Navegación directa por cada sección
  await page.getByRole('link', { name: /proveedores/i }).click();
  await expect(page).toHaveURL('/providers');

  await page.getByRole('link', { name: /pedidos/i }).click();
  await expect(page).toHaveURL('/orders');

  await page.getByRole('link', { name: /control de inventario/i }).click();
  await expect(page).toHaveURL('/materials');

  await page.getByRole('link', { name: /ajustes de inventario/i }).click();
  await expect(page).toHaveURL('/adjustments');

  await page.getByRole('link', { name: /abastecimiento/i }).click();
  await expect(page).toHaveURL('/purchases');

  await page.getByRole('link', { name: /usuarios/i }).click();
  await expect(page).toHaveURL('/users');

  await page.getByRole('link', { name: /recetas bom/i }).click();
  await expect(page).toHaveURL('/recipes');
});
