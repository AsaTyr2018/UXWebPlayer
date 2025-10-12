import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
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
