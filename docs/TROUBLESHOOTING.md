# StreakForge Troubleshooting & Diagnostics Guide

This guide provides practical diagnostic procedures and resolutions for common issues across the StreakForge ecosystem.

---

## 1. GitHub Authentication & OAuth

### Issue: "Redirect URI Mismatch" Error on GitHub Login
- **Symptom**: When clicking **Connect with GitHub**, GitHub displays `The redirect_uri MUST match the registered callback URL for this application`.
- **Cause**: The `GITHUB_CALLBACK_URL` in your `.env` does not exactly match the Authorization Callback URL in your GitHub OAuth App settings.
- **Resolution**:
  1. Open your GitHub account: **Settings -> Developer settings -> OAuth Apps**.
  2. Select your StreakForge application.
  3. Ensure **Authorization callback URL** is set to:
     - Local development: `http://localhost:4000/api/v1/auth/github/callback`
     - Production: `https://<your-api-domain>/api/v1/auth/github/callback`
  4. Ensure protocol (`http` vs `https`) and port match exactly.

### Issue: "Invalid or expired OAuth state parameter (CSRF verification failed)"
- **Symptom**: Returned from GitHub with HTTP 403 and `CSRF_STATE_INVALID`.
- **Cause**: The state nonce expired (15-minute validity window) or was modified in transit.
- **Resolution**:
  - Re-initiate login by clicking **Connect with GitHub** again.
  - Verify that system clocks on your client and server are synchronized (NTP).

---

## 2. LeetCode Chrome Extension

### Issue: Extension Shows "Disconnected" in Popup
- **Symptom**: The popup shows a grey offline dot and "Backend Disconnected".
- **Resolution**:
  1. Click the gear icon in the extension popup to open **Options**.
  2. Verify that **Backend API URL** is reachable:
     - Open `http://localhost:4000/health` (or your production API URL) in a new tab. It should return HTTP 200 with `status: "healthy"`.
  3. Verify that your **API Token** is set. Generate a fresh token in the Web Dashboard under **Settings -> API Keys**.
  4. Click **Save Configuration** and click **Test Connection**.

### Issue: Accepted Submission Not Triggering GitHub Export
- **Symptom**: You solved a problem on LeetCode and received an `Accepted` verdict, but nothing was exported.
- **Resolution**:
  1. **Check Verdict**: StreakForge strictly ignores non-accepted verdicts (`Wrong Answer`, `Compile Error`, `Time Limit Exceeded`). Only authentic `Accepted` results trigger synchronization.
  2. **Check Target Repository**: Open the Web Dashboard (**Repository Manager**). Verify that exactly one connected repository is toggled as **Designate as LeetCode Target**.
  3. **Check Extension Pending Queue**: Click the extension icon. If the submission is listed in **Pending Queue**, click **Force Sync Now**.
  4. **Inspect Console Logs**: On the LeetCode problem tab, press `F12` and open the **Console** tab. Filter by `[StreakForge]` to review observer events.

---

## 3. Local Desktop Companion Agent

### Issue: "Access forbidden: Non-loopback caller" (HTTP 403)
- **Symptom**: Dashboard or client receives 403 when communicating with `http://127.0.0.1:4545`.
- **Cause**: StreakForge agent binds exclusively to the local loopback interface for security. Requests originating from remote IP addresses are blocked.
- **Resolution**:
  - Ensure requests target `http://127.0.0.1:4545` or `http://localhost:4545`, not a local LAN IP (such as `192.168.x.x`).

### Issue: "Unauthorized: Invalid loopback token" (HTTP 401)
- **Symptom**: API calls to `127.0.0.1:4545` return 401.
- **Resolution**:
  - The loopback token stored in your browser's localStorage does not match the token in `%USERPROFILE%\.streakforge\agent-config.json`.
  - Re-pair the agent from the dashboard: navigate to **Overview -> Local Companion Agent -> Pair Local Agent** and paste the loopback token.

### Issue: "Commit blocked by Secret Filter: Potential credentials detected in diff"
- **Symptom**: The agent refuses to commit and logs a security error.
- **Cause**: The pre-commit scanner detected high-entropy credentials (e.g. `ghp_...`, `AKIA...`, private keys, or `.env` files) in staged files.
- **Resolution**:
  1. Check `git status` in the repository.
  2. Add sensitive files to `.gitignore`.
  3. Remove plaintext credentials from your source files before committing.
  4. Run `git reset` to unstage the sensitive changes.

### Issue: "Repository is in detached HEAD state"
- **Symptom**: The agent logs a workflow error: `Repository is in detached HEAD state`.
- **Cause**: Git is checked out to a specific commit hash rather than a named branch.
- **Resolution**:
  - Switch back to an active branch:
    ```bash
    git checkout main
    ```

### Issue: "FORBIDDEN_PATH: Root filesystem directory cannot be registered as repository"
- **Symptom**: Attempting to watch `C:\` or `/` returns 403.
- **Cause**: Defensive security rules prevent watching filesystem root drives or system directories (`C:\Windows`, `/etc`, `/sys`).
- **Resolution**:
  - Register only specific project repository directories.

---

## 4. Database & MongoDB Connectivity

### Issue: "MongooseServerSelectionError: connect ECONNREFUSED"
- **Symptom**: Central API fails to start or `/health` returns 503.
- **Resolution**:
  - **Local MongoDB**: Verify the MongoDB service is running:
    ```bash
    # Windows
    Get-Service MongoDB
    Start-Service MongoDB

    # Linux / macOS
    sudo systemctl status mongod
    sudo systemctl start mongod
    ```
  - **MongoDB Atlas**:
    1. Verify your network IP is added to the Atlas **Network Access** IP Access List (or use `0.0.0.0/0` with strong authentication).
    2. Verify the username and password in `MONGODB_URI` are correct and URL-encoded if special characters exist.

### Issue: "E11000 duplicate key error"
- **Symptom**: Database write fails with unique index violation.
- **Resolution**:
  - StreakForge uses compound unique indexes to guarantee zero duplicates:
    - `{ userId: 1, submissionId: 1 }` prevents duplicate LeetCode exports.
    - `{ userId: 1, repoFullName: 1 }` prevents duplicate repository connections.
    - `{ idempotencyKey: 1 }` prevents duplicate automation jobs.
  - This is expected behavior when a duplicate sync is attempted; the sync engine safely skips re-exporting.

---

## 5. Streak & Timezone Calculations

### Issue: Streak Resets Despite Submitting Yesterday
- **Symptom**: Current streak drops to 0 even though you solved a problem yesterday.
- **Cause**: The submission occurred after midnight in UTC or your profile timezone is misconfigured.
- **Resolution**:
  1. Navigate to **Settings** on the dashboard.
  2. Confirm that **Primary Timezone** matches your physical location (e.g. `America/Chicago` instead of `UTC`).
  3. Click **Recalculate Streaks**: StreakForge will re-index all historical activity records against your configured timezone's calendar days.
