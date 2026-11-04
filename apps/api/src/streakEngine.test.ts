import { describe, it, expect } from 'vitest';
import { StreakEngine, DailySummaryInput, ActivityRecordItem } from './services/streakEngine.js';

describe('Phase 5 — Contribution Tracker and Streak Engine', () => {
  describe('1. Single-day and Multi-day Streaks', () => {
    it('calculates a 1-day streak when activity is maintained today', () => {
      const todayStr = '2026-11-04';
      const summaries: DailySummaryInput[] = [
        {
          date: '2026-11-04',
          streakMaintained: true,
          github: { commits: 3, prs: 0, issues: 0, other: 0 }
        }
      ];

      const streak = StreakEngine.calculateOverallStreak(summaries, todayStr, 1);
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBe(1);
      expect(streak.hasSubmittedToday).toBe(true);
    });

    it('calculates a 5-day continuous multi-day streak', () => {
      const todayStr = '2026-11-05';
      const summaries: DailySummaryInput[] = [
        { date: '2026-11-01', streakMaintained: true },
        { date: '2026-11-02', streakMaintained: true },
        { date: '2026-11-03', streakMaintained: true },
        { date: '2026-11-04', streakMaintained: true },
        { date: '2026-11-05', streakMaintained: true }
      ];

      const streak = StreakEngine.calculateOverallStreak(summaries, todayStr, 1);
      expect(streak.currentStreak).toBe(5);
      expect(streak.longestStreak).toBe(5);
    });

    it('retains streak from yesterday when today is still in progress (not yet submitted)', () => {
      const todayStr = '2026-11-05';
      const summaries: DailySummaryInput[] = [
        { date: '2026-11-01', streakMaintained: true },
        { date: '2026-11-02', streakMaintained: true },
        { date: '2026-11-03', streakMaintained: true },
        { date: '2026-11-04', streakMaintained: true }
        // 2026-11-05 has not occurred yet
      ];

      const streak = StreakEngine.calculateOverallStreak(summaries, todayStr, 1);
      // Streak is 4 because yesterday was active
      expect(streak.currentStreak).toBe(4);
      expect(streak.hasSubmittedToday).toBe(false);
    });

    it('handles a missed day (broken streak: 3 days on, 1 day off, 2 days on)', () => {
      const todayStr = '2026-11-06';
      const summaries: DailySummaryInput[] = [
        { date: '2026-11-01', streakMaintained: true },
        { date: '2026-11-02', streakMaintained: true },
        { date: '2026-11-03', streakMaintained: true },
        // 2026-11-04 was missed!
        { date: '2026-11-05', streakMaintained: true },
        { date: '2026-11-06', streakMaintained: true }
      ];

      const streak = StreakEngine.calculateOverallStreak(summaries, todayStr, 1);
      expect(streak.currentStreak).toBe(2); // Current streak is 2
      expect(streak.longestStreak).toBe(3); // Longest was 3
    });
  });

  describe('2. Timezone Changes & Midnight Boundaries', () => {
    it('properly places events in the correct calendar day based on timezone', () => {
      // 2026-11-04 02:30:00 UTC
      const eventTime = new Date('2026-11-04T02:30:00.000Z');

      const utcDate = StreakEngine.formatDateInTimezone(eventTime, 'UTC');
      const nyDate = StreakEngine.formatDateInTimezone(eventTime, 'America/New_York'); // UTC-5: 2026-11-03 21:30:00
      const tokyoDate = StreakEngine.formatDateInTimezone(eventTime, 'Asia/Tokyo'); // UTC+9: 2026-11-04 11:30:00

      expect(utcDate).toBe('2026-11-04');
      expect(nyDate).toBe('2026-11-03');
      expect(tokyoDate).toBe('2026-11-04');
    });

    it('calculates remaining hours until midnight accurately', () => {
      // Test at fixed 20:00:00 in UTC (4 hours left)
      const testDate = new Date('2026-11-04T20:00:00.000Z');
      const hoursLeft = StreakEngine.getHoursUntilMidnight('UTC', testDate);
      expect(hoursLeft).toBe(4.0);
    });
  });

  describe('3. Month, Year, and Leap-Year Boundaries', () => {
    it('handles month boundary transitions (Jan 31 -> Feb 1)', () => {
      const shifted = StreakEngine.getShiftedDate('2026-01-31', 1);
      expect(shifted).toBe('2026-02-01');

      const diff = StreakEngine.getDaysDifference('2026-01-31', '2026-02-01');
      expect(diff).toBe(1);
    });

    it('handles leap year leap-day transition (Feb 28 -> Feb 29 -> Mar 1 in 2028)', () => {
      const feb28 = '2028-02-28';
      const feb29 = StreakEngine.getShiftedDate(feb28, 1);
      const mar01 = StreakEngine.getShiftedDate(feb29, 1);

      expect(feb29).toBe('2028-02-29');
      expect(mar01).toBe('2028-03-01');

      const leapDays = StreakEngine.generateCalendarHeatmap([], 2028, 'UTC');
      expect(leapDays.length).toBe(366);
    });

    it('handles year boundary transitions (Dec 31 -> Jan 1) maintaining continuous streaks', () => {
      const todayStr = '2027-01-02';
      const summaries: DailySummaryInput[] = [
        { date: '2026-12-30', streakMaintained: true },
        { date: '2026-12-31', streakMaintained: true },
        { date: '2027-01-01', streakMaintained: true },
        { date: '2027-01-02', streakMaintained: true }
      ];

      const streak = StreakEngine.calculateOverallStreak(summaries, todayStr, 1);
      expect(streak.currentStreak).toBe(4);
      expect(streak.longestStreak).toBe(4);
    });
  });

  describe('4. Daylight Saving Time (DST) Transitions', () => {
    it('correctly handles Spring Forward (23h day in March) and Fall Back (25h day in November)', () => {
      // US DST Spring forward: March 8, 2026
      const springEventBefore = new Date('2026-03-08T06:00:00.000Z'); // 1:00 AM EST
      const springEventAfter = new Date('2026-03-08T08:00:00.000Z'); // 4:00 AM EDT
      expect(StreakEngine.formatDateInTimezone(springEventBefore, 'America/New_York')).toBe('2026-03-08');
      expect(StreakEngine.formatDateInTimezone(springEventAfter, 'America/New_York')).toBe('2026-03-08');

      // US DST Fall back: November 1, 2026
      const fallEventBefore = new Date('2026-11-01T05:00:00.000Z'); // 1:00 AM EDT
      const fallEventAfter = new Date('2026-11-01T07:00:00.000Z'); // 2:00 AM EST
      expect(StreakEngine.formatDateInTimezone(fallEventBefore, 'America/New_York')).toBe('2026-11-01');
      expect(StreakEngine.formatDateInTimezone(fallEventAfter, 'America/New_York')).toBe('2026-11-01');
    });
  });

  describe('5. Duplicate & Late-Arriving Events', () => {
    it('deduplicates identical events ingested twice', () => {
      const records: ActivityRecordItem[] = [
        {
          id: 'evt-1',
          category: 'GITHUB',
          eventType: 'GITHUB_COMMIT',
          source: 'GITHUB',
          timestamp: '2026-11-04T10:00:00.000Z',
          reference: 'streakforge',
          verificationStatus: 'VERIFIED'
        },
        {
          id: 'evt-1', // Duplicate ID!
          category: 'GITHUB',
          eventType: 'GITHUB_COMMIT',
          source: 'GITHUB',
          timestamp: '2026-11-04T10:00:00.000Z',
          reference: 'streakforge',
          verificationStatus: 'VERIFIED'
        }
      ];

      const aggregated = StreakEngine.aggregateActivityRecords(records, 'UTC');
      expect(aggregated.length).toBe(1);
      expect(aggregated[0].github?.commits).toBe(1);
      expect(aggregated[0].totalActivities).toBe(1);
    });

    it('retroactively bridges a streak when late data arrives for a previously missing day', () => {
      const recordsBefore: ActivityRecordItem[] = [
        {
          id: 'e-1',
          category: 'GITHUB',
          eventType: 'GITHUB_COMMIT',
          source: 'GITHUB',
          timestamp: '2026-11-01T12:00:00.000Z',
          reference: 'repo',
          verificationStatus: 'VERIFIED'
        },
        {
          id: 'e-3',
          category: 'GITHUB',
          eventType: 'GITHUB_COMMIT',
          source: 'GITHUB',
          timestamp: '2026-11-03T12:00:00.000Z',
          reference: 'repo',
          verificationStatus: 'VERIFIED'
        }
      ];

      const initialSummaries = StreakEngine.aggregateActivityRecords(recordsBefore, 'UTC');
      const initialStreak = StreakEngine.calculateOverallStreak(initialSummaries, '2026-11-03', 1);
      expect(initialStreak.currentStreak).toBe(1); // 11-02 was missing!

      // Late event arrives for 2026-11-02
      const lateRecord: ActivityRecordItem = {
        id: 'e-2',
        category: 'LEETCODE',
        eventType: 'LEETCODE_ACCEPTED',
        source: 'LEETCODE',
        timestamp: '2026-11-02T15:00:00.000Z',
        reference: 'two-sum',
        verificationStatus: 'VERIFIED',
        metadata: { isAccepted: true }
      };

      const updatedSummaries = StreakEngine.aggregateActivityRecords(
        [...recordsBefore, lateRecord],
        'UTC'
      );
      const bridgedStreak = StreakEngine.calculateOverallStreak(updatedSummaries, '2026-11-03', 1);

      // Now bridged into a 3-day continuous streak
      expect(bridgedStreak.currentStreak).toBe(3);
      expect(bridgedStreak.longestStreak).toBe(3);
    });
  });

  describe('6. Activity Category Separation & Integrity', () => {
    it('maintains separated streaks: LeetCode does NOT inflate GitHub streak', () => {
      const todayStr = '2026-11-03';
      const summaries: DailySummaryInput[] = [
        // Day 1: GitHub commit
        {
          date: '2026-11-01',
          github: { commits: 2, prs: 0, issues: 0, other: 0 },
          leetcode: { submissions: 0, accepted: 0, uniqueProblems: 0 }
        },
        // Day 2: LeetCode only (no GitHub commits)
        {
          date: '2026-11-02',
          github: { commits: 0, prs: 0, issues: 0, other: 0 },
          leetcode: { submissions: 2, accepted: 2, uniqueProblems: 2 }
        },
        // Day 3: LeetCode only
        {
          date: '2026-11-03',
          github: { commits: 0, prs: 0, issues: 0, other: 0 },
          leetcode: { submissions: 1, accepted: 1, uniqueProblems: 1 }
        }
      ];

      const ghStreak = StreakEngine.calculateGitHubStreak(summaries, todayStr);
      const lcStreak = StreakEngine.calculateLeetCodeStreak(summaries, todayStr);

      // GitHub streak was broken after 11-01 because 11-02 had no GitHub commits
      expect(ghStreak.currentStreak).toBe(0);
      expect(ghStreak.longestStreak).toBe(1);

      // LeetCode streak is 2 days (11-02 and 11-03)
      expect(lcStreak.currentStreak).toBe(2);
      expect(lcStreak.longestStreak).toBe(2);
    });

    it('strictly excludes maintenance backups from coding streak counts', () => {
      const records: ActivityRecordItem[] = [
        {
          id: 'bk-1',
          category: 'MAINTENANCE',
          eventType: 'MAINTENANCE_BACKUP',
          source: 'LOCAL_AGENT',
          timestamp: '2026-11-04T12:00:00.000Z',
          reference: 'repo-backup',
          verificationStatus: 'VERIFIED',
          metadata: { isBackup: true }
        }
      ];

      const summaries = StreakEngine.aggregateActivityRecords(records, 'UTC', 1);
      expect(summaries[0].maintenance?.backups).toBe(1);
      // Coding streakMaintained must be false because backups are maintenance only
      expect(summaries[0].streakMaintained).toBe(false);

      const streak = StreakEngine.calculateOverallStreak(summaries, '2026-11-04', 1);
      expect(streak.currentStreak).toBe(0);
    });
  });

  describe('7. Weekly Activity Score (0-100)', () => {
    it('calculates weighted score based on active frequency and category breadth', () => {
      const todayStr = '2026-11-07';
      // High activity across 5 days combining GitHub and LeetCode
      const summaries: DailySummaryInput[] = [
        { date: '2026-11-01', github: { commits: 2, prs: 0, issues: 0, other: 0 } },
        { date: '2026-11-02', leetcode: { submissions: 1, accepted: 1, uniqueProblems: 1 } },
        { date: '2026-11-03', github: { commits: 3, prs: 1, issues: 0, other: 0 } },
        { date: '2026-11-05', localDev: { sessions: 2, filesChanged: 4, activeMinutes: 60 } },
        { date: '2026-11-07', github: { commits: 1, prs: 0, issues: 0, other: 0 }, leetcode: { submissions: 1, accepted: 1, uniqueProblems: 1 } }
      ];

      const score = StreakEngine.calculateWeeklyActivityScore(summaries, todayStr);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns 0 for a completely inactive 7-day period', () => {
      const score = StreakEngine.calculateWeeklyActivityScore([], '2026-11-07');
      expect(score).toBe(0);
    });
  });
});
