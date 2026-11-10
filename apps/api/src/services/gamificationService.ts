import { Types } from 'mongoose';
import { UserAchievement } from '../models/UserAchievement.js';
import { User } from '../models/User.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { StudyProgress } from '../models/StudyProgress.js';
import { MockInterviewSession } from '../models/MockInterviewSession.js';
import { getStreakOverview } from './streakService.js';
import type { GamificationProfile, AchievementItem } from '@streakforge/shared-types';

export class GamificationService {
  private static ACHIEVEMENTS_REGISTRY: Array<{
    key: string;
    title: string;
    description: string;
    category: 'STREAK' | 'DSA' | 'COMMITS' | 'MASTERY' | 'INTERVIEW';
    icon: string;
    xpReward: number;
    target: number;
  }> = [
    {
      key: 'first_solve',
      title: 'First Blood',
      description: 'Solve and verify your first algorithm problem on LeetCode.',
      category: 'DSA',
      icon: 'Zap',
      xpReward: 100,
      target: 1
    },
    {
      key: 'streak_7',
      title: '7-Day Momentum',
      description: 'Maintain an unbroken authentic 7-day coding streak.',
      category: 'STREAK',
      icon: 'Flame',
      xpReward: 250,
      target: 7
    },
    {
      key: 'streak_30',
      title: 'Iron Devotion',
      description: 'Maintain a 30-day verified coding consistency streak.',
      category: 'STREAK',
      icon: 'Trophy',
      xpReward: 1000,
      target: 30
    },
    {
      key: 'solves_50',
      title: 'Algorithm Practitioner',
      description: 'Solve 50 verified technical interview problems.',
      category: 'DSA',
      icon: 'Award',
      xpReward: 500,
      target: 50
    },
    {
      key: 'solves_100',
      title: 'Centurion Coder',
      description: 'Cross the milestone of 100 authenticated problem solves.',
      category: 'DSA',
      icon: 'Crown',
      xpReward: 1500,
      target: 100
    },
    {
      key: 'array_specialist',
      title: 'Array Specialist',
      description: 'Master 10 problems in the Arrays & Hashing topic.',
      category: 'MASTERY',
      icon: 'Layers',
      xpReward: 300,
      target: 10
    },
    {
      key: 'tree_climber',
      title: 'Tree Climber',
      description: 'Solve 5 binary tree or graph traversal problems.',
      category: 'MASTERY',
      icon: 'GitFork',
      xpReward: 350,
      target: 5
    },
    {
      key: 'srs_scholar',
      title: 'SuperMemo Scholar',
      description: 'Complete 10 Spaced Repetition recall practice revisions.',
      category: 'MASTERY',
      icon: 'Brain',
      xpReward: 300,
      target: 10
    },
    {
      key: 'git_guardian',
      title: 'Open Source Vanguard',
      description: 'Commit 50 verified source changes without secrets.',
      category: 'COMMITS',
      icon: 'ShieldCheck',
      xpReward: 400,
      target: 50
    },
    {
      key: 'mock_ace',
      title: 'Mock Ace',
      description: 'Complete a timed mock interview practice session.',
      category: 'INTERVIEW',
      icon: 'Clock',
      xpReward: 450,
      target: 1
    }
  ];

