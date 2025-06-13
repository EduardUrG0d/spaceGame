import { defineConfig } from 'vite';

export default defineConfig({
  base: '/space-game/', // Имя репозитория на GitHub
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}); 