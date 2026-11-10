import { User } from '../models/User.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { UserAchievement, type IUserAchievementDocument } from '../models/UserAchievement.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import { getStreakOverview } from './streakService.js';
import { ENV } from '../config/env.js';
import type { PublicDeveloperProfile } from '@streakforge/shared-types';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class PublicProfileService {
  public static async getPublicProfile(username: string): Promise<PublicDeveloperProfile | null> {
    const cleanUsername = username.trim();
    if (!cleanUsername) return null;

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, 'i') },
      isActive: true
    });

    if (!user || user.isPublicProfile === false) {
      return null;
    }

    const [submissions, gitCommits, achievementDoc, overview] = await Promise.all([
      LeetCodeSubmission.find({
        userId: user._id,
        syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] }
      })
        .sort({ submittedAt: -1 })
        .lean(),
      ActivityRecord.find({ userId: user._id, eventType: 'GITHUB_COMMIT' })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
      UserAchievement.findOne({ userId: user._id }).lean<IUserAchievementDocument | null>(),
      getStreakOverview(user._id)
    ]);

    const easySubs = submissions.filter((s) => s.difficulty === 'Easy').length;
    const medSubs = submissions.filter((s) => s.difficulty === 'Medium').length;
    const hardSubs = submissions.filter((s) => s.difficulty === 'Hard').length;

    const totalSolved = user.leetcodeStats?.totalSolved ?? submissions.length;
    const easyCount = user.leetcodeStats?.easySolved ?? easySubs;
    const mediumCount = user.leetcodeStats?.mediumSolved ?? medSubs;
    const hardCount = user.leetcodeStats?.hardSolved ?? hardSubs;

    const difficultyDistribution = {
      easy: easyCount,
      medium: mediumCount,
      hard: hardCount
    };

    // Derive authentic topic breakdown from tracked submissions
    const topicCounts = new Map<string, number>();
    const seenSlugs = new Set<string>();
    for (const s of submissions) {
      const key = s.questionSlug || s.questionId;
      if (seenSlugs.has(key)) continue;
      seenSlugs.add(key);
      const master = MASTER_PROBLEM_LIST.find((p) => p.slug === s.questionSlug || String(p.id) === String(s.questionId));
      const cat = master?.category || 'Algorithms';
      topicCounts.set(cat, (topicCounts.get(cat) || 0) + 1);
    }

    const topSkills = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic, count]) => ({
        topic,
        count,
        level: count >= 10 ? 'Advanced' : count >= 5 ? 'Proficient' : 'Growing'
      }));

    // Genuine badges from persisted achievement records
    const badges = (achievementDoc?.unlockedAchievementKeys || []).map((key: string) => {
      const unlockedAt = achievementDoc?.unlockedAchievementsMeta?.[key]?.unlockedAt;
      return {
        id: key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        icon: 'Award',
        unlockedAt: (unlockedAt ? new Date(unlockedAt) : user.createdAt).toISOString()
      };
    });

    // Recent activity feed
    const recentActivity: Array<{ date: string; title: string; platform: string }> = [];
    submissions.slice(0, 5).forEach((s) => {
      recentActivity.push({
        date: new Date(s.submittedAt).toISOString().slice(0, 10),
        title: `Solved [${s.questionId}] ${s.questionTitle} (${s.difficulty})`,
        platform: 'LeetCode'
      });
    });

    gitCommits.slice(0, 5).forEach((c) => {
      const repoLabel = (c.metadata as any)?.repoFullName || c.reference;
      recentActivity.push({
        date: new Date(c.timestamp).toISOString().slice(0, 10),
        title: `Verified commit${repoLabel ? ` in ${repoLabel}` : ''}`,
        platform: 'GitHub'
      });
    });

    const baseWebUrl = (ENV.WEB_APP_URL || '').replace(/\/+$/, '') || 'https://streak-forge-six.vercel.app';

    return {
      username: user.username,
      name: user.name || user.username,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || user.leetcodeStats?.userAvatar,
      githubHandle: user.username,
      leetcodeHandle: user.leetcodeUsername || undefined,
      codeforcesHandle: user.codeforcesUsername || undefined,
      currentStreak: user.publicProfileSettings?.showStreak ? (overview.currentStreak || 0) : 0,
      longestStreak: user.publicProfileSettings?.showStreak ? (overview.longestStreak || 0) : 0,
      totalSolved,
      difficultyDistribution,
      topSkills,
      badges,
      recentActivity: recentActivity
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      publicUrl: `${baseWebUrl}/u/${user.username}`
    };
  }
}

