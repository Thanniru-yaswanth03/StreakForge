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
- **Description**: Redirects user to GitHub OAuth login with required scopes (`repo`, `read:user`, `user:email`) and anti-CSRF state token.
- **Response**: `302 Redirect` to `https://github.com/login/oauth/authorize`

### 2.2 GitHub OAuth Callback
- **Endpoint**: `GET /auth/github/callback`
- **Query Params**:
  - `code` (string, required): GitHub temporary auth code
  - `state` (string, required): Anti-CSRF verification state
- **Response**: Validates CSRF state, exchanges code for token, stores token encrypted with AES-256-GCM, and redirects to Web Dashboard with session token.

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
      "githubId": "123456",
      "username": "alexdeveloper",
      "email": "alex@example.com",
      "verifiedEmails": ["alex@example.com", "alex.work@company.com"],
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345",
      "timezone": "America/New_York",
      "streakGoalPerDay": 1
    }
  }
}
```

### 2.4 User Logout
- **Endpoint**: `POST /auth/logout`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Revokes the current session JWT token.

### 2.5 Disconnect GitHub Account
- **Endpoint**: `POST /auth/disconnect`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Purges all stored encrypted GitHub OAuth tokens, disconnects repositories, logs audit event, and terminates active session.

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
        "description": "Genuine LeetCode solutions archive",
        "primaryLanguage": "TypeScript",
        "defaultBranch": "main",
        "category": "LeetCode Solutions",
        "isTargetForLeetCode": true,
        "syncPolicy": {
          "autoCommit": true,
          "autoPush": false,
          "branch": "main",
          "pathPattern": "solutions/{difficulty}/{id}-{slug}",
          "intervalMinutes": 15
        },
        "lastSyncedAt": "2026-11-04T12:00:00.000Z"
      }
    ],
    "githubAvailable": [
      {
        "id": 1234567,
        "name": "leetcode-archive",
        "fullName": "alexdeveloper/leetcode-archive",
        "description": "Genuine LeetCode solutions archive",
        "isPrivate": false,
        "visibility": "public",
        "primaryLanguage": "TypeScript",
        "defaultBranch": "main",
        "cloneUrl": "https://github.com/alexdeveloper/leetcode-archive.git",
        "permissions": {
          "admin": true,
          "push": true,
          "pull": true
        }
      }
    ]
  }
}
```

### 3.2 Connect Repository
- **Endpoint**: `POST /repos/connect`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "repoFullName": "alexdeveloper/leetcode-archive",
  "githubRepoId": 1234567,
  "description": "Genuine LeetCode solutions archive",
  "primaryLanguage": "TypeScript",
  "cloneUrl": "https://github.com/alexdeveloper/leetcode-archive.git",
  "defaultBranch": "main",
  "isTargetForLeetCode": true,
  "category": "LeetCode Solutions",
  "solutionPathPattern": "solutions/{difficulty}/{id}-{slug}",
  "syncPolicy": {
    "autoCommit": true,
    "autoPush": false,
    "branch": "main",
    "pathPattern": "solutions/{difficulty}/{id}-{slug}",
    "intervalMinutes": 15
  }
}
```

### 3.3 Update Repository Policy
- **Endpoint**: `PATCH /repos/:id`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**: Allows updating `category`, `syncPolicy`, `defaultBranch`, `solutionPathPattern`, `isTargetForLeetCode`.

### 3.4 Disconnect Repository
- **Endpoint**: `DELETE /repos/:id`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Disconnects monitored repository from StreakForge without deleting remote files on GitHub.

---

## 4. GitHub Activity & Diagnostics Endpoints

### 4.1 Activity Feed
- **Endpoint**: `GET /github/activity`
- **Headers**: `Authorization: Bearer <JWT>`
- **Query Params**: `page` (default: 1), `limit` (default: 20)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "commits": [
      {
        "sha": "8f7d9a1c3e...",
        "repo": "alexdeveloper/leetcode-archive",
        "branch": "main",
        "author": "alexdeveloper",
        "authorEmail": "alex@example.com",
        "message": "feat(solutions): add LRU Cache solution in Go",
        "timestamp": "2026-11-04T14:15:00.000Z",
        "filesChanged": 2,
        "url": "https://github.com/alexdeveloper/leetcode-archive/commit/8f7d9a1c"
      }
    ],
    "pullRequests": [],
    "issues": [],
    "branches": [],
    "releases": [],
    "rateLimit": {
      "limit": 5000,
      "remaining": 4950,
      "reset": 1730725200
    }
  }
}
```

