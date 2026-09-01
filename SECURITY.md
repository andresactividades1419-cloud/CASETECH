# Política de Seguridad y Gestión de Vulnerabilidades — CASETECH ERP

> **Compromiso de Seguridad**: El proyecto CASETECH adopta estándares de seguridad por diseño (*Security by Design*), principio de mínimo privilegio (PoLP), autenticación robusta mediante JWT con algoritmo HS256, hash de contraseñas con Bcrypt y tipado estricto con `pydantic.SecretStr` para prevenir fuga de credenciales.

---

## 1. Versiones Soportadas

| Rama / Entorno | Soporte de Seguridad | Estado |
|---|---|---|
| `main` | ✅ Parches de seguridad críticos y estables | Activa |
| `develop` | ✅ Pruebas continuas y auditorías CI | En integración |
| `feature/*` | ⚠️ Solo durante revisión de Pull Request | Activa |
| Versiones heredadas | ❌ No soportadas | Obsoletas |

---

## 2. Reporte Responsable de Vulnerabilidades

Si descubres una posible vulnerabilidad de seguridad o debilidad en el sistema CASETECH, te solicitamos encarecidamente **no abrir un Issue público ni divulgarla públicamente** hasta que haya sido evaluada y mitigada.

### Canal de contacto
- **Correo Electrónico**: `security@casetech.internal` / `devops@casetech.internal`
- **Asunto**: `[SECURITY VULNERABILITY] <Módulo afectado> - <Severidad>`

### Información requerida en el reporte
1. **Descripción detallada** de la vulnerabilidad y vector de ataque.
2. **Pasos reproducibles** o prueba de concepto (*PoC*).
3. **Módulos / Endpoints afectados** (e.g. `/api/v1/auth`, `sp_descontar_receta`, RBAC frontend).
4. **Impacto potencial estimado** (confidencialidad, integridad o disponibilidad).
5. **Versión o commit** donde se detectó el problema.

### Tiempo de respuesta (SLA)
- **Confirmación de recepción**: Menos de **24 a 48 horas hábiles**.
- **Evaluación y remediación**: Entre **3 y 7 días hábiles** dependiendo de la severidad (CVSS).

---

## 3. Comandos Oficiales de Auditoría de Dependencias

Antes de cada integración o despliegue a producción, es mandatario ejecutar las suites de auditoría CVE locales y automatizadas:

### 🔒 Backend (Python 3.11 + UV + FastAPI)

```bash
# 1. Posicionarse en el directorio del backend
cd backend

# 2. Generar el archivo de dependencias de producción y auditar con pip-audit estricto:
uv export --no-dev --format requirements-txt > requirements.audit.txt
uv run pip-audit -r requirements.audit.txt --strict

# 3. Alternativa directa mediante herramienta global uvx:
uvx pip-audit -r requirements.audit.txt
```

> **Criterio de Aceptación CI**: El pipeline de GitHub Actions bloqueará cualquier Pull Request que contenga vulnerabilidades con severidad **MEDIUM, HIGH o CRITICAL**.

---

### 🌐 Frontend (Node 20 + React 18 + PNPM)

```bash
# 1. Posicionarse en el directorio del frontend
cd frontend

# 2. Ejecutar auditoría de paquetes con nivel de alerta moderado:
pnpm audit --audit-level=moderate
```

> **Criterio de Aceptación CI**: No se permiten dependencias directas o transitivas con avisos de vulnerabilidad no mitigados en el lockfile `pnpm-lock.yaml`.

---

## 4. Reglas Estrictas de Gestión de Credenciales y Secretos

1. **Prohibición Total de Credenciales Hardcodeadas**: Ningún secreto, token o clave privada debe residir en el código fuente.
2. **Variables de Entorno (`.env`)**:
   - El archivo `.env` está expresamente excluido del control de versiones mediante `.gitignore`.
   - Utilizar únicamente `.env.example` como plantilla pública con valores de demostración sanitizados.
3. **Manejo en Backend con Pydantic `SecretStr`**:
   - `JWT_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_INITIAL_PASSWORD` y `OPERARIO_INITIAL_PASSWORD` son tratados como `SecretStr` sin valores por defecto. Si faltan en tiempo de arranque, la aplicación aplica **fail-fast** inmediato.
4. **Rotación y Longitud de Claves**:
   - `JWT_SECRET` debe generarse criptográficamente con al menos 256 bits (`secrets.token_hex(32)`).
   - Se recomienda rotación periódica cada 90 días en entornos de producción.
5. **Control de Acceso Basado en Roles (RBAC)**:
   - Toda ruta administrativa requiere verificación tanto a nivel de endpoint (`AdminUser` / `require_admin`) como a nivel de interfaz de usuario (`ProtectedRoute allowedRoles={['ADMINISTRADOR']}`).
