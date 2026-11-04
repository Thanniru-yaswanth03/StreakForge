import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { LocalAgentInstance } from '../models/LocalAgentInstance.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { StreakEngine } from './streakEngine.js';
import type { StreakReminder } from '@streakforge/shared-types';

export class ReminderService {
  /**
   * Generates active reminders and notifications for the user
   */
  public static async generateReminders(
    userId: string | Types.ObjectId
  ): Promise<StreakReminder[]> {
    const user = await User.findById(userId);
    if (!user) return [];

    const tz = user.timezone || 'UTC';
    const now = new Date();
    const todayStr = StreakEngine.formatDateInTimezone(now, tz);
    const hoursLeft = StreakEngine.getHoursUntilMidnight(tz, now);
    const warningThreshold = user.notificationPreferences?.streakWarningHoursBefore || 3;

    const reminders: StreakReminder[] = [];

    // 1. Check Today's Coding Activity & Streak Warning
    const todaySnap = await DailyActivitySnapshot.findOne({
      userId: new Types.ObjectId(userId.toString()),
      date: todayStr
    });

    const hasActivityToday =
      todaySnap &&
      (todaySnap.streakMaintained ||
        todaySnap.overallStreakEligible ||
        (todaySnap.totalActivities || 0) >= (user.streakGoalPerDay || 1));

    if (!hasActivityToday && hoursLeft <= warningThreshold && hoursLeft > 0) {
      reminders.push({
        id: `streak-warning-${todayStr}`,
        type: 'NO_ACTIVITY_TODAY',
        title: 'Daily Streak Warning',
        message: `No verified coding activity recorded today. You have ${hoursLeft.toFixed(1)} hours left before midnight in ${tz} to maintain consistency.`,
        urgency: hoursLeft <= 1 ? 'CRITICAL' : 'WARNING',
        timestamp: now.toISOString(),
        dueInHours: hoursLeft,
        actionLink: '/leetcode'
      });
    }

    // 2. Pending LeetCode Exports
    const pendingSubsCount = await LeetCodeSubmission.countDocuments({
      userId: new Types.ObjectId(userId.toString()),
      syncStatus: 'PENDING'
    });

    if (pendingSubsCount > 0) {
      reminders.push({
        id: `pending-leetcode-${Date.now()}`,
        type: 'PENDING_LEETCODE_EXPORT',
        title: 'Pending LeetCode Solutions',
        message: `${pendingSubsCount} accepted submission(s) are queued and awaiting export to GitHub.`,
        urgency: 'INFO',
        timestamp: now.toISOString(),
        actionLink: '/repos'
      });
    }

    // 3. Failed GitHub Synchronizations
    const failedSubs = await LeetCodeSubmission.find({
      userId: new Types.ObjectId(userId.toString()),
      syncStatus: 'FAILED'
    })
      .sort({ updatedAt: -1 })
      .limit(3);

    for (const sub of failedSubs) {
      reminders.push({
        id: `failed-sync-${sub._id}`,
        type: 'FAILED_GITHUB_SYNC',
        title: 'GitHub Export Failure',
        message: `Failed to export solution for "${sub.questionTitle}": ${sub.syncErrorMessage || 'Unknown error'}.`,
        urgency: 'WARNING',
        timestamp: sub.updatedAt.toISOString(),
        actionLink: '/leetcode'
      });
    }

    // 4. Local Agent Disconnected / Offline
    const activeAgents = await LocalAgentInstance.find({
      userId: new Types.ObjectId(userId.toString())
    });

    for (const agent of activeAgents) {
      if (agent.watchedPaths && agent.watchedPaths.length > 0) {
        const minutesSinceHeartbeat =
          (now.getTime() - new Date(agent.lastHeartbeatAt).getTime()) / (1000 * 60);

        if (minutesSinceHeartbeat > 30 || agent.status === 'OFFLINE') {
          reminders.push({
            id: `agent-offline-${agent._id}`,
            type: 'LOCAL_AGENT_DISCONNECTED',
            title: 'Desktop Agent Offline',
            message: `Desktop companion "${agent.name}" on ${agent.hostname} has not sent a heartbeat in ${Math.round(minutesSinceHeartbeat)} minutes. Run streakforge-agent start to resume monitoring.`,
            urgency: 'INFO',
            timestamp: now.toISOString(),
            actionLink: '/automation'
          });
        }
      }
    }

    // 5. Upcoming Maintenance Backup
    const backupRepos = await RepositoryConnection.find({
      userId: new Types.ObjectId(userId.toString()),
      isLocal: true,
      autoCommitEnabled: true
    });

    for (const repo of backupRepos) {
      // Check if scheduled backup is coming up
      if (repo.syncPolicy && repo.syncPolicy.intervalMinutes) {
        reminders.push({
          id: `upcoming-backup-${repo._id}`,
          type: 'UPCOMING_BACKUP',
          title: 'Scheduled Snapshot',
          message: `Repository ${repo.repoFullName} is monitored for automated snapshots (interval: ${repo.syncPolicy.intervalMinutes}m).`,
          urgency: 'INFO',
          timestamp: now.toISOString(),
          actionLink: '/repos'
        });
        break; // Only report once
      }
    }

    return reminders;
  }
}