### 4.2 Commit Attribution Diagnostics
- **Endpoint**: `POST /github/diagnose-commit`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "repoFullName": "alexdeveloper/leetcode-archive",
  "commitSha": "8f7d9a1c3e",
  "branch": "main"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "commitSha": "8f7d9a1c3e",
    "authorEmail": "alex@example.com",
    "repoFullName": "alexdeveloper/leetcode-archive",
    "branch": "main",
    "isEligible": true,
    "status": "ELIGIBLE",
    "checks": [
      {
        "name": "Author Email Association",
        "passed": true,
        "message": "Commit author email \"alex@example.com\" matches verified GitHub account emails."
      },
      {
        "name": "Repository Ownership & Fork Policy",
        "passed": true,
        "message": "Repository is a standalone repository (not a fork)."
      },
      {
        "name": "Branch Eligibility (Default or gh-pages)",
        "passed": true,
        "message": "Commit is on eligible default branch \"main\"."
      },
      {
        "name": "Commit Content & Integrity",
        "passed": true,
        "message": "Standard commit with 2 file(s) changed."
      },
      {
        "name": "Contribution Window (Last 365 Days)",
        "passed": true,
        "message": "Committed on 11/04/2026, within the visible 1-year contribution window."
      }
    ],
    "summary": "Commit 8f7d9a1 meets all GitHub contribution graph requirements."
  }
}
```

### 4.3 Repository Health Diagnostics
- **Endpoint**: `POST /github/diagnose-repo`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "repoFullName": "alexdeveloper/leetcode-archive"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "repoFullName": "alexdeveloper/leetcode-archive",
    "healthScore": 90,
    "hasReadme": true,
    "hasGitignore": true,
    "hasLicense": true,
    "licenseName": "MIT License",
    "openIssuesCount": 0,
    "daysSinceLastActivity": 0,
    "branchProtection": {
      "isProtected": true,
      "requiresPullRequest": true,
      "enforceAdmins": true
    },
    "secretScanResult": {
      "safe": true,
      "findings": []
    },
    "scannedScope": "Inspected default branch ('main'), root configuration files (.gitignore, README, LICENSE), repository metadata, and recent commit diffs. Full-history clone or complete repository tree scan was not performed.",
    "recommendations": []
  }
}
```

### 4.4 Trigger Manual Sync
- **Endpoint**: `POST /github/sync`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Refreshes sync cursors and updates last activity timestamps across all connected repositories.

### 4.5 GitHub Webhook Listener
- **Endpoint**: `POST /github/webhook`
- **Headers**:
  - `X-Hub-Signature-256`: HMAC-SHA256 signature generated using `GITHUB_WEBHOOK_SECRET`
  - `X-GitHub-Delivery`: Unique delivery UUID for deduplication
  - `X-GitHub-Event`: Event name (`push`, `pull_request`, `issues`, `release`, etc.)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "PROCESSED",
    "message": "Event push recorded successfully"
  }
}
```

---

## 5. LeetCode Synchronization Endpoints

### 5.1 Ingest Accepted Submission
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

### 5.2 List Submission Sync History
- **Endpoint**: `GET /sync/leetcode/history`
- **Query Params**: `page` (number), `limit` (number), `status` (PENDING|SYNCED|FAILED)
- **Response `200 OK`**: Paginated array of submissions.

---

## 6. Local Desktop Agent Endpoints

### 6.1 Register Local Agent
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

### 6.2 Agent Heartbeat & Telemetry
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

## 7. Analytics & Audit Endpoints

### 7.1 Get Overview Metrics
- **Endpoint**: `GET /analytics/overview`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: Separated streaks (`githubStreak`, `leetCodeStreak`, `localDevStreak`), `weeklyActivityScore` (0–100), and unmerged category breakdown.

### 7.2 Get Contribution Heatmap
- **Endpoint**: `GET /analytics/heatmap?year=2026`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: Array of 365 calendar day snapshots with individual `githubCount`, `leetCodeCount`, `localDevCount`, and `maintenanceCount`.

### 7.3 Get Date Event Details
- **Endpoint**: `GET /analytics/day-details?date=YYYY-MM-DD`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: Detailed audit breakdown of all immutable activity records occurring on that calendar day in the user's configured timezone.

### 7.4 Get Active Streak Reminders
- **Endpoint**: `GET /analytics/reminders`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: Proactive notification warnings:
  - `NO_ACTIVITY_TODAY`: Timezone-aware streak loss warning before local midnight.
  - `PENDING_EXPORT`: LeetCode solution pending export to GitHub.
  - `FAILED_EXPORT`: Solution export failure requiring attention.
  - `AGENT_OFFLINE`: Local desktop agent heartbeat missing for $>30$ minutes.
  - `UPCOMING_BACKUP`: Scheduled repository safety maintenance.

### 7.5 Recalculate Historical Streaks
- **Endpoint**: `POST /analytics/recalculate`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**: `{ "timezone": "America/New_York" }`
- **Response**: Recomputed historical streak counters across calendar boundaries and leap years.

### 7.6 Query Audit Logs
- **Endpoint**: `GET /audit/logs?page=1&limit=50&component=AGENT`
- **Headers**: `Authorization: Bearer <JWT>`

---

## 8. Automation Engine & Scheduler Endpoints

### 8.1 List Automation Rules
- **Endpoint**: `GET /automations/rules`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: Array of configured automation rules with last/next execution and failure policies.

### 8.2 Create Automation Rule
- **Endpoint**: `POST /automations/rules`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "name": "LeetCode Auto-Exporter",
  "type": "LEETCODE_EXPORT",
  "triggerType": "CRON",
  "schedule": "every 15m",
  "timezone": "America/New_York",
  "repositoryScope": "DEFAULT",
  "executionPolicy": {
    "timeoutSeconds": 300,
    "concurrency": "FORBID",
    "retryLimit": 3,
    "backoffInitialSeconds": 10
  },
  "failurePolicy": {
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "deadLetter": true,
    "notifyOnFailure": true
  }
}
```

