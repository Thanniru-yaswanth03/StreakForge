import { describe, it, expect } from 'vitest';
import {
  isSafeFilePath,
  scanDiffForSecrets,
  generateSmartCommitMessage,
  checkRemoteStatus
} from './index.js';

describe('Git Engine Security, Safety & Commit Engine', () => {
  it('identifies safe files correctly', () => {
    expect(isSafeFilePath('src/index.ts').safe).toBe(true);
    expect(isSafeFilePath('README.md').safe).toBe(true);
    expect(isSafeFilePath('components/Button.tsx').safe).toBe(true);
  });

  it('blocks dangerous and sensitive files', () => {
    expect(isSafeFilePath('.env').safe).toBe(false);
    expect(isSafeFilePath('.env.local').safe).toBe(false);
    expect(isSafeFilePath('.env.production').safe).toBe(false);
    expect(isSafeFilePath('secrets.key').safe).toBe(false);
    expect(isSafeFilePath('cert.pem').safe).toBe(false);
    expect(isSafeFilePath('id_rsa').safe).toBe(false);
    expect(isSafeFilePath('credentials.json').safe).toBe(false);
    expect(isSafeFilePath('secrets.json').safe).toBe(false);
    expect(isSafeFilePath('node_modules/package/index.js').safe).toBe(false);
    expect(isSafeFilePath('dist/bundle.js').safe).toBe(false);
    expect(isSafeFilePath('.next/cache').safe).toBe(false);
  });

  it('detects high-entropy secrets and credentials in git diff additions', () => {
    const safeDiff = `
diff --git a/src/app.ts b/src/app.ts
+const port = 3000;
+console.log('App started');
`;
    expect(scanDiffForSecrets(safeDiff).safe).toBe(true);

    const ghPatDiff = `
diff --git a/src/client.ts b/src/client.ts
+const token = "ghp_123456789012345678901234567890123456";
`;
    expect(scanDiffForSecrets(ghPatDiff).safe).toBe(false);

    const awsDiff = `
diff --git a/config.ts b/config.ts
+const key = "AKIAIOSFODNN7EXAMPLE";
`;
    expect(scanDiffForSecrets(awsDiff).safe).toBe(false);

    const dbUriDiff = `
diff --git a/db.ts b/db.ts
+const uri = "postgres://admin:SuperSecretPass123@db.example.com:5432/production";
`;
    expect(scanDiffForSecrets(dbUriDiff).safe).toBe(false);

    const privateKeyDiff = `
diff --git a/cert.ts b/cert.ts
+-----BEGIN RSA PRIVATE KEY-----
+MIIEowIBAAKCAQEA0Y1
`;
    expect(scanDiffForSecrets(privateKeyDiff).safe).toBe(false);
  });

  it('generates smart, meaningful Conventional Commit messages based on intent', () => {
    expect(generateSmartCommitMessage(['README.md'])).toBe('docs: update documentation for README');
    expect(generateSmartCommitMessage(['src/auth.test.ts'])).toBe('test: add test coverage for auth');
    expect(generateSmartCommitMessage(['src/binarySearch.ts'])).toBe('feat: update binarySearch implementation');

    const fixDiff = `
diff --git a/src/arrayUtils.ts b/src/arrayUtils.ts
+if (!input || input.length === 0) return null; // fix empty input error
`;
    expect(generateSmartCommitMessage(['src/arrayUtils.ts'], fixDiff)).toBe('fix: resolve issue in arrayUtils');

    expect(generateSmartCommitMessage(['tsconfig.json'])).toBe('chore(config): update configuration in tsconfig.json');
    expect(generateSmartCommitMessage(['src/a.ts', 'src/b.ts'])).toBe('feat(src): enhance functionality across 2 files');
  });

  it('handles remote status checks safely without crashing', async () => {
    // Current working directory is the monorepo root
    const status = await checkRemoteStatus(process.cwd());
    expect(typeof status.hasConflict).toBe('boolean');
  });
});
