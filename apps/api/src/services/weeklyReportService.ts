import { Types } from 'mongoose';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { StudyProgress } from '../models/StudyProgress.js';
import { User } from '../models/User.js';
import { getStreakOverview } from './streakService.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import type { WeeklyReport } from '@streakforge/shared-types';

export class WeeklyReportService {
  public static async generateWeeklyReport(userId: string | Types.ObjectId): Promise<WeeklyReport> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const user = await User.findById(userObjectId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const currentWeekStart = new Date(now.getTime() - 7 * 86400000);
    const prevWeekStart = new Date(now.getTime() - 14 * 86400000);

    const [thisWeekSubs, prevWeekSubs, thisWeekCommits, prevWeekCommits, srsReviews, overview] = await Promise.all([
      LeetCodeSubmission.find({
        userId: userObjectId,
        syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] },
        submittedAt: { $gte: currentWeekStart }
      }).lean(),
      LeetCodeSubmission.find({
        userId: userObjectId,
        syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] },
        submittedAt: { $gte: prevWeekStart, $lt: currentWeekStart }
      }).lean(),
      ActivityRecord.find({
        userId: userObjectId,
        eventType: 'GITHUB_COMMIT',
        timestamp: { $gte: currentWeekStart }
      }).lean(),
      ActivityRecord.find({
        userId: userObjectId,
        eventType: 'GITHUB_COMMIT',
        timestamp: { $gte: prevWeekStart, $lt: currentWeekStart }
      }).lean(),
      StudyProgress.countDocuments({
        userId: userObjectId,
        lastReviewedAt: { $gte: currentWeekStart }
      }),
      getStreakOverview(userId)
    ]);

    const activeDates = new Set<string>();
    thisWeekSubs.forEach((s) => activeDates.add(new Date(s.submittedAt).toISOString().slice(0, 10)));
    thisWeekCommits.forEach((c) => activeDates.add(new Date(c.timestamp).toISOString().slice(0, 10)));
    const activeDaysCount = activeDates.size;

    const problemsSolved = thisWeekSubs.length;
    const gitCommits = thisWeekCommits.length;
    const prevSolves = prevWeekSubs.length;
    const prevCommits = prevWeekCommits.length;

    const deltaSolves = problemsSolved - prevSolves;
    const deltaCommits = gitCommits - prevCommits;

    // Derive genuine primary topic from this week's solved problems
    const topicCounts = new Map<string, number>();
    for (const s of thisWeekSubs) {
      const master = MASTER_PROBLEM_LIST.find((p) => p.slug === s.questionSlug || String(p.id) === String(s.questionId));
      const cat = master?.category || 'General Algorithms';
      topicCounts.set(cat, (topicCounts.get(cat) || 0) + 1);
    }
    const sortedTopics = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]);
    const topFocusTopic = sortedTopics[0]?.[0] || (problemsSolved > 0 ? 'Mixed Practice' : 'No problems solved yet this week');
    const weaknessesTackled = sortedTopics.slice(0, 3).map(([t]) => t);

    const weeklyGoal = Math.max(1, (user.streakGoalPerDay || 1) * 7);
    const goalCompletionPercent = Math.min(100, Math.round((activeDaysCount / 7) * 100));
    const streakMaintained = (overview.currentStreak || 0) > 0;

    const markdownSummary = `## StreakForge Weekly Engineering Pulse
**Period:** ${currentWeekStart.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}
**Developer:** @${user.username}

### Weekly Performance Highlights
- **Problems Solved:** ${problemsSolved} (${deltaSolves >= 0 ? `+${deltaSolves}` : deltaSolves} vs previous week)
- **Verified Commits Pushed:** ${gitCommits} (${deltaCommits >= 0 ? `+${deltaCommits}` : deltaCommits} vs previous week)
- **Active Consistency Days:** ${activeDaysCount} / 7 days
- **Spaced Repetition Recalls:** ${srsReviews} exercises completed
- **Primary Focus Topic:** ${topFocusTopic}

> **Productivity Insight:** ${
      problemsSolved + gitCommits === 0
        ? 'No coding activity recorded in the trailing 7 days. Log in or complete a LeetCode submission to start your verified streak.'
        : `Maintained activity across ${activeDaysCount} day(s) this week against a target of ${weeklyGoal} activities.`
    }`;

    return {
      weekNumber: Math.ceil((now.getDate() + 6) / 7),
      startDate: currentWeekStart.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
      problemsSolved,
      problemsAttempted: problemsSolved,
      gitCommits,
      streakMaintained,
      activeDaysCount,
      topFocusTopic,
      weaknessesTackled,
      srsRevisionsCompleted: srsReviews,
      goalCompletionPercent,
      deltaPreviousWeek: { solves: deltaSolves, commits: deltaCommits },
      markdownSummary
    };
  }
}