### 8.3 Update Automation Rule
- **Endpoint**: `PATCH /automations/rules/:id`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.4 Pause or Resume Rule
- **Endpoint**: `POST /automations/rules/:id/toggle`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.5 Trigger Rule Immediately
- **Endpoint**: `POST /automations/rules/:id/trigger`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: `{ "jobId": "job_...", "jobType": "...", "status": "QUEUED", "isDuplicate": false }`

### 8.6 Delete Automation Rule
- **Endpoint**: `DELETE /automations/rules/:id`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.7 List Persistent Queue Jobs
- **Endpoint**: `GET /automations/jobs?page=1&limit=20&status=QUEUED`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.8 Get Job Details
- **Endpoint**: `GET /automations/jobs/:id`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.9 Cancel Queued or Running Job
- **Endpoint**: `POST /automations/jobs/:id/cancel`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.10 Retry Failed or Dead-Letter Job
- **Endpoint**: `POST /automations/jobs/:id/retry`
- **Headers**: `Authorization: Bearer <JWT>`

### 8.11 Get Queue Statistics
- **Endpoint**: `GET /automations/stats`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: `{ "queued": 0, "running": 1, "completed": 45, "failed": 0, "retrying": 0, "successRate": 100.0, "avgDurationMs": 420 }`

---

## 9. Notification Engine Endpoints

### 9.1 List Notifications
- **Endpoint**: `GET /notifications?page=1&limit=20&unreadOnly=false`
- **Headers**: `Authorization: Bearer <JWT>`

### 9.2 Mark Notification as Read
- **Endpoint**: `PATCH /notifications/:id/read`
- **Headers**: `Authorization: Bearer <JWT>`

### 9.3 Mark All Notifications as Read
- **Endpoint**: `POST /notifications/mark-all-read`
- **Headers**: `Authorization: Bearer <JWT>`

### 9.4 Delete Notification
- **Endpoint**: `DELETE /notifications/:id`
- **Headers**: `Authorization: Bearer <JWT>`

### 9.5 Clear All Notifications
- **Endpoint**: `DELETE /notifications`
- **Headers**: `Authorization: Bearer <JWT>`

---

## 10. Developer Analytics, Journal & Reports Endpoints

