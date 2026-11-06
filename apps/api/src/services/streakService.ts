import { Types } from 'mongoose';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { User } from '../models/User.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { StreakEngine, DailySummaryInput } from './streakEngine.js';
import type {
  AnalyticsOverview,
  HeatmapDay,
  ActivityCategory,
  ActivityEventType
} from '@streakforge/shared-types';

/**
 * Format a Date to YYYY-MM-DD in the given IANA timezone
 */
export function getDateStringInTimezone(date: Date, timezone: string = 'UTC'): string {
  return StreakEngine.formatDateInTimezone(date, timezone);
}

/**
 * Calculate hours remaining until midnight in the given timezone
 */
export function getHoursUntilMidnight(timezone: string = 'UTC', now: Date = new Date()): number {
  return StreakEngine.getHoursUntilMidnight(timezone, now);
}

export interface RecordActivityInput {
  userId: string | Types.ObjectId;
  category: ActivityCategory;
  eventType: ActivityEventType;
  source: 'GITHUB' | 'LEETCODE' | 'LOCAL_AGENT' | 'SYSTEM';
  reference: string;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  metadata?: Record<string, any>;
  timestamp?: Date;
  eventId?: string;
}

/**
 * Record a granular, auditable activity event into the immutable ledger
 * and update the daily activity snapshot with category-separated stats.
 */
