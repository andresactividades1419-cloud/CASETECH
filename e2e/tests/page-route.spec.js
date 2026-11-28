import { test, expect } from '@playwright/test';

/**
 * Estados difíciles de provocar con el backend real (bootcamp semana 5).
 *
 * page.route() intercepta las peticiones del navegador y responde lo que el
 * test necesita: es un STUB del backend dentro de un E2E. Ni siquiera hace
 * falta levantar el backend: también la sesión se simula.
 */

// Token de mentira con el formato de un JWT. El frontend solo LEE su contenido
// (el rol); la firma la valida el backend, que aquí no participa.
const payload = Buffer.from(
  JSON.stringify({ sub: 'admin@casetech.com', rol: 'ADMINISTRADOR' }),
).toString('base64url');
const TOKEN_FALSO = `encabezado.${payload}.firma`;

// Simula una sesión abierta: AuthContext llama a /auth/refresh y /auth/me al cargar.
async function simularSesionAdmin(page) {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ json: { access_token: TOKEN_FALSO } }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 1,
        nombre_completo: 'Admin Prueba',
        email: 'admin@casetech.com',
        rol_id: 1,
        activo: true,
      },
    }),
  );
}

test.describe('Inventario con el backend simulado (page.route)', () => {
  test('muestra un error claro cuando el API de materiales está caído', async ({ page }) => {
    // Arrange: sesión simulada y el endpoint de materiales responde 500
    await simularSesionAdmin(page);
    await page.route('**/api/v1/materials**', (route) =>
      route.fulfill({ status: 500, json: { detail: 'Error interno del servidor.' } }),
    );

    // Act
    await page.goto('/materials');

    // Assert: la persona ve el aviso de error, no una tabla vacía
    await expect(
      page.getByText('No se pudieron recuperar los insumos de inventario.'),
    ).toBeVisible();
  });

  test('muestra el error de validación cuando el backend responde 422 al iniciar sesión', async ({ page }) => {
    // Arrange: sin sesión previa, y el login responde 422 (datos con formato inválido)
    await page.route('**/api/v1/auth/refresh', (route) =>
      route.fulfill({ status: 401, json: { detail: 'Sin sesión' } }),
    );
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 422,
        json: { detail: [{ loc: ['body', 'username'], msg: 'Field required' }] },
      }),
    );
    await page.goto('/login');

    // Act
    await page.getByLabel('Correo electrónico').fill('admin@casetech.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave-Segura-123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Assert: el aviso de error del formulario, y la persona sigue en el login
    await expect(page.getByRole('alert')).toContainText('Formato de datos no procesable');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('muestra el mensaje de lista vacía cuando no hay materiales', async ({ page }) => {
    // Arrange: sesión simulada y una lista vacía
    await simularSesionAdmin(page);
    await page.route('**/api/v1/materials**', (route) =>
      route.fulfill({ json: { items: [], total: 0, skip: 0, limit: 50 } }),
    );

    // Act
    await page.goto('/materials');

    // Assert
    await expect(
      page.getByText('No se encontraron materiales con los filtros aplicados.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /control de inventario/i })).toBeVisible();
  });
});
