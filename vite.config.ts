import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: '0.0.0.0',
    port: 2222
  },
  build: {
    outDir: 'dist/admin',
    emptyOutDir: false
  },
  esbuild: {
    target: 'es2020',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: true
      }
    }
  },
  test: {
    environment: 'jsdom'
  }
});
