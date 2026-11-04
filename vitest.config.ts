import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: {
      '@streakforge/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
      '@streakforge/validation': path.resolve(__dirname, './packages/validation/src/index.ts'),
      '@streakforge/config': path.resolve(__dirname, './packages/config/src/index.ts'),
      '@streakforge/git-engine': path.resolve(__dirname, './packages/git-engine/src/index.ts'),
      '@streakforge/sync-engine': path.resolve(__dirname, './packages/sync-engine/src/index.ts')
    }
  }
});
