import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'], setupFiles: ['tests/setup.ts'], fileParallelism: false },
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
});
