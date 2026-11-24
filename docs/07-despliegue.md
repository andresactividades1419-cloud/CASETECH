# 07 — Despliegue y variables de entorno

Esta guía explica cómo poner CASETECH en producción con `docker-compose.prod.yml`, qué
significa cada variable de entorno y cómo resolver los problemas que ya aparecieron.

> Todo lo de este documento se probó levantando el stack de producción desde cero
> (`down -v` + `up --build`), creando el administrador y haciendo login desde el navegador.

---

## 1. Cómo queda armado en producción

```
Navegador ──► Nginx (contenedor "frontend", puerto 80)
                 ├─ /            → archivos de React ya compilados (con "SPA fallback")
                 └─ /api/...     → reenvía al contenedor "backend" (FastAPI, puerto 8000 interno)
                                        │
                                        └─► contenedor "db" (PostgreSQL 16, puerto 5432 interno)
```

- **Solo el puerto del frontend se publica** al exterior. El backend (8000) y la base de
  datos (5432) viven en una red interna de Docker: nadie de afuera puede llegar a ellos.
- El navegador llama a la API **en la misma dirección del sitio** (`/api/v1/...`). Por eso en
  producción no hay URL del backend escrita en el código ni problemas de CORS.
- El backend corre con 4 workers, como usuario sin privilegios (`appuser`), sin `--reload`.
- Cada servicio tiene *healthcheck*: el backend solo se considera sano si `/health` responde
  200 **y** conecta con la base de datos; el frontend espera a que el backend esté sano.

Diferencias con desarrollo (`docker-compose.yml`):

| | Desarrollo | Producción |
|---|---|---|
| Puertos publicados | 3000 (front), 8000 (API), 5432 (BD) | solo el del frontend (80) |
| Frontend | servidor de Vite con recarga | Nginx con archivos compilados |
| Backend | `--reload`, 1 proceso | 4 workers, sin recarga |
| Usuarios iniciales | se siembran solos (`init_db`) | **no** se siembran: se crean con `create_admin` |
| URL de la API | `VITE_API_URL=http://localhost:8000` | vacía (misma dirección del sitio) |

---

## 2. Variables de entorno

Se definen en un archivo `.env` junto a los `docker-compose*.yml` (se parte de
`.env.example`). **`.env` nunca se sube a git** (está en `.gitignore`).

