# STREAKFORGE 3.0 — MASTER ARCHITECTURE & ENGINEERING SPECIFICATION

## Executive Overview
StreakForge 3.0 expands the platform from a synchronized streak and repository tracking utility into an **authentic developer growth and interview preparation ecosystem**. The core engineering objective is to maintain **zero fabrication**: every streak day, XP point, weakness assessment, and readiness metric is derived strictly from verified external telemetry (GitHub commits, LeetCode submissions, and Codeforces solves).

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Data Sources & Telemetry
        GH["GitHub API & Webhooks\n(Octokit + AES-256)"]
        LC["LeetCode GraphQL\n(Scraper & Sync Service)"]
        CF["Codeforces API\n(Official Public REST)"]
        EXT["Chrome Extension MV3\n(AST & DOM Observer)"]
    end

    subgraph Core Processing Engines
        INTEG["Streak Integrity & Anti-Manipulation\n(Verification Tiering: VERIFIED / IMPORTED)"]
        WEAK["DSA Weakness & Pattern Detector\n(Topic Mastery & Recommendation Model)"]
        PLAN["Personal Coding Planner\n(Daily Targets & Routines)"]
        SRS["Spaced Repetition Engine\n(SuperMemo-2 Algorithm)"]
        MOCK["Mock Interview Engine\n(Timed Sessions & Quality Scoring)"]
        VAULT["DSA Knowledge Vault\n(Markdown Notes & Problem Linking)"]
        GAME["XP, Levels & Achievements\n(Anti-Spam Capped Gamification)"]
        READY["Career Readiness Analyzer\n(Multivariate Scoring 0-100%)"]
    end

    subgraph Persistence Layer (MongoDB)
        U["Users & Accounts"]
        ACT["Activities & Submissions"]
        PROG["StudyProgress & Curricula"]
        NOTE["KnowledgeNotes"]
        GOAL["CodingGoals & Routines"]
        SOL["SolutionRecords & Approaches"]
        INT["MockInterviewSessions"]
        ACH["UserAchievements & XP"]
    end

    subgraph Application & Presentation Layer
        DASH["Unified 3.0 Dashboard"]
        NAV["5-Tier Navigation System\n(Overview, Learning, Productivity, Integrations, Profile)"]
        PUB["Public Developer Profile\n(/u/[username])"]
        BADGE["Edge-Cached SVG Badges\n(/api/v1/badge/streak.svg)"]
    end

    GH --> INTEG
    LC --> INTEG
    CF --> INTEG
    EXT --> INTEG

    INTEG --> WEAK
    INTEG --> SRS
    INTEG --> GAME
    INTEG --> READY
    INTEG --> ACT

    WEAK --> PLAN
    SRS --> PLAN
    MOCK --> READY
    VAULT --> SOL

    ACT --> DASH
    PROG --> DASH
    NOTE --> DASH
    GOAL --> DASH
    SOL --> DASH
    INT --> DASH
    ACH --> DASH

    DASH --> NAV
    U --> PUB
    ACT --> BADGE
```

---

## 2. Core Modules Specification

### Module A: Coding Consistency Intelligence
- Granular aggregation across **Daily, Weekly, Monthly, and Yearly** horizons.
- Time-series cadence analysis distinguishing active problem solving from trivial commits.
- **Consistency Score**: Normalized metric ($0-100$) factoring cadence variance, weekend retention, and streak momentum.

### Module B: DSA Weakness Detector & Recommendations
- Aggregates solve counts, accuracy rates, and SRS review failures across all major DSA topics.
- Topic status classification: `STRONG` (>=80%), `MODERATE` (50-79%), `WEAK` (<50%), or `CRITICAL_WEAK` (multiple SRS resets).
- High-signal problem recommendations algorithmically prioritizing weak topics and unmastered Blind 75 / NeetCode 150 problems.

### Module C: Personal Coding Planner
- Schema for daily target problems (e.g. 2 Mediums, 1 Easy) and revision allocation.
- Custom weekday study routines (e.g. Monday: Arrays & Sliding Window; Tuesday: Trees).
- Real-time planned vs completed progress bar.

### Module D: Multi-Platform Activity Tracker
- Integrates GitHub and LeetCode with **Codeforces** (using the official free public REST API `https://codeforces.com/api/user.info` and `user.status`).
- Unified chronological timeline with platform indicator pills (`[GitHub]`, `[LeetCode]`, `[Codeforces]`).

