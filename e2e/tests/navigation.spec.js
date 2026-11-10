import { test, expect } from '@playwright/test';

// Cada módulo del menú: el texto del enlace, la URL a la que lleva
// y el título que la persona debe ver al llegar.
const modulos = [
  { enlace: /proveedores/i, url: '/providers', titulo: /directorio de proveedores/i },
  { enlace: /pedidos/i, url: '/orders', titulo: /pedidos de producción/i },
  { enlace: /control de inventario/i, url: '/materials', titulo: /control de inventario/i },
  { enlace: /ajustes de inventario/i, url: '/adjustments', titulo: /ajustes manuales/i },
  { enlace: /abastecimiento/i, url: '/purchases', titulo: /gestión de abastecimiento/i },
  { enlace: /usuarios/i, url: '/users', titulo: /gestión de cuentas de usuario/i },
  { enlace: /recetas bom/i, url: '/recipes', titulo: /recetas bom/i },
];

test.describe('Navegación - Menú lateral', () => {
  test('el administrador puede abrir cada módulo del menú y ve su título', async ({ page }) => {
    // ARRANGE: iniciar sesión como administrador (ve todos los módulos)
    await page.goto('/login');
    await page.getByRole('textbox', { name: /correo electrónico/i }).fill('admin@casetech.com');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('Admin1234*');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.getByRole('heading', { name: /panel general de operaciones/i })).toBeVisible();

    for (const modulo of modulos) {
      // ACT: hacer clic en el enlace del módulo en el menú
      await page.getByRole('link', { name: modulo.enlace }).click();

      // ASSERT: la URL cambió y la persona ve el título de ese módulo
      await expect(page).toHaveURL(modulo.url);
      await expect(page.getByRole('heading', { level: 1, name: modulo.titulo })).toBeVisible();
    }
  });
});
