# Política de Seguridad — CASETECH

## Versiones soportadas

| Versión | Soporte de seguridad |
|---------|----------------------|
| `main`  | ✅ Activa             |
| ramas `feature/*` | ⚠️ Solo en revisión |
| ramas antiguas    | ❌ No soportadas     |

---

## Reporte de vulnerabilidades

Si descubres una vulnerabilidad de seguridad, **no abras un Issue público**.  
Envía un correo a: **security@casetech.internal** con el asunto `[SECURITY] <descripción breve>`.

Incluye en tu reporte:
- Descripción detallada del problema.
- Pasos para reproducir el fallo.
- Impacto potencial estimado.
- Versiones afectadas.

Recibirás confirmación en un plazo máximo de **48 horas hábiles**.

---

## Auditorías CVE obligatorias

### Backend (Python / UV)

Cada `pull request` hacia `develop` o `main` **debe** ejecutar:

```bash
uv pip audit
```

El pipeline de CI bloqueará el merge si se detectan vulnerabilidades de severidad **MEDIUM, HIGH o CRITICAL**.

### Frontend (Node / PNPM)

```bash
pnpm audit --audit-level=moderate
```

El pipeline de CI bloqueará el merge si el nivel es **moderate** o superior.

> **Ambas auditorías deben pasar sin errores antes de aprobar cualquier PR.**

---

## Reglas de credenciales

1. **Prohibición absoluta de credenciales en texto plano** en el código fuente, commits o Pull Requests.
2. Todas las credenciales se gestionan mediante **variables de entorno** definidas en `.env` (nunca versionado).
3. Usar el archivo `.env.example` como plantilla pública (sin valores reales).
4. Claves de API, tokens JWT y contraseñas de base de datos se almacenan únicamente en:
   - Gestor de secretos del servidor CI/CD.
   - Vault / AWS Secrets Manager / equivalente en producción.
5. Nunca usar contraseñas por defecto en ningún entorno (incluido desarrollo local).
6. Las claves simétricas (JWT_SECRET) deben tener una longitud mínima de **256 bits** y rotarse cada **90 días**.

---

## Gestión de dependencias

- Las versiones de todas las dependencias son **fijas y sin comodines** (`^`, `~`).
- Las actualizaciones deben ser deliberadas, revisadas y auditadas antes de aplicarse.
- Se prohíbe `pip install <paquete>` directo en producción; todo cambio pasa por `pyproject.toml` + revisión de PR.

---

## Seguridad en contenedores

- Las imágenes base deben ser oficiales y de versión fija (e.g., `postgres:16-alpine`, `python:3.11-slim`).
- Nunca ejecutar contenedores de producción como usuario **root**.
- Escanear imágenes con `docker scout` o equivalente antes de cada despliegue a producción.