### Module E: Developer Public Profile (`/u/[username]`)
- Public, shareable profile route in Next.js.
- Exposes verified streak, longest streak, total solved, DSA topic distribution, badges, and achievements.
- Granular user privacy settings (public/private toggle, metric visibility controls).
- Strictly prevents exposure of private emails, tokens, or private repositories.

### Module F: XP, Developer Levels & Achievements
- Verified action rewards: +50 XP per accepted solve, +25 XP per SRS review, +10 XP per Git commit (daily cap of 50 XP to prevent spam), +100 XP per weekly streak milestone.
- Developer levels ($1-50+$) calculated transparently via $XP = 100 \times \text{level}^{1.5}$.
- 10 initial achievements: "First Blood", "7-Day Consistent", "30-Day Devotion", "Centurion (100 Solves)", "Array Specialist", "Tree Climber", "Graph Explorer", "SuperMemo Scholar", "Mock Ace", "Open Source Contributor".

### Module G: Solution Quality Analyzer & Multi-Approach Tracker
- Stores multiple approaches per problem (e.g., Approach 1: Brute Force $O(n^2)$, Approach 2: HashMap $O(n)$).
- Complexity estimation, approach trade-offs, and optimization notes.

### Module H: Mock Interview Practice Mode
- Timed coding simulations: Easy (20 min), Medium (40 min), Hard (60 min).
- Integrated problem timer, approach scratchpad, hints toggle, and session rating history.

### Module I: Personal DSA Knowledge Vault
- Markdown-enabled personal wiki for DSA patterns, problem notes, edge cases, and code templates.
- Filterable by tags (`#two-pointers`, `#bit-manipulation`, `#dp`) and linked to problem slugs.

### Module J: Weekly Developer Report
- Aggregates weekly output: problems solved, commits pushed, streak health, topic focus, and week-over-week growth delta.
- Exportable as clean Markdown and shareable summary card.

### Module K: Streak Integrity & Verification Layer
- Event classification: `VERIFIED` (cryptographically backed by commit SHA or LeetCode submission ID) vs `IMPORTED` (historical activity).
- Idempotent deduplication and empty commit rejection.

### Module L: Pattern Recognition Engine
- Tracks mastery across 16 canonical DSA patterns (Two Pointers, Sliding Window, Binary Search, Prefix Sum, Monotonic Stack, Graph BFS/DFS, Tree Traversal, Backtracking, Dynamic Programming, etc.).

### Module M: Career Readiness Dashboard
- Transparent 0-100% composite score:
  - Curriculum Coverage (Blind 75 / NeetCode 150): 35%
  - SRS Retention Rate: 20%
  - Problem-Solving Consistency: 20%
  - Mock Interview Accuracy & Speed: 15%
  - GitHub Repository Completeness: 10%
- Includes mandatory transparency disclaimer ("Score measures DSA & portfolio readiness; does not predict employer hiring").

---

## 3. Database Schema Extensions (MongoDB)

1. **`CodingGoal`**: Daily and weekly targets, routine schedules, and completion records.
2. **`KnowledgeNote`**: Markdown content, tags, linked problem slugs, and pinned status.
3. **`SolutionRecord`**: Problem slug, multiple approaches (name, time complexity, space complexity, code, trade-offs).
4. **`MockInterviewSession`**: Track, difficulty, problem list, duration seconds, score, and notes.
5. **`UserAchievement`**: Unlocked achievements, current developer level, and accumulated verified XP.
6. **`MultiPlatformProfile`**: Connected handles (Codeforces, LeetCode, GitHub) and cache timestamps.
7. **`User` (Extended)**: Public profile settings, bio, custom links, and gamification visibility toggles.

---

## 4. Phased Implementation Roadmap

- **Phase 1**: Database Schemas & Shared Domain Types.
- **Phase 2**: Backend Services & REST APIs (Analytics, Weakness, Planner, Vault, Solutions, Mock, Gamification, Multi-Platform, Reports, Public Profile).
- **Phase 3**: Frontend Navigation & Unified Dashboard (Restructuring into 5 logical categories).
- **Phase 4**: Frontend Module Views Implementation.
- **Phase 5**: Quality Assurance, Vitest Tests, Monorepo Typechecking, and Production Builds.
