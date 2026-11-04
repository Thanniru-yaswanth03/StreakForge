import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'index.html'),
        'service-worker': path.resolve(__dirname, 'src/background/service-worker.ts'),
        'leetcode-observer': path.resolve(__dirname, 'src/content/leetcode-observer.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return 'src/background/service-worker.js';
          }
          if (chunkInfo.name === 'leetcode-observer') {
            return 'src/content/leetcode-observer.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@streakforge/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@streakforge/config': path.resolve(__dirname, '../../packages/config/src/index.ts')
    }
  }
});

