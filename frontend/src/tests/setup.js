/**
 * tests/setup.js — Preparación común de todos los tests del frontend.
 *
 * ¿Qué? Agrega las verificaciones de jest-dom (toBeInTheDocument, toBeDisabled...)
 *       y limpia la pantalla simulada después de cada test.
 * ¿Para qué? Que cada test empiece desde cero y pueda verificar lo que ve la persona.
 * ¿Impacto? Sin cleanup, lo que dibujó un test seguiría en pantalla en el siguiente.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
