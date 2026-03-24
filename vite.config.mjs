import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.PORT || '3000';

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['pdfjs-dist'],
    },
    server: {
      proxy: {
        '/api': `http://localhost:${apiPort}`,
      },
    },
    build: {
      commonjsOptions: {
        include: [/pdfjs-dist/, /node_modules/],
      },
    },
  };
});
