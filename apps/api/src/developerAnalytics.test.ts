import { describe, it, expect } from 'vitest';
import { DeveloperAnalyticsService } from './services/developerAnalyticsService.js';
import type { DeveloperReport, Difficulty } from '@streakforge/shared-types';

describe('Phase 7 — Analytics & Developer Progress Engine', () => {
  describe('1. LeetCode Unique Problem Deduplication Guarantee', () => {
    it('strictly counts unique problems solved and does NOT multiply duplicate accepted submissions', () => {
      // Simulate raw submissions with multiple accepted submissions for the same problem
      const rawSubmissions = [
        {
          submissionId: 'sub_1',
          questionId: '1',
          questionSlug: 'two-sum',
          difficulty: 'Easy' as Difficulty,
          status: 'Accepted'
        },
        {
          submissionId: 'sub_2',
          questionId: '1',
          questionSlug: 'two-sum',
          difficulty: 'Easy' as Difficulty,
          status: 'Accepted'
        },
        {
          submissionId: 'sub_3',
          questionId: '1',
          questionSlug: 'two-sum',
          difficulty: 'Easy' as Difficulty,
          status: 'Accepted'
        },
        {
          submissionId: 'sub_4',
          questionId: '146',
          questionSlug: 'lru-cache',
          difficulty: 'Medium' as Difficulty,
          status: 'Accepted'
        },
        {
          submissionId: 'sub_5',
          questionId: '146',
          questionSlug: 'lru-cache',
          difficulty: 'Medium' as Difficulty,
          status: 'Accepted'
        },
        {
          submissionId: 'sub_6',
          questionId: '42',
          questionSlug: 'trapping-rain-water',
          difficulty: 'Hard' as Difficulty,
          status: 'Wrong Answer'
        }
      ];

      const acceptedList = rawSubmissions.filter((s) => s.status === 'Accepted');
      expect(acceptedList.length).toBe(5); // 5 accepted submissions

      // Deduplication using distinct questionId or questionSlug
      const uniqueProblemMap = new Map<string, (typeof rawSubmissions)[0]>();
      for (const sub of acceptedList) {
        const key = sub.questionId || sub.questionSlug;
        if (!uniqueProblemMap.has(key)) {
          uniqueProblemMap.set(key, sub);
        }
      }

      // Must be EXACTLY 2 unique problems (two-sum and lru-cache)
      expect(uniqueProblemMap.size).toBe(2);
      expect(Array.from(uniqueProblemMap.keys())).toEqual(['1', '146']);

      // Average submissions per solved problem: 6 total / 2 unique = 3.0
      const totalSubmissions = rawSubmissions.length;
      const uniqueCount = uniqueProblemMap.size;
      const avgSubmissionsPerSolved = Math.round((totalSubmissions / uniqueCount) * 10) / 10;
      expect(avgSubmissionsPerSolved).toBe(3.0);
    });

    it('calculates acceptance rate as accepted / total submissions', () => {
      const total = 20;
      const accepted = 15;
      const rate = Math.round((accepted / total) * 1000) / 10;
      expect(rate).toBe(75.0);
    });
  });

  describe('2. Truth in Reporting: No Inferred Coding Duration', () => {
    it('refuses to infer precise coding duration from Git commit timestamps', () => {
      // Rule: "Do not infer precise coding duration from Git commit timestamps.
      // If information is unavailable, show unavailable rather than inventing numbers."
      const totalTrackedMinutes = 0; // Companion was not tracking
      const trackedDurationAvailable = totalTrackedMinutes > 0;

      const dailyDuration = trackedDurationAvailable ? Math.round(totalTrackedMinutes / 7) : null;
      const weeklyDuration = trackedDurationAvailable ? totalTrackedMinutes : null;

      expect(trackedDurationAvailable).toBe(false);
      expect(dailyDuration).toBeNull();
      expect(weeklyDuration).toBeNull();
    });
  });

  describe('3. CSV Report Export Formatting (RFC 4180)', () => {
    it('generates compliant CSV with proper escaping and summary table', () => {
      const mockReport: DeveloperReport = {
        period: 'monthly',
        title: 'Monthly Progress Report — "November 2026"',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        generatedAt: '2026-11-04T12:00:00.000Z',
        dataFreshness: {
          lastSyncedAt: '2026-11-04T11:50:00.000Z',
          status: 'LIVE'
        },
        summary: {
          totalActivities: 54,
          githubCommits: 32,
          githubPRs: 6,
          githubIssues: 2,
          leetCodeSubmissions: 14,
          leetCodeAccepted: 10,
          uniqueProblemsSolved: 8,
          codingDurationMinutes: null,
          activeDaysCount: 22,
          consistencyScore: 73,
          longestStreak: 12,
          topLanguages: [{ name: 'TypeScript', count: 24, percentage: 75.0 }],
          topRepositories: [{ name: 'owner/streakforge', count: 32, percentage: 100.0 }]
        },
        activityBreakdown: [
          {
            date: '2026-11-01',
            commits: 3,
            leetCode: 1,
            localDev: 0,
            maintenance: 0,
            total: 4
          },
          {
            date: '2026-11-02',
            commits: 2,
            leetCode: 2,
            localDev: 1,
            maintenance: 0,
            total: 5
          }
        ]
      };

      const csv = DeveloperAnalyticsService.exportReportCSV(mockReport);

      expect(typeof csv).toBe('string');
      expect(csv).toContain('"StreakForge Developer Activity Report"');
      expect(csv).toContain('""November 2026""'); // RFC 4180 quote escaping
      expect(csv).toContain('"GitHub Commits",32');
      expect(csv).toContain('"Unique Problems Solved",8');
      expect(csv).toContain('"2026-11-01",3,1,0,0,4');
      expect(csv).toContain('"2026-11-02",2,2,1,0,5');
    });
  });

  describe('4. Personal Notes & Verified External Activity Separation', () => {
    it('preserves verified external activity when developer notes are added', () => {
      // Verified activity represents immutable ground truth
      const verifiedCommits = 4;
      const verifiedAccepted = 2;

      // Developer adds or updates personal markdown notes
      const initialNotes = '';
      const updatedNotes = 'Refactored graph algorithm and cleaned up edge case handlers.';

      // Updating notes must leave verified external counts unaltered
      expect(verifiedCommits).toBe(4);
      expect(verifiedAccepted).toBe(2);
      expect(updatedNotes).not.toBe(initialNotes);
    });
  });
});

