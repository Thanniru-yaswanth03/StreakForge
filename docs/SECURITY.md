# StreakForge Security Policy & Architecture

## 1. Threat Model & Boundaries

StreakForge handles sensitive developer resources:
- GitHub OAuth Access Tokens (granting repository write permissions).
- Local Git Repositories and source code files.
- LeetCode session activity and solutions.

### 1.1 Zero Fabrication Integrity
StreakForge strictly forbids synthetic activity generation. The system incorporates algorithmic validations:
- **Git Commit Timestamp Integrity**: Commit timestamps must match real-time activity and cannot be set into the arbitrary past or future without trigger flags.
- **LeetCode Acceptance Verification**: Only submissions marked `Accepted` with real execution IDs, execution times, and memory benchmarks are persisted and exported.
- **Genuine Diff Verification**: The local agent refuses to commit empty trees, dummy whitespace changes, or non-substantive loop commits.

---

## 2. Secrets Management & Token Encryption

### 2.1 AES-256-GCM Encryption at Rest
All GitHub OAuth access tokens and refresh tokens are encrypted before being written to MongoDB.

```
+--------------------------------------------------------+
|                      Plaintext                         |
|             gho_xxxxxxxxxxxxxxxxxxxx                   |
+--------------------------------------------------------+
                           |
                           v
        AES-256-GCM + IV (12 bytes) + Auth Tag (16 bytes)
                           |
                           v
+--------------------------------------------------------+
|           Encrypted Token (Base64 URL Safe)            |
|         iv.ciphertext.authTag                          |
+--------------------------------------------------------+
```

- **Encryption Key**: Derived from `ENCRYPTION_MASTER_KEY` environment variable (32-byte key).
- **IV**: Fresh cryptographic pseudorandom 12-byte initialization vector generated per encryption operation.
- **Integrity**: GCM authenticated tag guarantees detection of tampering.

---

## 3. Sandboxing & Isolation

### 3.1 Chrome Extension Isolation
- The content script runs inside Chrome's isolated world.
- No GitHub access tokens, encryption keys, or server database credentials exist in the extension content script.
- The extension communicates solely with the background service worker via Chrome runtime messaging.
- Requests to the central API use short-lived scoped extension tokens.

### 3.2 Local Desktop Agent Sandboxing
- The local agent HTTP listener binds exclusively to loopback interface `127.0.0.1`.
- It rejects requests originating from non-local IP addresses.
- All IPC requests require mutual authentication with an ephemeral secret key generated at startup or pairing.
- Git commands are executed via parameter-separated argument arrays (e.g. `spawn('git', ['commit', '-m', message])`), entirely preventing command-injection attacks through untrusted branch names or commit messages.

### 3.3 Secret Leaks Prevention (Git Engine)
The local desktop agent enforces a mandatory safety filter that aborts any commit containing:
1. Dotenv files (`.env`, `.env.local`, `.env.production`, etc.).
2. Private keys (`*.pem`, `*.key`, `id_rsa`, `id_ed25519`).
3. Credential stores (`credentials.json`, `service-account.json`).
4. Hardcoded high-entropy tokens matching regex signatures for GitHub PATs, AWS access keys, or Slack webhooks.

---

## 4. Network Security & Headers

- **Content Security Policy (CSP)**: Configured in the Next.js frontend to restrict script execution and style sources.
- **Cross-Origin Resource Sharing (CORS)**: The Express backend strictly whitelists authorized frontend origins (`WEB_APP_URL`) and extension IDs (`chrome-extension://<id>`).
- **Rate Limiting**: Rate limiting applied via sliding-window algorithms to protect authentication endpoints, submission ingestion, and agent heartbeats against brute force or denial-of-service attempts.