export async function recordActivityEvent(input: RecordActivityInput): Promise<void> {
  const user = await User.findById(input.userId);
  const tz = user?.timezone || 'UTC';
  const timestamp = input.timestamp || new Date();
  const dateStr = StreakEngine.formatDateInTimezone(timestamp, tz);
  const goal = user?.streakGoalPerDay || 1;

  // 1. Generate idempotent event ID
  const eventId =
    input.eventId ||
    `${input.userId.toString()}:${input.source}:${input.eventType}:${input.reference}:${timestamp.getTime()}`;

  // 2. Persist ActivityRecord (idempotent upsert)
  const existingRecord = await ActivityRecord.findOne({
    userId: new Types.ObjectId(input.userId.toString()),
    id: eventId
  });

  if (existingRecord) {
    return; // Already ingested, ignore duplicate
  }

  await ActivityRecord.create({
    id: eventId,
    userId: new Types.ObjectId(input.userId.toString()),
    category: input.category,
    eventType: input.eventType,
    source: input.source,
    timestamp,
    date: dateStr,
    reference: input.reference,
    verificationStatus: input.verificationStatus || 'VERIFIED',
    metadata: input.metadata || {}
  });

  // 3. Update DailyActivitySnapshot
  const incFields: Record<string, number> = {};

  if (input.category === 'GITHUB') {
    if (input.eventType === 'GITHUB_COMMIT') {
      incFields['github.commits'] = 1;
      incFields['gitCommitCount'] = 1;
    } else if (input.eventType === 'GITHUB_PR') {
      incFields['github.prs'] = 1;
    } else if (input.eventType === 'GITHUB_ISSUE') {
      incFields['github.issues'] = 1;
    } else {
      incFields['github.other'] = 1;
    }
    incFields['totalActivities'] = 1;
  } else if (input.category === 'LEETCODE') {
    incFields['leetcode.submissions'] = 1;
    incFields['leetCodeCount'] = 1;
    if (input.eventType === 'LEETCODE_ACCEPTED' || input.metadata?.isAccepted) {
      incFields['leetcode.accepted'] = 1;
    }
    if (input.metadata?.isUniqueProblem) {
      incFields['leetcode.uniqueProblems'] = 1;
    }
    incFields['totalActivities'] = 1;
  } else if (input.category === 'LOCAL_DEV') {
    incFields['localDev.sessions'] = 1;
    incFields['localDev.filesChanged'] = input.metadata?.filesChanged || 1;
    incFields['totalActivities'] = 1;
  } else if (input.category === 'MAINTENANCE') {
    if (input.eventType === 'MAINTENANCE_BACKUP') {
      incFields['maintenance.backups'] = 1;
    } else if (input.eventType === 'MAINTENANCE_DEPENDENCY') {
      incFields['maintenance.dependencyUpdates'] = 1;
    } else {
      incFields['maintenance.docsSync'] = 1;
    }
    // Maintenance excluded from coding streak criteria
  }

  const snapshot = await DailyActivitySnapshot.findOneAndUpdate(
    { userId: new Types.ObjectId(input.userId.toString()), date: dateStr },
    {
      $inc: incFields,
      ...(input.metadata?.language ? { $addToSet: { languagesUsed: input.metadata.language } } : {})
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Update streak eligibility flags
  const ghTotal = (snapshot.github?.commits || 0) + (snapshot.github?.prs || 0) + (snapshot.github?.issues || 0);
  const lcAccepted = snapshot.leetcode?.accepted || snapshot.leetCodeCount || 0;
  const localSessions = snapshot.localDev?.sessions || 0;
  const codingTotal = ghTotal + lcAccepted + localSessions;

  snapshot.githubStreakEligible = ghTotal > 0;
  snapshot.leetCodeStreakEligible = lcAccepted > 0;
  snapshot.localDevStreakEligible = localSessions > 0;
  snapshot.overallStreakEligible = codingTotal >= goal;
  snapshot.streakMaintained = codingTotal >= goal;

  await snapshot.save();
}

/**
 * Backward-compatible helper for recording daily activity
 */
export async function recordDailyActivity(
  userId: string | Types.ObjectId,
  type: 'LEETCODE' | 'GIT_COMMIT',
  language?: string,
  activityDate: Date = new Date()
): Promise<void> {
  const category: ActivityCategory = type === 'LEETCODE' ? 'LEETCODE' : 'GITHUB';
  const eventType: ActivityEventType = type === 'LEETCODE' ? 'LEETCODE_ACCEPTED' : 'GITHUB_COMMIT';

  await recordActivityEvent({
    userId,
    category,
    eventType,
    source: type === 'LEETCODE' ? 'LEETCODE' : 'GITHUB',
    reference: type === 'LEETCODE' ? 'leetcode-submission' : 'git-commit',
    metadata: { language, isAccepted: true },
    timestamp: activityDate
  });
}

/**
 * Compute current streak, longest streak, category streaks, and consistency overview
 */
export async function getStreakOverview(
  userId: string | Types.ObjectId
): Promise<AnalyticsOverview> {
  const user = await User.findById(userId);
  const tz = user?.timezone || 'UTC';
  const todayStr = StreakEngine.formatDateInTimezone(new Date(), tz);
  const goal = user?.streakGoalPerDay || 1;

  const snapshots = await DailyActivitySnapshot.find({
    userId: new Types.ObjectId(userId.toString())
  }).sort({ date: -1 });

  // Map to DailySummaryInput
  const summaries: DailySummaryInput[] = snapshots.map((s) => ({
    date: s.date,
    github: s.github,
    leetcode: s.leetcode,
    localDev: s.localDev,
    maintenance: s.maintenance,
    gitCommitCount: s.gitCommitCount,
    leetCodeCount: s.leetCodeCount,
    totalActivities: s.totalActivities,
    streakMaintained: s.streakMaintained || s.overallStreakEligible
  }));

  // Separate streak calculations
  const overallStreak = StreakEngine.calculateOverallStreak(summaries, todayStr, goal);
  const githubStreak = StreakEngine.calculateGitHubStreak(summaries, todayStr);
  const leetCodeStreak = StreakEngine.calculateLeetCodeStreak(summaries, todayStr);
  const localDevStreak = StreakEngine.calculateLocalDevStreak(summaries, todayStr);
  const weeklyActivityScore = StreakEngine.calculateWeeklyActivityScore(summaries, todayStr);

  // Today activity checks
  let todayCommitCount = 0;
  let todayLeetCodeCount = 0;
  let totalGitCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;
  let totalLeetCodeSubmissions = 0;
  let totalLeetCodeAccepted = 0;
  let totalUniqueProblems = 0;
  let totalLocalSessions = 0;
  let totalBackups = 0;

  for (const s of snapshots) {
    const ghCommits = s.github?.commits ?? s.gitCommitCount ?? 0;
    const lcSubs = s.leetcode?.submissions ?? s.leetCodeCount ?? 0;

    totalGitCommits += ghCommits;
    totalPRs += s.github?.prs ?? 0;
    totalIssues += s.github?.issues ?? 0;
    totalLeetCodeSubmissions += lcSubs;
    totalLeetCodeAccepted += s.leetcode?.accepted ?? lcSubs;
    totalUniqueProblems += s.leetcode?.uniqueProblems ?? (s.leetcode?.accepted ? 1 : 0);
    totalLocalSessions += s.localDev?.sessions ?? 0;
    totalBackups += s.maintenance?.backups ?? 0;

    if (s.date === todayStr) {
      todayCommitCount = ghCommits;
      todayLeetCodeCount = s.leetcode?.accepted ?? lcSubs;
    }
  }

  // Difficulty distribution from authentic LeetCode stats, with fallback to exported solutions
  const submissions = await LeetCodeSubmission.find({
    userId: new Types.ObjectId(userId.toString()),
    status: 'Accepted'
  });

  const diffCount = {
    Easy: user?.leetcodeStats?.easySolved ?? 0,
    Medium: user?.leetcodeStats?.mediumSolved ?? 0,
    Hard: user?.leetcodeStats?.hardSolved ?? 0
  };

  if (diffCount.Easy === 0 && diffCount.Medium === 0 && diffCount.Hard === 0) {
    for (const sub of submissions) {
      if (sub.difficulty in diffCount) {
        diffCount[sub.difficulty as keyof typeof diffCount]++;
      }
    }
  }

  const authenticTotalSolved =
    user?.leetcodeStats?.totalSolved ?? (submissions.length > 0 ? submissions.length : totalLeetCodeAccepted);

  // Trailing 7 days consistency percent
  const snapMap = new Map<string, boolean>();
  for (const s of summaries) {
    snapMap.set(s.date, s.streakMaintained || false);
  }

  let activeDaysLast7 = 0;
  for (let i = 0; i < 7; i++) {
    const dStr = StreakEngine.getShiftedDate(todayStr, -i);
    if (snapMap.get(dStr)) {
      activeDaysLast7++;
    }
  }
  const weeklyConsistency = Math.round((activeDaysLast7 / 7) * 100);

  return {
    currentStreak: overallStreak.currentStreak,
    longestStreak: overallStreak.longestStreak,
    hasSubmittedToday: overallStreak.hasSubmittedToday || false,
    todayCommitCount,
    todayLeetCodeCount,
    weeklyConsistencyPercent: weeklyConsistency,
    weeklyActivityScore,
    streakDeadlineHoursLeft: StreakEngine.getHoursUntilMidnight(tz),
    totalLeetCodeSolved: authenticTotalSolved,
    totalGitCommitsTracked: totalGitCommits,
    difficultyDistribution: diffCount,
    githubStreak,
    leetCodeStreak,
    localDevStreak,
    breakdown: {
      githubCommits: totalGitCommits,
      githubPRs: totalPRs,
      githubIssues: totalIssues,
      leetCodeTotalSubmissions: user?.leetcodeStats?.totalSubmissions ?? totalLeetCodeSubmissions,
      leetCodeAccepted: authenticTotalSolved,
      leetCodeUniqueProblems: authenticTotalSolved,
      localSessions: totalLocalSessions,
      maintenanceBackups: totalBackups
    }
  };
}

/**
 * Generate calendar heatmap data for the target year (365/366 days)
 */
export async function getHeatmapData(
  userId: string | Types.ObjectId,
  year?: number
): Promise<HeatmapDay[]> {
  const user = await User.findById(userId);
  const tz = user?.timezone || 'UTC';
  const targetYear = year || new Date().getFullYear();

  const snapshots = await DailyActivitySnapshot.find({
    userId: new Types.ObjectId(userId.toString())
  });

  const summaries: DailySummaryInput[] = snapshots.map((s) => ({
    date: s.date,
    github: s.github,
    leetcode: s.leetcode,
    localDev: s.localDev,
    maintenance: s.maintenance,
    gitCommitCount: s.gitCommitCount,
    leetCodeCount: s.leetCodeCount,
    totalActivities: s.totalActivities,
    streakMaintained: s.streakMaintained
  }));

  return StreakEngine.generateCalendarHeatmap(summaries, targetYear, tz);
}

/**
 * Fetch granular underlying ActivityRecord items for a specific calendar date
 */
export async function getDayDetails(
  userId: string | Types.ObjectId,
  dateStr: string
) {
  const records = await ActivityRecord.find({
    userId: new Types.ObjectId(userId.toString()),
    date: dateStr
  }).sort({ timestamp: -1 });

  return records;
}

/**
 * Recalculate historical streaks and daily snapshots from raw ActivityRecords
 * (e.g. after timezone changes or late retroactive syncs)
 */
export async function recalculateHistoricalStreaks(
  userId: string | Types.ObjectId,
  newTimezone?: string
): Promise<{ message: string; daysProcessed: number }> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (newTimezone) {
    user.timezone = newTimezone;
    await user.save();
  }

  const tz = user.timezone || 'UTC';
  const records = await ActivityRecord.find({
    userId: new Types.ObjectId(userId.toString())
  });

  const aggregated = StreakEngine.aggregateActivityRecords(
    records.map((r) => ({
      id: r.id,
      category: r.category,
      eventType: r.eventType,
      source: r.source,
      timestamp: r.timestamp,
      reference: r.reference,
      verificationStatus: r.verificationStatus,
      metadata: r.metadata
    })),
    tz,
    user.streakGoalPerDay || 1
  );

  // Clear and rewrite snapshots
  await DailyActivitySnapshot.deleteMany({
    userId: new Types.ObjectId(userId.toString())
  });

  for (const day of aggregated) {
    await DailyActivitySnapshot.create({
      userId: new Types.ObjectId(userId.toString()),
      date: day.date,
      github: day.github,
      leetcode: day.leetcode,
      localDev: day.localDev,
      maintenance: day.maintenance,
      githubStreakEligible: (day.github?.commits || 0) > 0 || (day.github?.prs || 0) > 0,
      leetCodeStreakEligible: (day.leetcode?.accepted || 0) > 0,
      localDevStreakEligible: (day.localDev?.sessions || 0) > 0,
      overallStreakEligible: day.streakMaintained,
      gitCommitCount: day.github?.commits || 0,
      leetCodeCount: day.leetcode?.accepted || 0,
      totalActivities: day.totalActivities || 0,
      streakMaintained: day.streakMaintained
    });
  }

  return {
    message: `Recalculated activity snapshots for ${aggregated.length} day(s) in timezone ${tz}`,
    daysProcessed: aggregated.length
  };
}
