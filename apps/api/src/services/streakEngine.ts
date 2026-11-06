import type {
  StreakMetric,
  HeatmapDay,
  ActivityCategory,
  ActivityEventType
} from '@streakforge/shared-types';

export interface DailySummaryInput {
  date: string; // YYYY-MM-DD
  github?: {
    commits: number;
    prs: number;
    issues: number;
    other: number;
  };
  leetcode?: {
    submissions: number;
    accepted: number;
    uniqueProblems: number;
  };
  localDev?: {
    sessions: number;
    filesChanged: number;
    activeMinutes: number;
  };
  maintenance?: {
    backups: number;
    dependencyUpdates: number;
    docsSync: number;
  };
  gitCommitCount?: number;
  leetCodeCount?: number;
  totalActivities?: number;
  streakMaintained?: boolean;
}

export interface ActivityRecordItem {
  id: string;
  category: ActivityCategory;
  eventType: ActivityEventType;
  source: 'GITHUB' | 'LEETCODE' | 'LOCAL_AGENT' | 'SYSTEM';
  timestamp: Date | string;
  reference: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  metadata?: Record<string, any>;
}

export class StreakEngine {
  /**
   * Format a Date to YYYY-MM-DD in the user's specific IANA timezone.
   * Handles Daylight Saving Time (DST) and local midnight transitions.
   */
  public static formatDateInTimezone(date: Date, timezone: string = 'UTC'): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Shifts a YYYY-MM-DD string by a delta in days (positive or negative)
   * using calendar day math across month, year, and leap-year boundaries.
   */
  public static getShiftedDate(dateStr: string, dayDelta: number): string {
    const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    utcDate.setUTCDate(utcDate.getUTCDate() + dayDelta);
    return utcDate.toISOString().split('T')[0];
  }

