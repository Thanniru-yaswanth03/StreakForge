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
        options: path.resolve(__dirname, 'options.html'),
        'service-worker': path.resolve(__dirname, 'src/background/service-worker.ts'),
        'leetcode-observer': path.resolve(__dirname, 'src/content/leetcode-observer.ts'),
        'leetcode-interceptor': path.resolve(__dirname, 'src/content/leetcode-interceptor.ts'),
        'web-bridge': path.resolve(__dirname, 'src/content/web-bridge.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return 'src/background/service-worker.js';
          }
          if (chunkInfo.name === 'leetcode-observer') {
            return 'src/content/leetcode-observer.js';
          }
          if (chunkInfo.name === 'leetcode-interceptor') {
            return 'src/content/leetcode-interceptor.js';
          }
          if (chunkInfo.name === 'web-bridge') {
            return 'src/content/web-bridge.js';
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

