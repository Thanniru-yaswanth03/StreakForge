import { Types } from 'mongoose';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import { User } from '../models/User.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import type { AnalyticsOverview, HeatmapDay } from '@streakforge/shared-types';

/**
 * Format a Date to YYYY-MM-DD in the given IANA timezone
 */
export function getDateStringInTimezone(date: Date, timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date); // Formats as YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Calculate hours remaining until midnight in the given timezone
 */
export function getHoursUntilMidnight(timezone: string = 'UTC'): number {
  try {
    const now = new Date();
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
 * Record a genuine activity (LeetCode solve or Git commit) into the daily snapshot
 */
export async function recordDailyActivity(
  userId: string | Types.ObjectId,
  type: 'LEETCODE' | 'GIT_COMMIT',
  language?: string,
  activityDate: Date = new Date()
): Promise<void> {
  const user = await User.findById(userId);
  const tz = user?.timezone || 'UTC';
  const dateStr = getDateStringInTimezone(activityDate, tz);
  const goal = user?.streakGoalPerDay || 1;

  const snapshot = await DailyActivitySnapshot.findOneAndUpdate(
    { userId: new Types.ObjectId(userId.toString()), date: dateStr },
    {
      $inc: {
        gitCommitCount: type === 'GIT_COMMIT' ? 1 : 0,
        leetCodeCount: type === 'LEETCODE' ? 1 : 0,
        totalActivities: 1
      },
      ...(language ? { $addToSet: { languagesUsed: language } } : {})
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (snapshot.totalActivities >= goal && !snapshot.streakMaintained) {
    snapshot.streakMaintained = true;
    await snapshot.save();
  }
}

/**
 * Compute current streak, longest streak, and consistency overview
 */
export async function getStreakOverview(userId: string | Types.ObjectId): Promise<AnalyticsOverview> {
  const user = await User.findById(userId);
  const tz = user?.timezone || 'UTC';
  const todayStr = getDateStringInTimezone(new Date(), tz);

  const snapshots = await DailyActivitySnapshot.find({
    userId: new Types.ObjectId(userId.toString())
  }).sort({ date: -1 });

  const snapshotMap = new Map<string, boolean>();
  let totalGitCommits = 0;
  let todayCommitCount = 0;
  let todayLeetCodeCount = 0;

  for (const s of snapshots) {
    snapshotMap.set(s.date, s.streakMaintained);
    totalGitCommits += s.gitCommitCount;
    if (s.date === todayStr) {
      todayCommitCount = s.gitCommitCount;
      todayLeetCodeCount = s.leetCodeCount;
    }
  }

  const hasSubmittedToday = snapshotMap.get(todayStr) || false;

  // Calculate current streak
  let currentStreak = 0;
  const cursorDate = new Date();

  // If today hasn't been completed yet, check if yesterday was completed
  if (!hasSubmittedToday) {
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  while (true) {
    const curStr = getDateStringInTimezone(cursorDate, tz);
    if (snapshotMap.get(curStr)) {
      currentStreak++;
      cursorDate.setDate(cursorDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak in history
  let longestStreak = 0;
  let runningStreak = 0;

  const sortedAscending = [...snapshots].reverse();
  let prevDate: Date | null = null;

  for (const snap of sortedAscending) {
    if (snap.streakMaintained) {
      const snapDate = new Date(snap.date + 'T00:00:00Z');
      if (prevDate) {
        const diffDays = Math.round(
          (snapDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          runningStreak++;
        } else {
          runningStreak = 1;
        }
      } else {
        runningStreak = 1;
      }
      prevDate = snapDate;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Difficulty distribution
  const submissions = await LeetCodeSubmission.find({
    userId: new Types.ObjectId(userId.toString()),
    status: 'Accepted'
  });

  const diffCount = { Easy: 0, Medium: 0, Hard: 0 };
  for (const sub of submissions) {
    if (sub.difficulty in diffCount) {
      diffCount[sub.difficulty]++;
    }
  }

  // Weekly consistency (last 7 days)
  let activeDaysLast7 = 0;
  const weekCursor = new Date();
  for (let i = 0; i < 7; i++) {
    const dStr = getDateStringInTimezone(weekCursor, tz);
    if (snapshotMap.get(dStr)) {
      activeDaysLast7++;
    }
    weekCursor.setDate(weekCursor.getDate() - 1);
  }
  const weeklyConsistency = Math.round((activeDaysLast7 / 7) * 100);

  return {
    currentStreak,
    longestStreak,
    hasSubmittedToday,
    todayCommitCount,
    todayLeetCodeCount,
    weeklyConsistencyPercent: weeklyConsistency,
    streakDeadlineHoursLeft: getHoursUntilMidnight(tz),
    totalLeetCodeSolved: submissions.length,
    totalGitCommitsTracked: totalGitCommits,
    difficultyDistribution: diffCount
  };
}

/**
 * Generate calendar heatmap data for the past 365 days
 */
export async function getHeatmapData(
  userId: string | Types.ObjectId,
  year?: number
): Promise<HeatmapDay[]> {
  const user = await User.findById(userId);
  const tz = user?.timezone || 'UTC';

  const snapshots = await DailyActivitySnapshot.find({
    userId: new Types.ObjectId(userId.toString())
  });

  const snapshotMap = new Map<string, { total: number; commits: number; leetcode: number }>();
  for (const s of snapshots) {
    snapshotMap.set(s.date, {
      total: s.totalActivities,
      commits: s.gitCommitCount,
      leetcode: s.leetCodeCount
    });
  }

  const days: HeatmapDay[] = [];
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31);

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dStr = getDateStringInTimezone(cursor, tz);
    const act = snapshotMap.get(dStr) || { total: 0, commits: 0, leetcode: 0 };

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (act.total >= 8) level = 4;
    else if (act.total >= 5) level = 3;
    else if (act.total >= 3) level = 2;
    else if (act.total >= 1) level = 1;

    days.push({
      date: dStr,
      count: act.total,
      gitCommits: act.commits,
      leetCodeSubmissions: act.leetcode,
      level
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