| Variable | ¿Obligatoria? | Para qué sirve | Notas |
|---|---|---|---|
| `POSTGRES_PASSWORD` | **Sí** | Contraseña de la base de datos | Compose falla si falta. En producción no puede ser el texto de ejemplo (`CAMBIA_ESTA_CONTRASENA`): el backend se niega a arrancar. |
| `JWT_SECRET` | **Sí** | Clave con la que se firman los tokens de sesión | Mínimo 32 bytes. Generar: `python -c "import secrets; print(secrets.token_hex(32))"`. Claves conocidas/inseguras se rechazan; en producción también el texto de ejemplo de `.env.example` (era un hueco: [#128](https://github.com/andresactividades1419-cloud/CASETECH/issues/128)). |
| `POSTGRES_USER` | No (`casetech`) | Usuario de la BD | |
| `POSTGRES_DB` | No (`casetech_db`) | Nombre de la BD | |
| `JWT_ALGORITHM` | No (`HS256`) | Algoritmo de firma | No cambiar sin motivo. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No (`30`) | Duración del token de acceso | El de renovación dura 7 días. |
| `CORS_ORIGINS` | No | Orígenes que pueden llamar a la API desde otro dominio | Con el despliegue por defecto (misma dirección) no se usa. Solo importa si front y API están en dominios distintos. Lista separada por comas, sin espacios. |
| `FRONTEND_PORT` | No (`80`) | Puerto del host donde se publica el sitio | Útil si el 80 está ocupado. |
| `SQL_ECHO` | No (`false`) | Imprime cada consulta SQL en el log | Solo para depurar un rato; llena el log. |
| `ENVIRONMENT` | — | `development` / `production` | En `docker-compose.prod.yml` ya viene fija en `production`. |

Solo para **desarrollo**: `VITE_API_URL`, `ADMIN_INITIAL_PASSWORD`, `OPERARIO_INITIAL_PASSWORD`
(las dos últimas únicamente alimentan la siembra de `init_db`, que en producción no corre).

### Qué pasa si una variable está mal

El backend **valida todo al arrancar** y falla con un mensaje en español en vez de un
traceback. Por ejemplo, sin `JWT_SECRET`:

```
❌ CASETECH no pudo arrancar: la configuración de entorno es inválida.
   • JWT_SECRET: falta definirla (agrégala en el archivo .env)
Qué hacer: copia .env.example a .env y completa los valores...
```

Y si `POSTGRES_PASSWORD` sigue siendo el texto de ejemplo con `ENVIRONMENT=production`, también
se detiene indicando cuál variable corregir.

### Importante: la URL de la API se "hornea" al compilar

Vite escribe `VITE_API_URL` **dentro del JavaScript** cuando se construye la imagen. Cambiarla
después, dentro del contenedor, no hace nada. En producción se construye con `VITE_API_URL=""`
(argumento `args` en `docker-compose.prod.yml`), que significa "usar la misma dirección del sitio".
Si algún día el backend vive en otro dominio, hay que poner ahí su URL y **reconstruir** la imagen
del frontend.

---

## 3. Pasos para desplegar

1. **Preparar el `.env`** a partir de la plantilla y poner valores reales:

   ```powershell
   Copy-Item .env.example .env
   # Edita .env: POSTGRES_PASSWORD, JWT_SECRET (y FRONTEND_PORT si hace falta)
   ```

2. **Construir y levantar** (las migraciones de Alembic corren solas al arrancar el backend):

   ```powershell
   docker compose -f docker-compose.prod.yml up --build -d
   ```

3. **Crear el primer administrador.** En producción no se siembran usuarios a propósito (para no
   dejar credenciales conocidas), así que la base nueva está vacía de usuarios:

   ```powershell
   docker compose -f docker-compose.prod.yml exec backend python -m app.scripts.create_admin --email admin@tuempresa.com
   ```

   Pide la contraseña dos veces por teclado (no queda en el historial). Debe tener mínimo 8
   caracteres, una mayúscula y un dígito (la misma regla de la API). Es seguro repetirlo: si el correo
   ya existe **no** lo modifica. Para cambiar la contraseña de un admin existente (también lo
   desbloquea y reactiva), añadir `--reset-password`. Para automatizar, se puede pasar la
   contraseña con la variable `CREATE_ADMIN_PASSWORD`.

4. **Verificar**:

   ```powershell
   docker compose -f docker-compose.prod.yml ps          # los 3 servicios "healthy"
   curl http://localhost/api/v1/auth/me                  # debe responder 401 "Not authenticated"
   ```

   Y entrar desde el navegador a `http://<servidor>/` con el administrador creado.

Para **actualizar** a una versión nueva: traer el código, `up --build -d` de nuevo. Los datos
persisten en el volumen `postgres_data`. **No usar `down -v` en producción**: borra la base.

---

## 4. HTTPS (necesario en un servidor real)

La cookie de sesión (refresh token) se marca `Secure` en producción: el navegador **solo la guarda
por HTTPS** (la excepción es `localhost`, por eso la prueba local funciona con `http`).

En un servidor accesible por internet sin HTTPS, el login funciona pero la sesión no se puede
renovar: se pierde al recargar la página o a los 30 minutos.

El contenedor Nginx del proyecto habla solo HTTP (puerto 80). Lo habitual es poner delante un
proxy que ponga el certificado (Caddy, Traefik, Nginx del servidor o el balanceador del proveedor
de nube) y que envíe `X-Forwarded-Proto: https`. El proyecto ya lo respeta: Nginx reenvía esa
cabecera y el backend corre con `--proxy-headers`, así las redirecciones usan `https://`.
(No se incluyó el certificado en el repo porque depende del dominio de cada despliegue.)

**IP real del cliente.** El backend limita los intentos de login por IP, así que necesita la IP verdadera
de quien llama. Nginx solo cree en `X-Forwarded-For` cuando la conexión llega desde una red privada
(un proxy propio delante) y, en ese caso, toma la última IP no confiable de la cadena. Si llega desde
una IP pública, ignora esa cabecera. Así un atacante no puede inventar una IP distinta en cada intento
para saltarse el límite. Si el proxy de TLS está en una red pública (no privada), hay que añadir su
rango con `set_real_ip_from` en `frontend/nginx.conf`.

---

## 5. Problemas que ya aparecieron (y por qué)

| Síntoma | Causa | Estado |
|---|---|---|
| Nginx devolvía 404/502 al llamar la API | El `command: >` multilínea de YAML conservaba los saltos de línea: uvicorn arrancaba **sin flags** (solo `127.0.0.1`, 1 worker) y Nginx no podía alcanzarlo | Corregido: comando en una línea con `exec` |
| La web llamaba a `localhost:8000` desde el navegador | `VITE_API_URL` se compilaba con el valor de desarrollo | Corregido: argumento de build vacío = misma dirección |
| Al abrir `/materials`, el navegador quedaba en error | FastAPI redirige a `/materials/`; Nginx perdía el puerto (`$host`) y detrás de HTTPS el esquema | Corregido: `$http_host` + `X-Forwarded-Proto` + `--proxy-headers` |
| Docker marcaba "healthy" un backend sin base de datos | El healthcheck terminaba con `\|\| exit 0` | Corregido: usa `/health` (503 si no hay BD) |
| Se podía saltar el límite de intentos de login falseando `X-Forwarded-For` | Al confiar en las cabeceras del proxy, Nginx anexaba la cadena que enviaba el cliente y el backend toma la IP más a la izquierda | Corregido: `real_ip` solo confía en redes privadas y la cabecera se sobrescribe con la IP validada (probado con un backend falso) |
| Nadie podía iniciar sesión tras desplegar | En producción no se siembran usuarios y no había herramienta | Corregido: `create_admin` |
| El `JWT_SECRET` de ejemplo se aceptaba en producción (permitía falsificar tokens de administrador) | Solo se rechazaban las contraseñas de ejemplo; el secreto JWT pasaba la validación de longitud | Corregido ([#128](https://github.com/andresactividades1419-cloud/CASETECH/issues/128)): ahora el backend se niega a arrancar y nombra la variable |
| Backend no arrancaba con un `.env` copiado de la plantilla | Los valores de ejemplo (contraseñas y `JWT_SECRET`) se rechazan fuera de `development` | Es a propósito: cambiar los valores |
