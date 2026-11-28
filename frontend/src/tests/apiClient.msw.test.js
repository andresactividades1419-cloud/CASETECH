/**
 * Tests del cliente HTTP del frontend con MSW (bootcamp semana 5, capa Front).
 *
 * Hasta ahora todos los tests reemplazaban los módulos de src/api con vi.mock,
 * así que ese código NUNCA se ejecutaba. Aquí el código real hace peticiones de
 * verdad (axios) y MSW las intercepta antes de salir a la red: es un STUB del
 * backend que responde lo que cada test necesita (200, 401, 422, 500, HTML…).
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import adjustmentsApi from '../api/adjustmentsApi';
import { authEvents } from '../api/client';
import dashboardApi from '../api/dashboardApi';
import materialsApi from '../api/materialsApi';
import ordersApi from '../api/ordersApi';
import productTypesApi from '../api/productTypesApi';
import providersApi from '../api/providersApi';
import purchasesApi from '../api/purchasesApi';
import recipesApi from '../api/recipesApi';
import { clearToken, getToken, setToken } from '../api/tokenStore';
import usersApi from '../api/usersApi';

const API = 'http://localhost:8000/api/v1';
const listaVacia = { items: [], total: 0 };

// "Backend feliz" por defecto: cualquier GET responde una lista vacía.
const server = setupServer(http.get(`${API}/*`, () => HttpResponse.json(listaVacia)));

// onUnhandledRequest: 'error' → si el código pide algo que no está en los
// handlers, el test falla: ninguna petición se escapa a la red real.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers(); // lo que cambió un test con server.use() no afecta al siguiente
  clearToken();
});
afterAll(() => server.close());

describe('clientes de src/api: caso feliz', () => {
  it.each([
    ['materialsApi.getMaterials', () => materialsApi.getMaterials()],
    ['providersApi.getProviders', () => providersApi.getProviders()],
    ['ordersApi.getOrders', () => ordersApi.getOrders()],
    ['purchasesApi.getPurchases', () => purchasesApi.getPurchases()],
    ['adjustmentsApi.getAdjustments', () => adjustmentsApi.getAdjustments()],
    ['recipesApi.getRecipes', () => recipesApi.getRecipes()],
    ['productTypesApi.getProductTypes', () => productTypesApi.getProductTypes()],
    ['usersApi.getUsers', () => usersApi.getUsers()],
    ['dashboardApi.getStockMovements', () => dashboardApi.getStockMovements()],
  ])('%s devuelve el JSON del backend', async (_nombre, llamar) => {
    // Act
    const datos = await llamar();

    // Assert (estado): el cliente entrega el cuerpo tal como lo mandó el backend
    expect(datos).toEqual(listaVacia);
  });

  it('envía el token en el encabezado Authorization', async () => {
    // Arrange: SPY del encabezado que llega al "backend"
    let encabezado = null;
    server.use(
      http.get(`${API}/materials`, ({ request }) => {
        encabezado = request.headers.get('authorization');
        return HttpResponse.json(listaVacia);
      }),
    );
    setToken('token-de-prueba');

    // Act
    await materialsApi.getMaterials();

    // Assert (comportamiento)
    expect(encabezado).toBe('Bearer token-de-prueba');
  });
});

describe('clientes de src/api: cada función llama al endpoint correcto', () => {
  it.each([
    ['GET /materials/1', () => materialsApi.getMaterialById(1)],
    ['POST /materials', () => materialsApi.createMaterial({ nombre: 'Cemento', unidad_medida: 'kg' })],
    ['PUT /materials/1', () => materialsApi.updateMaterial(1, { nombre: 'Cemento' })],
    ['PATCH /materials/1/status', () => materialsApi.toggleMaterialStatus(1)],
    ['GET /providers/4', () => providersApi.getProviderById(4)],
    ['POST /providers', () => providersApi.createProvider({ nit: '900123456-7', nombre_empresa: 'Aceros' })],
    ['PUT /providers/4', () => providersApi.updateProvider(4, { nombre_empresa: 'Aceros' })],
    ['PATCH /providers/4/status', () => providersApi.toggleProviderStatus(4)],
    ['GET /orders/7', () => ordersApi.getOrderById(7)],
    ['POST /orders', () => ordersApi.createOrder({ cliente: 'Andina', tipo_caseton_id: '1', cantidad: '10', fecha_entrega_estimada: '2099-12-31' })],
    ['PATCH /orders/7/status', () => ordersApi.updateOrderStatus(7, 'CANCELADO')],
    ['GET /orders/7/recipe-preview', () => ordersApi.getRecipePreview(7)],
    ['GET /purchases/2', () => purchasesApi.getPurchaseById(2)],
    ['POST /purchases/', () => purchasesApi.createPurchase({ proveedor_id: '4', fecha_compra: '2026-11-20', items: [{ material_id: '1', cantidad: '5', precio_unitario: '1000' }] })],
    ['GET /stock-adjustments/3', () => adjustmentsApi.getAdjustmentById(3)],
    ['POST /stock-adjustments/', () => adjustmentsApi.createAdjustment({ material_id: '1', tipo: 'MERMA', cantidad: '2', motivo: 'Lona rota en el traslado' })],
    ['POST /stock-adjustments/3/review', () => adjustmentsApi.reviewAdjustment(3, { aprobado: true })],
    ['POST /recipes', () => recipesApi.createRecipe({ tipo_caseton_id: '1', material_id: '2', cantidad_por_unidad: '1.5' })],
    ['PUT /recipes/5', () => recipesApi.updateRecipe(5, '2.5')],
    ['DELETE /recipes/5', () => recipesApi.deleteRecipe(5)],
    ['GET /users/2', () => usersApi.getUserById(2)],
    ['POST /users', () => usersApi.createUser({ email: 'nuevo@casetech.com' })],
    ['PUT /users/2', () => usersApi.updateUser(2, { nombre_completo: 'Nuevo' })],
    ['PATCH /users/2/status', () => usersApi.toggleUserStatus(2)],
    ['GET /dashboard/metrics', () => dashboardApi.getDashboardMetrics()],
    ['GET /dashboard/audit-logs', () => dashboardApi.getAuditLogs()],
  ])('%s', async (esperado, llamar) => {
    // Arrange: SPY que anota método y ruta de cada petición que llega al "backend"
    const peticiones = [];
    const anotar = ({ request }) => {
      peticiones.push(`${request.method} ${new URL(request.url).pathname.replace('/api/v1', '')}`);
      return HttpResponse.json({ id: 1 });
    };
    server.use(
      http.get(`${API}/*`, anotar),
      http.post(`${API}/*`, anotar),
      http.put(`${API}/*`, anotar),
      http.patch(`${API}/*`, anotar),
      http.delete(`${API}/*`, anotar),
    );

    // Act
    await llamar();

    // Assert (comportamiento): una sola petición, al método y ruta correctos
    expect(peticiones).toEqual([esperado]);
  });
});

describe('clientes de src/api: errores del backend', () => {
  it('un 500 rechaza la promesa con el código de estado', async () => {
    // Arrange: STUB de un backend caído
    server.use(http.get(`${API}/materials`, () => new HttpResponse(null, { status: 500 })));

    // Act / Assert
    await expect(materialsApi.getMaterials()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('un 422 entrega el "detail" del backend para mostrarlo en pantalla', async () => {
    // Arrange: el backend rechaza el material
    server.use(
      http.post(`${API}/materials`, () =>
        HttpResponse.json({ detail: 'El stock mínimo no puede ser negativo.' }, { status: 422 }),
      ),
    );

    // Act
    const error = await materialsApi
      .createMaterial({ nombre: 'Cemento', unidad_medida: 'kg', stock_actual: 1, stock_minimo: -1 })
      .catch((e) => e);

    // Assert: es el texto que la pantalla muestra con err.response.data.detail
    expect(error.response.status).toBe(422);
    expect(error.response.data.detail).toBe('El stock mínimo no puede ser negativo.');
  });

  it('una respuesta HTML (página de error de un proxy) se rechaza con un mensaje claro', async () => {
    // Arrange: por ejemplo, Nginx responde su página de error en vez del API
    server.use(
      http.get(`${API}/materials`, () =>
        HttpResponse.html('<html><body>502 Bad Gateway</body></html>'),
      ),
    );

    // Act / Assert: antes llegaba como "datos" y la pantalla mostraba una lista vacía
    await expect(materialsApi.getMaterials()).rejects.toThrow(
      'El servidor respondió una página HTML en lugar de datos',
    );
  });
});

describe('cliente HTTP: renovación de sesión ante un 401', () => {
  it('pide un token nuevo y reintenta la petición original', async () => {
    // Arrange: el primer intento responde 401; /auth/refresh entrega un token nuevo
    let intentos = 0;
    server.use(
      http.get(`${API}/materials`, ({ request }) => {
        intentos += 1;
        if (request.headers.get('authorization') !== 'Bearer token-nuevo') {
          return HttpResponse.json({ detail: 'Token vencido' }, { status: 401 });
        }
        return HttpResponse.json(listaVacia);
      }),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ access_token: 'token-nuevo' })),
    );
    setToken('token-vencido');

    // Act
    const datos = await materialsApi.getMaterials();

    // Assert: 2 intentos (el fallido y el reintento) y el token quedó actualizado
    expect(datos).toEqual(listaVacia);
    expect(intentos).toBe(2);
    expect(getToken()).toBe('token-nuevo');
  });

  it('si la renovación falla, borra el token y avisa que la sesión expiró', async () => {
    // Arrange: 401 en la petición y también en /auth/refresh
    server.use(
      http.get(`${API}/materials`, () => HttpResponse.json({ detail: 'Token vencido' }, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ detail: 'Sin sesión' }, { status: 401 })),
    );
    setToken('token-vencido');
    const sesionExpirada = vi.fn(); // SPY del evento que escucha AuthContext
    authEvents.addEventListener('session-expired', sesionExpirada);

    // Act
    const error = await materialsApi.getMaterials().catch((e) => e);
    authEvents.removeEventListener('session-expired', sesionExpirada);

    // Assert
    expect(error.response.status).toBe(401);
    expect(getToken()).toBeNull();
    expect(sesionExpirada).toHaveBeenCalledTimes(1);
  });
});
