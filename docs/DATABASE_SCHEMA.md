# StreakForge Database Schema Specification

## 1. Overview
The StreakForge persistence layer is backed by MongoDB using Mongoose. All models enforce strict schema validation, automatic timestamps (`createdAt`, `updatedAt`), and specialized indexes for high-throughput lookup and analytics.

---

## 2. Collections & Schemas

### 2.1 `users` Collection
Represents developer profiles, preferences, and timezone configurations.

```typescript
interface IUser {
  _id: Types.ObjectId;
  githubId: string;                 // GitHub User ID (unique index)
  username: string;                 // GitHub username
  name: string;
  email: string;                    // Primary email address (unique index)
  avatarUrl: string;
  timezone: string;                 // e.g. "America/New_York", "Asia/Kolkata"
  streakGoalPerDay: number;         // Default: 1 (min activities required)
  notificationPreferences: {
    inApp: boolean;
    email: boolean;
    streakWarningHoursBefore: number; // e.g., 3 hours before midnight
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ githubId: 1 }` (unique)
- `{ email: 1 }` (unique)
- `{ username: 1 }`

---

### 2.2 `accounts` Collection
Stores linked authentication credentials, notably OAuth access tokens encrypted using AES-256-GCM.

```typescript
interface IAccount {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Ref: User
  provider: 'github';
  providerAccountId: string;
  accessTokenEncrypted: string;     // AES-256-GCM encrypted string
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  scopes: string[];                 // e.g. ["repo", "read:user", "user:email"]
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ userId: 1, provider: 1 }` (unique compound)

---

### 2.3 `repository_connections` Collection
Tracks developer repositories designated for LeetCode solution exports and commit tracking.

```typescript
interface IRepositoryConnection {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Ref: User
  githubRepoId: number;
  repoFullName: string;             // e.g. "octocat/leetcode-solutions"
  defaultBranch: string;            // e.g. "main"
  solutionPathPattern: string;      // default: "solutions/{difficulty}/{id}-{slug}"
  isPrivate: boolean;
  isTargetForLeetCode: boolean;     // Flag designating active export target
  autoCommitEnabled: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ userId: 1, repoFullName: 1 }` (unique compound)
- `{ userId: 1, isTargetForLeetCode: 1 }`

---

### 2.4 `leetcode_submissions` Collection
Stores authentic submissions imported via the Chrome Extension.

```typescript
interface ILeetCodeSubmission {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Ref: User
  submissionId: string;             // LeetCode's submission ID (unique per user)
  questionId: string;               // LeetCode problem ID (e.g. "1")
  questionTitle: string;            // e.g. "Two Sum"
  questionSlug: string;             // e.g. "two-sum"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: string;                 // e.g. "python3", "cpp", "typescript"
  code: string;                     // Actual submitted solution code
  runtimeMs: number;                // e.g. 45
  runtimePercentile: number;        // e.g. 88.5
  memoryBytes: number;              // Memory used in bytes
  memoryPercentile: number;        // e.g. 74.2
  status: 'Accepted';
  submittedAt: Date;                // Original platform submission time
  
  // Export status
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';
  githubCommitSha?: string;
  githubCommitUrl?: string;
  filePath?: string;
  syncErrorMessage?: string;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ userId: 1, submissionId: 1 }` (unique compound)
- `{ userId: 1, submittedAt: -1 }`
- `{ userId: 1, syncStatus: 1 }`
- `{ questionSlug: 1, language: 1 }`

---

### 2.5 `local_agent_instances` Collection
Registers developer machines running the StreakForge Desktop Agent.

```typescript
interface ILocalAgentInstance {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Ref: User
  agentId: string;                  // UUID generated during pairing
  name: string;                     // Friendly name e.g. "MacBook Pro M2"
  hostname: string;
  os: string;                       // e.g. "darwin", "win32", "linux"
  agentVersion: string;
  apiKeyHash: string;               // SHA-256 hash of issued agent API key
  status: 'ONLINE' | 'OFFLINE' | 'PAUSED';
  lastHeartbeatAt: Date;
  watchedPaths: string[];           // List of local directory paths
  rules: {
    idleAutoCommitMinutes: number;  // 0 = disabled, e.g. 15
    autoPushOnCommit: boolean;
    allowedBranches: string[];      // e.g. ["main", "dev", "feature/*"]
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ agentId: 1 }` (unique)
- `{ userId: 1, status: 1 }`
- `{ apiKeyHash: 1 }` (unique)

---

### 2.6 `audit_logs` Collection
Immutable ledger recording all automated and manual system operations.

```typescript
interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Ref: User
  component: 'API' | 'EXTENSION' | 'AGENT' | 'WEB';
  action: string;                   // e.g. "LEETCODE_EXPORT", "GIT_AUTO_COMMIT", "OAUTH_LOGIN"
  status: 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO';
  description: string;
  metadata: Record<string, unknown>; // Payload details, commit SHAs, file names
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
```

**Indexes**:
- `{ userId: 1, timestamp: -1 }`
- `{ component: 1, status: 1 }`
- `{ action: 1 }`

---

### 2.7 `daily_activity_snapshots` Collection
Pre-aggregated daily activity data optimized for rendering calendar heatmaps and calculating streaks.

```typescript
interface IDailyActivitySnapshot {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Ref: User
  date: string;                     // "YYYY-MM-DD" in user's timezone
  gitCommitCount: number;
  leetCodeCount: number;
  totalActivities: number;
  languagesUsed: string[];
  streakMaintained: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ userId: 1, date: 1 }` (unique compound)
- `{ userId: 1, streakMaintained: 1 }`

