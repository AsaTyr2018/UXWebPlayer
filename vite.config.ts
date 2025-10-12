import { defineConfig } from 'vite';
import { defineConfig } from 'vite';
import { createAccessControlApp } from './src/server/access-control-app.js';

const accessControlApiPlugin = () => ({
  name: 'access-control-api',
  configureServer(server) {
    const app = createAccessControlApp();
    server.middlewares.use(app);
  },
  configurePreviewServer(server) {
    const app = createAccessControlApp();
    server.middlewares.use(app);
  }
});

export default defineConfig({
  root: '.',
  plugins: [accessControlApiPlugin()],
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
    environment: 'jsdom',
    environmentMatchGlobs: [['tests/server/**', 'node']],
    sequence: {
      concurrent: false
    },
    maxThreads: 1,
    minThreads: 1
  }
});