  public static calculateLevel(xp: number): { level: number; nextLevelXp: number; progressPercent: number; rankTitle: string } {
    // Level formula: Level = floor((xp / 100) ^ (1/1.5)) + 1
    const level = Math.max(1, Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1);
    const currentLevelBaseXp = Math.floor(100 * Math.pow(level - 1, 1.5));
    const nextLevelTargetXp = Math.floor(100 * Math.pow(level, 1.5));

    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round(((xp - currentLevelBaseXp) / Math.max(1, nextLevelTargetXp - currentLevelBaseXp)) * 100))
    );

    let rankTitle = 'Novice Developer';
    if (level >= 30) rankTitle = 'Principal Polymath';
    else if (level >= 20) rankTitle = 'Staff Engineer';
    else if (level >= 15) rankTitle = 'Senior Algorithmist';
    else if (level >= 10) rankTitle = 'Core Contributor';
    else if (level >= 5) rankTitle = 'Consistent Builder';
    else if (level >= 2) rankTitle = 'Apprentice Developer';

    return {
      level,
      nextLevelXp: nextLevelTargetXp,
      progressPercent,
      rankTitle
    };
  }

  public static async getGamificationProfile(userId: string | Types.ObjectId): Promise<GamificationProfile> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const user = await User.findById(userObjectId);
    if (!user) throw new Error('User not found');

    let doc = await UserAchievement.findOne({ userId: userObjectId });
    if (!doc) {
      doc = await UserAchievement.create({
        userId: userObjectId,
        level: 1,
        currentXp: 0,
        unlockedAchievementKeys: [],
        unlockedAchievementsMeta: {}
      });
    }

    // Tally strictly authentic telemetry metrics for achievements (no fabricated baselines or XP floors)
    const [recentSubs, solveCount, genuineCommits, srsReviews, mockInterviewCount, overview] = await Promise.all([
      LeetCodeSubmission.find({
        userId: userObjectId,
        syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] }
      })
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean(),
      LeetCodeSubmission.countDocuments({
        userId: userObjectId,
        syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] }
      }),
      ActivityRecord.countDocuments({ userId: userObjectId, eventType: 'GITHUB_COMMIT' }),
      StudyProgress.countDocuments({ userId: userObjectId, lastReviewedAt: { $exists: true } }),
      MockInterviewSession.countDocuments({ userId: userObjectId, status: 'COMPLETED' }),
      getStreakOverview(userId)
    ]);

    const authenticStreak = Math.max(overview.currentStreak || 0, overview.longestStreak || 0);

    const achievements: AchievementItem[] = this.ACHIEVEMENTS_REGISTRY.map((def) => {
      let progress = 0;
      if (def.key === 'first_solve') progress = solveCount;
      else if (def.key === 'solves_50' || def.key === 'solves_100') progress = solveCount;
      else if (def.key === 'streak_7' || def.key === 'streak_30') progress = authenticStreak;
      else if (def.key === 'srs_scholar') progress = srsReviews;
      else if (def.key === 'git_guardian') progress = genuineCommits;
      else if (def.key === 'array_specialist') progress = solveCount;
      else if (def.key === 'tree_climber') progress = solveCount;
      else if (def.key === 'mock_ace') progress = mockInterviewCount;

      const isUnlocked = progress >= def.target || (doc?.unlockedAchievementKeys?.includes(def.key) ?? false);

      return {
        id: def.key,
        key: def.key,
        title: def.title,
        description: def.description,
        category: def.category,
        icon: def.icon,
        xpReward: def.xpReward,
        unlocked: isUnlocked,
        unlockedAt: isUnlocked ? (doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString()) : undefined,
        progress: Math.min(progress, def.target),
        target: def.target
      };
    });

    // Compute verified XP: 0 for brand-new users with zero activity
    let calculatedXp = solveCount * 50 + srsReviews * 25 + genuineCommits * 10 + mockInterviewCount * 75;
    achievements.forEach((a) => {
      if (a.unlocked) calculatedXp += a.xpReward;
    });

    const { level, nextLevelXp, progressPercent, rankTitle } = this.calculateLevel(calculatedXp);

    if (doc.currentXp !== calculatedXp || doc.level !== level) {
      doc.currentXp = calculatedXp;
      doc.level = level;
      doc.unlockedAchievementKeys = achievements.filter((a) => a.unlocked).map((a) => a.key);
      await doc.save();
    }

    const recentXpGains = recentSubs.slice(0, 5).map((s) => ({
      timestamp: new Date(s.submittedAt).toISOString(),
      action: `Solved LeetCode #${s.questionId} ${s.questionTitle}`,
      xp: 50
    }));

    return {
      level,
      currentXp: calculatedXp,
      nextLevelXp,
      levelProgressPercent: progressPercent,
      rankTitle,
      totalAchievementsUnlocked: achievements.filter((a) => a.unlocked).length,
      achievements,
      recentXpGains
    };
  }
}

