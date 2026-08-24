## Descripción

<!-- Describe brevemente los cambios introducidos en este PR y el problema que resuelven. -->

Closes #<!-- ID del Issue relacionado -->

---

## Tipo de cambio

- [ ] `feat` — Nueva funcionalidad
- [ ] `fix` — Corrección de bug
- [ ] `refactor` — Refactorización sin cambio de comportamiento
- [ ] `docs` — Solo documentación
- [ ] `chore` — Mantenimiento / dependencias / CI
- [ ] `test` — Tests nuevos o corregidos

---

## Checklist general

- [ ] Mi rama está actualizada con `develop` (`git rebase origin/develop`).
- [ ] Los mensajes de commit siguen [Conventional Commits](https://www.conventionalcommits.org/es/).
- [ ] He vinculado el Issue correspondiente con `Closes #ID` arriba.
- [ ] He asignado al menos un revisor.

---

## Checklist de Docker

- [ ] El proyecto levanta correctamente con `docker compose up --build` sin errores.
- [ ] Los contenedores `db`, `backend` y `frontend` pasan a estado **healthy / running**.
- [ ] No se introducen credenciales en texto plano en ningún archivo versionado.
- [ ] Las variables de entorno nuevas están documentadas en `.env.example`.
- [ ] Los cambios en dependencias Python se reflejan en `backend/pyproject.toml`.
- [ ] Los cambios en dependencias Node se reflejan en `frontend/package.json` y `pnpm-lock.yaml`.

---

## Checklist de seguridad

- [ ] `uv pip audit` ejecutado sin vulnerabilidades MEDIUM/HIGH/CRITICAL. _(Pega salida aquí si aplica)_
- [ ] `pnpm audit --audit-level=moderate` ejecutado sin hallazgos. _(Pega salida aquí si aplica)_

---

## Checklist de tests

- [ ] Tests unitarios existentes pasan (`uv run pytest` / `pnpm run test`).
- [ ] Se agregaron tests para la nueva funcionalidad o el bug corregido.
- [ ] Cobertura no decrece respecto a `develop`.

---

## Capturas / evidencia (opcional)

<!-- Adjunta screenshots, logs o salidas de terminal relevantes. -->

---

## Notas para el revisor

<!-- Cualquier contexto adicional que el revisor deba conocer. -->