### 10.1 GitHub Analytics
- **Endpoint**: `GET /analytics/github`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Returns verified GitHub activity breakdown including total commits, weekly commits, monthly commits, repository activity distribution, programming language shares, pull request states, issue states, and cumulative repository growth over time.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalCommits": 164,
    "weeklyCommits": 28,
    "monthlyCommits": 94,
    "repositoryActivity": [
      { "repoName": "alexdeveloper/streakforge", "commitCount": 110, "percentage": 67.1 },
      { "repoName": "alexdeveloper/leetcode-solutions", "commitCount": 54, "percentage": 32.9 }
    ],
    "languages": [
      { "language": "TypeScript", "count": 120, "percentage": 73.2 },
      { "language": "Python", "count": 44, "percentage": 26.8 }
    ],
    "pullRequests": { "total": 24, "open": 2, "merged": 20, "closed": 2 },
    "issues": { "total": 12, "open": 3, "closed": 9 },
    "repositoryGrowth": [
      { "date": "2026-10-01", "commits": 12 },
      { "date": "2026-11-01", "commits": 164 }
    ],
    "activeRepositoriesCount": 2
  }
}
```

### 10.2 LeetCode Analytics (Strict Deduplication)
- **Endpoint**: `GET /analytics/leetcode`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Returns verified LeetCode solving progress. **Rule of truth**: Multiple accepted submissions for the same problem slug or question ID are strictly deduplicated into 1 unique problem solved.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalSubmissions": 76,
    "acceptedSubmissions": 58,
    "uniqueProblemsSolved": 54,
    "acceptanceRate": 76.3,
    "difficultyDistribution": { "Easy": 26, "Medium": 22, "Hard": 6 },
    "languageDistribution": [
      { "language": "TypeScript", "count": 40, "percentage": 69.0 }
    ],
    "topicDistribution": [
      { "topic": "Algorithms", "count": 32, "percentage": 59.3 }
    ],
    "submissionHistory": [],
    "avgSubmissionsPerSolved": 1.4,
    "problemSolvingConsistency": {
      "currentStreakDays": 8,
      "weeklyAverage": 13.5,
      "monthlyAverage": 36.0
    }
  }
}
```

### 10.3 Coding Analytics (Zero-Inference Duration)
- **Endpoint**: `GET /analytics/coding`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Returns verified local companion agent coding sessions. **Rule of truth**: Precise coding duration is never guessed or inferred from Git commit timestamps. When duration is not actively tracked by the desktop companion agent, `trackedDurationAvailable` is set to `false` and duration fields evaluate to `null`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "trackedDurationAvailable": false,
    "dailyCodingDurationMinutes": null,
    "weeklyCodingDurationMinutes": null,
    "activeCodingDays": 14,
    "repositoryActivity": [],
    "languageUsage": [],
    "sessionHistory": [],
    "durationNotice": "Precise coding duration is never inferred from Git commit timestamps. Only active duration measured by the StreakForge companion agent is shown."
  }
}
```

### 10.4 Get Daily Activity Journal
- **Endpoint**: `GET /analytics/journal?date=YYYY-MM-DD`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Aggregates the day's verified external records (commits list, PRs, LeetCode unique problems solved, repositories modified, sync ledger count) alongside isolated developer reflections.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "date": "2026-11-04",
    "notes": "Implemented Phase 7 analytics with strict problem deduplication.",
    "codingDurationMinutes": null,
    "durationTracked": false,
    "githubActivity": {
      "commitsCount": 4,
      "commits": [
        {
          "sha": "8f7d9a1",
          "message": "feat(analytics): add developer progress engine",
          "repo": "alexdeveloper/streakforge",
          "timestamp": "2026-11-04T12:30:00Z"
        }
      ],
      "prsCount": 1,
      "issuesCount": 0
    },
    "leetCodeActivity": {
      "acceptedCount": 2,
      "uniqueProblems": [
        {
          "questionId": "146",
          "questionTitle": "LRU Cache",
          "difficulty": "Medium",
          "language": "TypeScript"
        }
      ]
    },
    "repositoriesModified": ["alexdeveloper/streakforge"],
    "syncEventsCount": 6,
    "updatedAt": "2026-11-04T13:00:00Z"
  }
}
```

### 10.5 Update Daily Personal Notes
- **Endpoint**: `PUT /analytics/journal`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
```json
{
  "date": "2026-11-04",
  "notes": "Architecture review: Verified RFC 4180 CSV export compliance."
}
```
- **Description**: Upserts personal developer notes in an isolated MongoDB collection without altering verified external activity records or commit audit trails.

### 10.6 Generate Executive Developer Report
- **Endpoint**: `GET /analytics/reports?period=daily|weekly|monthly|quarterly|annual&date=YYYY-MM-DD`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Generates a consolidated progress report spanning the specified period, calculating calendar boundaries in the user's timezone, activity volume, consistency score, and daily breakdowns.
- **Response `200 OK`**: Returns `DeveloperReport` object with full breakdown and data freshness status.

### 10.7 Export Developer Report (CSV / JSON)
- **Endpoint**: `GET /analytics/reports/export?period=weekly&format=csv&date=YYYY-MM-DD`
- **Headers**: `Authorization: Bearer <JWT>`
- **Description**: Downloads report as RFC 4180 compliant CSV (with proper header headers `Content-Disposition: attachment; filename="streakforge-report-weekly-....csv"` and escaped strings) or structured JSON.

