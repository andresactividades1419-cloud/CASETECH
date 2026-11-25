import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
      // ¿Qué? Carpetas que el servidor de desarrollo NO vigila.
      // ¿Para qué?
      //   - coverage/: cada `pnpm run test:run` la regenera y eso recargaba la página.
      //   - .pnpm-store/: caché de pnpm (miles de archivos) que aparece aquí cuando se
      //     corre `pnpm install` dentro del contenedor. Con usePolling, revisarla hacía
      //     que cada página tardara ~20 s en Docker sobre Windows.
      // ¿Impacto? Sin esto, el frontend en Docker es tan lento que los E2E fallan por timeout.
      ignored: ['**/coverage/**', '**/.pnpm-store/**'],
    },
  },
  // ¿Qué? Medición de cobertura de Vitest con un umbral mínimo (bootcamp de testing, semana 1).
  // ¿Para qué? Que cada corrida de tests mida la cobertura y falle si baja de la línea base.
  // ¿Impacto? Si alguien borra tests o agrega código sin probar, `pnpm run test:run` falla.
  test: {
    // ¿Qué? Navegador simulado (jsdom) y archivo de preparación común (semana 3).
    // ¿Para qué? Poder dibujar componentes React en los tests sin abrir un navegador real.
    // ¿Impacto? Sin jsdom, render() falla con "document is not defined".
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/main.jsx', // arranque: solo monta <App />, no tiene lógica de negocio
        'src/**/*.test.{js,jsx}', // los propios archivos de test no se miden a sí mismos
        'src/tests/**', // ayudas de test (setup, renderWithProviders), no código de la app
      ],
      // Línea base medida en CI el 2026-11-09: 0.57 % de líneas. Solo puede subir.
      // Cierre semana 3 (2026-11-25): el CI midió 44.83 % de líneas → umbral 44
      // (el mayor entre el piso de la semana, 40, y la cobertura real redondeada hacia abajo).
      // Ojo: en Windows (archivos con fin de línea CRLF) la misma suite marca un % más
      // alto que en CI (LF). El número oficial es siempre el del CI.
      thresholds: { lines: 44, statements: 44, functions: 0, branches: 0 },
    },
  },
});
