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
      // Línea base medida el 2026-11-09: 0.72 % de líneas. Solo puede subir.
      thresholds: { lines: 0.7, statements: 0.7, functions: 0, branches: 0 },
    },
  },
});
