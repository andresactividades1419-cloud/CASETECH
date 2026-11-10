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
      // ¿Qué? El servidor de desarrollo no vigila la carpeta del reporte de cobertura.
      // ¿Para qué? Cada `pnpm run test:run` regenera coverage/ y eso recargaba la página.
      // ¿Impacto? Sin esto, correr tests unitarios durante un E2E puede romper el E2E.
      ignored: ['**/coverage/**'],
    },
  },
  // ¿Qué? Medición de cobertura de Vitest con un umbral mínimo (bootcamp de testing, semana 1).
  // ¿Para qué? Que cada corrida de tests mida la cobertura y falle si baja de la línea base.
  // ¿Impacto? Si alguien borra tests o agrega código sin probar, `pnpm run test:run` falla.
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/main.jsx', // arranque: solo monta <App />, no tiene lógica de negocio
        'src/**/*.test.{js,jsx}', // los propios archivos de test no se miden a sí mismos
      ],
      // Línea base medida en CI el 2026-11-09: 0.57 % de líneas. Solo puede subir.
      // Ojo: en Windows (archivos con fin de línea CRLF) la misma suite marca un % más
      // alto que en CI (LF). El número oficial es siempre el del CI.
      thresholds: { lines: 0.5, statements: 0.5, functions: 0, branches: 0 },
    },
  },
});
