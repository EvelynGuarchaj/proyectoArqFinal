import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['pruebas/**/*.prueba.ts'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/servidor.ts', 'src/openapi/**', 'src/tipos/**'],
      thresholds: { lines: 70 },
    },
  },
});
