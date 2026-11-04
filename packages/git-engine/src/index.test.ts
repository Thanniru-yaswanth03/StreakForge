import { describe, it, expect } from 'vitest';
import {
  isSafeFilePath,
  scanDiffForSecrets,
  generateCommitMessage
} from './index.js';

describe('Git Engine Security & Safety', () => {
  it('identifies safe files correctly', () => {
    expect(isSafeFilePath('src/index.ts').safe).toBe(true);
    expect(isSafeFilePath('README.md').safe).toBe(true);
    expect(isSafeFilePath('components/Button.tsx').safe).toBe(true);
  });

  it('blocks dangerous and sensitive files', () => {
    expect(isSafeFilePath('.env').safe).toBe(false);
    expect(isSafeFilePath('.env.local').safe).toBe(false);
    expect(isSafeFilePath('secrets.key').safe).toBe(false);
    expect(isSafeFilePath('cert.pem').safe).toBe(false);
    expect(isSafeFilePath('id_rsa').safe).toBe(false);
    expect(isSafeFilePath('config/credentials.json').safe).toBe(false);
    expect(isSafeFilePath('node_modules/package/index.js').safe).toBe(false);
  });

  it('detects high-entropy secrets in git diff additions', () => {
    const safeDiff = `
diff --git a/src/app.ts b/src/app.ts
+const port = 3000;
+console.log('App started');
`;
    expect(scanDiffForSecrets(safeDiff).safe).toBe(true);

    const secretDiff = `
diff --git a/src/client.ts b/src/client.ts
+const token = "ghp_123456789012345678901234567890123456";
`;
    const check = scanDiffForSecrets(secretDiff);
    expect(check.safe).toBe(false);
    expect(check.findings.length).toBeGreaterThan(0);
  });

  it('generates meaningful commit messages', () => {
    expect(generateCommitMessage(['README.md'])).toBe('docs: update documentation in README');
    expect(generateCommitMessage(['tests/auth.test.ts'])).toBe('test: update test cases for auth.test');
    expect(generateCommitMessage(['src/index.ts'])).toBe('feat: update index');
    expect(generateCommitMessage(['src/a.ts', 'src/b.ts'])).toBe('chore(src): update 2 files');
  });
});

