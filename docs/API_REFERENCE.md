# StreakForge API Reference Manual

## Base URL
All API requests are routed to:
```
http://localhost:4000/api/v1
```
In production, this is hosted under your configured domain (e.g. `https://api.streakforge.dev/api/v1`).

---

## 1. Authentication Standards

StreakForge uses two authentication schemes depending on the caller:

1. **User Bearer JWT**: Passed in the `Authorization` header as `Bearer <token>` for web frontend requests.
2. **Agent / Extension Token**: Passed in header `X-StreakForge-Key: <token>` or `Authorization: Bearer <ext-token>`.

### Error Response Format
All errors return consistent JSON:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "language",
        "message": "Language must be a supported programming language"
      }
    ]
  }
}
```

---

## 2. Authentication Endpoints

### 2.1 Initiates GitHub OAuth
- **Endpoint**: `GET /auth/github`
- **Description**: Redirects user to GitHub OAuth login with required scopes (`repo`, `read:user`, `user:email`).
- **Response**: `302 Redirect` to `https://github.com/login/oauth/authorize`

### 2.2 GitHub OAuth Callback
- **Endpoint**: `GET /auth/github/callback`
- **Query Params**:
  - `code` (string, required): GitHub temporary auth code
  - `state` (string, required): Anti-CSRF verification state
- **Response**: Redirects to Web Dashboard with session cookie/token.

### 2.3 Get Current User Profile
- **Endpoint**: `GET /auth/me`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6732f91a...",
      "username": "alexdeveloper",
      "email": "alex@example.com",
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345",
      "timezone": "America/New_York",
      "streakGoalPerDay": 1
    }
  }
}
```

---

## 3. Repository Management Endpoints

### 3.1 List Repositories
- **Endpoint**: `GET /repos`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "connected": [
      {
        "id": "6732f99b...",
        "repoFullName": "alexdeveloper/leetcode-archive",
        "defaultBranch": "main",
        "isTargetForLeetCode": true,
        "lastSyncedAt": "2026-11-04T12:00:00.000Z"
      }
    ],
    "githubAvailable": [
      {
        "id": 1234567,
        "name": "leetcode-archive",
        "fullName": "alexdeveloper/leetcode-archive",
        "isPrivate": false
      }
    ]
  }
}
```

### 3.2 Connect Target Repository
- **Endpoint**: `POST /repos/connect`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "repoFullName": "alexdeveloper/leetcode-archive",
  "githubRepoId": 1234567,
  "defaultBranch": "main",
  "isTargetForLeetCode": true,
  "solutionPathPattern": "solutions/{difficulty}/{id}-{slug}"
}
```

---

## 4. LeetCode Synchronization Endpoints

### 4.1 Ingest Accepted Submission
- **Endpoint**: `POST /sync/leetcode/submission`
- **Headers**: `Authorization: Bearer <TOKEN>` or `X-Extension-Key: <TOKEN>`
- **Body**:
```json
{
  "submissionId": "987654321",
  "questionId": "1",
  "questionTitle": "Two Sum",
  "questionSlug": "two-sum",
  "difficulty": "Easy",
  "language": "typescript",
  "code": "function twoSum(nums: number[], target: number): number[] { ... }",
  "runtimeMs": 52,
  "runtimePercentile": 89.2,
  "memoryBytes": 51200000,
  "memoryPercentile": 76.5,
  "submittedAt": "2026-11-04T14:30:00.000Z"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "submissionId": "987654321",
    "syncStatus": "SYNCED",
    "commitSha": "a1b2c3d4e5f6...",
    "commitUrl": "https://github.com/alexdeveloper/leetcode-archive/commit/a1b2c3d4",
    "filePath": "solutions/Easy/1-two-sum/two-sum.ts"
  }
}
```

### 4.2 List Submission Sync History
- **Endpoint**: `GET /sync/leetcode/history`
- **Query Params**: `page` (number), `limit` (number), `status` (PENDING|SYNCED|FAILED)
- **Response `200 OK`**: Paginated array of submissions.

---

## 5. Local Desktop Agent Endpoints

### 5.1 Register Local Agent
- **Endpoint**: `POST /agent/register`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "name": "Workstation Laptop",
  "hostname": "arch-workstation",
  "os": "win32",
  "agentVersion": "1.0.0"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "agentId": "uuid-v4-string",
    "apiKey": "sf_agent_live_secret_key_12345"
  }
}
```

### 5.2 Agent Heartbeat & Telemetry
- **Endpoint**: `POST /agent/heartbeat`
- **Headers**: `X-StreakForge-Agent-Key: <API_KEY>`
- **Body**:
```json
{
  "agentId": "uuid-v4-string",
  "status": "ONLINE",
  "watchedPaths": ["C:\\Users\\dev\\projects\\web-service"],
  "recentActivities": [
    {
      "repoPath": "C:\\Users\\dev\\projects\\web-service",
      "commitSha": "fe56a42...",
      "commitMessage": "feat(auth): add session expiry check",
      "filesChanged": 2,
      "timestamp": "2026-11-04T15:15:00.000Z"
    }
  ]
}
```

---

## 6. Analytics & Audit Endpoints

### 6.1 Get Overview Metrics
- **Endpoint**: `GET /analytics/overview`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "currentStreak": 14,
    "longestStreak": 42,
    "hasSubmittedToday": true,
    "todayCommitCount": 4,
    "todayLeetCodeCount": 1,
    "weeklyConsistencyPercent": 100,
    "streakDeadlineHoursLeft": 8.5
  }
}
```

### 6.2 Get Contribution Heatmap
- **Endpoint**: `GET /analytics/heatmap?year=2026`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**: Daily activity map for calendar visualization.

### 6.3 Query Audit Logs
- **Endpoint**: `GET /audit/logs?page=1&limit=50&component=AGENT`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**: Paginated audit log records.