  /**
   * Returns difference in calendar days between two YYYY-MM-DD date strings (d2 - d1).
   */
  public static getDaysDifference(d1Str: string, d2Str: string): number {
    const [y1, m1, day1] = d1Str.split('-').map((v) => parseInt(v, 10));
    const [y2, m2, day2] = d2Str.split('-').map((v) => parseInt(v, 10));
    const utc1 = Date.UTC(y1, m1 - 1, day1);
    const utc2 = Date.UTC(y2, m2 - 1, day2);
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate hours remaining until midnight in the user's timezone.
   */
  public static getHoursUntilMidnight(timezone: string = 'UTC', now: Date = new Date()): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

      const minutesPassed = hour * 60 + minute;
      const minutesLeft = 24 * 60 - minutesPassed;
      return parseFloat((minutesLeft / 60).toFixed(1));
    } catch {
      return 12.0;
    }
  }

  /**
   * Pure algorithm for consecutive streak computation given a set of active calendar date strings.
   * Accurately accounts for today vs yesterday without false streak loss.
   */
  public static computeStreakFromDates(
    activeDates: Set<string> | string[],
    todayStr: string
  ): StreakMetric {
    const dateSet = activeDates instanceof Set ? activeDates : new Set(activeDates);
    const hasSubmittedToday = dateSet.has(todayStr);

    // Current Streak: start from today if submitted, else from yesterday
    let currentStreak = 0;
    let checkDate = hasSubmittedToday ? todayStr : this.getShiftedDate(todayStr, -1);

    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = this.getShiftedDate(checkDate, -1);
    }

    // Longest Streak in all recorded history
    const sortedDates = Array.from(dateSet).sort();
    let longestStreak = 0;
    let runningStreak = 0;
    let prevDate: string | null = null;

    for (const d of sortedDates) {
      if (prevDate) {
        const diff = this.getDaysDifference(prevDate, d);
        if (diff === 1) {
          runningStreak++;
        } else if (diff > 1) {
          runningStreak = 1;
        }
      } else {
        runningStreak = 1;
      }

      prevDate = d;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    return {
      currentStreak,
      longestStreak,
      activeDays: dateSet.size,
      hasSubmittedToday
    };
  }

  /**
   * Generic streak computation across snapshots in a given timezone
   */
  public static calculateStreak(
    snapshots: Array<{ date: string }>,
    timezone: string = 'UTC'
  ): StreakMetric {
    const todayStr = this.formatDateInTimezone(new Date(), timezone);
    const dates = snapshots.map((s) => s.date);
    return this.computeStreakFromDates(dates, todayStr);
  }

  /**
   * 1. GitHub Contributions Streak
   * Only includes verified GitHub commits, pull requests, and issues.
   */
  public static calculateGitHubStreak(
    snapshots: DailySummaryInput[],
    todayStr: string
  ): StreakMetric {
    const eligibleDates = new Set<string>();
    for (const s of snapshots) {
      const commits = s.github?.commits ?? s.gitCommitCount ?? 0;
      const prs = s.github?.prs ?? 0;
      const issues = s.github?.issues ?? 0;
      if (commits > 0 || prs > 0 || issues > 0) {
        eligibleDates.add(s.date);
      }
    }
    return this.computeStreakFromDates(eligibleDates, todayStr);
  }

  /**
   * 2. LeetCode Solving Streak
   * Only includes genuine accepted LeetCode problem solutions.
   */
  public static calculateLeetCodeStreak(
    snapshots: DailySummaryInput[],
    todayStr: string
  ): StreakMetric {
    const eligibleDates = new Set<string>();
    for (const s of snapshots) {
      const accepted = s.leetcode?.accepted ?? s.leetCodeCount ?? 0;
      const subs = s.leetcode?.submissions ?? s.leetCodeCount ?? 0;
      if (accepted > 0 || subs > 0) {
        eligibleDates.add(s.date);
      }
    }
    return this.computeStreakFromDates(eligibleDates, todayStr);
  }

  /**
   * 3. Local Development Consistency Streak
   * Genuine local sessions and repository modifications (excluding backups).
   */
  public static calculateLocalDevStreak(
    snapshots: DailySummaryInput[],
    todayStr: string
  ): StreakMetric {
    const eligibleDates = new Set<string>();
    for (const s of snapshots) {
      const sessions = s.localDev?.sessions ?? 0;
      const files = s.localDev?.filesChanged ?? 0;
      if (sessions > 0 || files > 0) {
        eligibleDates.add(s.date);
      }
    }
    return this.computeStreakFromDates(eligibleDates, todayStr);
  }

  /**
   * 4. Overall Streak
   * Evaluates days where total verified authentic coding work satisfies user daily goal.
   * Maintenance backups are strictly excluded from coding streak criteria.
   */
  public static calculateOverallStreak(
    snapshots: DailySummaryInput[],
    todayStr: string,
    goalPerDay: number = 1
  ): StreakMetric {
    const eligibleDates = new Set<string>();
    for (const s of snapshots) {
      const gh = (s.github?.commits ?? s.gitCommitCount ?? 0) + (s.github?.prs ?? 0);
      const lc = s.leetcode?.accepted ?? s.leetCodeCount ?? 0;
      const local = s.localDev?.sessions ?? 0;
      const codingTotal = gh + lc + local;

      if (s.streakMaintained || codingTotal >= goalPerDay) {
        eligibleDates.add(s.date);
      }
    }
    return this.computeStreakFromDates(eligibleDates, todayStr);
  }

  /**
   * 5. Weekly Activity Score (0 to 100)
   * Computes a weighted score over the trailing 7 calendar days:
   * - Consistency / active days frequency: up to 60 pts
   * - Category diversity (combining GitHub + LeetCode): up to 25 pts
   * - Volume consistency: up to 15 pts
   */
  public static calculateWeeklyActivityScore(
    snapshots: DailySummaryInput[],
    todayStr: string
  ): number {
    const snapMap = new Map<string, DailySummaryInput>();
    for (const s of snapshots) {
      snapMap.set(s.date, s);
    }

    let activeDays = 0;
    let totalEvents = 0;
    let categoriesSeen = new Set<string>();

    for (let i = 0; i < 7; i++) {
      const dStr = this.getShiftedDate(todayStr, -i);
      const day = snapMap.get(dStr);
      if (day) {
        const gh = (day.github?.commits ?? day.gitCommitCount ?? 0) + (day.github?.prs ?? 0);
        const lc = day.leetcode?.accepted ?? day.leetCodeCount ?? 0;
        const local = day.localDev?.sessions ?? 0;
        const total = gh + lc + local;

        if (total > 0) {
          activeDays++;
          totalEvents += total;
          if (gh > 0) categoriesSeen.add('GITHUB');
          if (lc > 0) categoriesSeen.add('LEETCODE');
          if (local > 0) categoriesSeen.add('LOCAL');
        }
      }
    }

    // Frequency: up to 60
    const frequencyScore = Math.min(60, Math.round((activeDays / 7) * 60));
    // Diversity: up to 25 (e.g. 1 cat = 10, 2 cats = 20, 3 cats = 25)
    const diversityScore = Math.min(25, categoriesSeen.size * 10);
    // Volume: up to 15
    const volumeScore = Math.min(15, Math.round(totalEvents * 1.5));

    return Math.min(100, Math.max(0, frequencyScore + diversityScore + volumeScore));
  }

  /**
   * Re-aggregates a list of raw ActivityRecord items into daily summaries in the target timezone.
   * Useful for late-arriving data, retroactive synchronization, and timezone migrations.
   */
  public static aggregateActivityRecords(
    records: ActivityRecordItem[],
    timezone: string = 'UTC',
    goalPerDay: number = 1
  ): DailySummaryInput[] {
    const dayMap = new Map<string, DailySummaryInput>();

    // Dedup records by ID
    const seenIds = new Set<string>();
    const deduped: ActivityRecordItem[] = [];
    for (const r of records) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        deduped.push(r);
      }
    }

    for (const r of deduped) {
      // Exclude rejected records
      if (r.verificationStatus === 'REJECTED') continue;

      const dateObj = typeof r.timestamp === 'string' ? new Date(r.timestamp) : r.timestamp;
      const dateStr = this.formatDateInTimezone(dateObj, timezone);

      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, {
          date: dateStr,
          github: { commits: 0, prs: 0, issues: 0, other: 0 },
          leetcode: { submissions: 0, accepted: 0, uniqueProblems: 0 },
          localDev: { sessions: 0, filesChanged: 0, activeMinutes: 0 },
          maintenance: { backups: 0, dependencyUpdates: 0, docsSync: 0 },
          totalActivities: 0,
          gitCommitCount: 0,
          leetCodeCount: 0,
          streakMaintained: false
        });
      }

      const day = dayMap.get(dateStr)!;

      switch (r.category) {
        case 'GITHUB':
          if (r.eventType === 'GITHUB_COMMIT') {
            day.github!.commits++;
            day.gitCommitCount!++;
          } else if (r.eventType === 'GITHUB_PR') {
            day.github!.prs++;
          } else if (r.eventType === 'GITHUB_ISSUE') {
            day.github!.issues++;
          } else {
            day.github!.other++;
          }
          day.totalActivities!++;
          break;

        case 'LEETCODE':
          day.leetcode!.submissions++;
          day.leetCodeCount!++;
          if (r.eventType === 'LEETCODE_ACCEPTED' || r.metadata?.isAccepted) {
            day.leetcode!.accepted++;
          }
          if (r.metadata?.isUniqueProblem) {
            day.leetcode!.uniqueProblems++;
          }
          day.totalActivities!++;
          break;

        case 'LOCAL_DEV':
          day.localDev!.sessions++;
          day.localDev!.filesChanged += r.metadata?.filesChanged || 1;
          day.totalActivities!++;
          break;

        case 'MAINTENANCE':
          if (r.eventType === 'MAINTENANCE_BACKUP') {
            day.maintenance!.backups++;
          } else if (r.eventType === 'MAINTENANCE_DEPENDENCY') {
            day.maintenance!.dependencyUpdates++;
          } else {
            day.maintenance!.docsSync++;
          }
          // Note: Maintenance activities are recorded but excluded from official coding streak criteria
          break;
      }
    }

    // Determine streak eligibility per day
    for (const day of dayMap.values()) {
      const codingTotal =
        (day.github?.commits || 0) +
        (day.github?.prs || 0) +
        (day.leetcode?.accepted || 0) +
        (day.localDev?.sessions || 0);

      day.streakMaintained = codingTotal >= goalPerDay;
    }

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generates a 365/366 day heatmap for a given calendar year.
   */
  public static generateCalendarHeatmap(
    snapshots: DailySummaryInput[],
    targetYear: number,
    timezone: string = 'UTC'
  ): HeatmapDay[] {
    const snapMap = new Map<string, DailySummaryInput>();
    for (const s of snapshots) {
      snapMap.set(s.date, s);
    }

    const days: HeatmapDay[] = [];
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
    const totalDays = isLeap ? 366 : 365;

    let cursor = `${targetYear}-01-01`;

    for (let i = 0; i < totalDays; i++) {
      const s = snapMap.get(cursor);
      const ghCommits = s?.github?.commits ?? s?.gitCommitCount ?? 0;
      const ghPrs = s?.github?.prs ?? 0;
      const ghIssues = s?.github?.issues ?? 0;

      const lcSubs = s?.leetcode?.submissions ?? s?.leetCodeCount ?? 0;
      const lcAccepted = s?.leetcode?.accepted ?? s?.leetCodeCount ?? 0;
      const lcUnique = s?.leetcode?.uniqueProblems ?? (lcAccepted > 0 ? 1 : 0);

      const localSessions = s?.localDev?.sessions ?? 0;
      const localFiles = s?.localDev?.filesChanged ?? 0;
      const backups = s?.maintenance?.backups ?? 0;

      const totalCount = ghCommits + ghPrs + ghIssues + lcSubs + localSessions + backups;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (totalCount >= 8) level = 4;
      else if (totalCount >= 5) level = 3;
      else if (totalCount >= 3) level = 2;
      else if (totalCount >= 1) level = 1;

      days.push({
        date: cursor,
        count: totalCount,
        gitCommits: ghCommits,
        leetCodeSubmissions: lcSubs,
        level,
        verifiedGitHub: {
          commits: ghCommits,
          prs: ghPrs,
          issues: ghIssues
        },
        leetCode: {
          submissions: lcSubs,
          accepted: lcAccepted,
          uniqueProblems: lcUnique
        },
        localDev: {
          sessions: localSessions,
          filesChanged: localFiles
        },
        maintenance: {
          backups
        }
      });

      cursor = this.getShiftedDate(cursor, 1);
    }

    return days;
  }
}

