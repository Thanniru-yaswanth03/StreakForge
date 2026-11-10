import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import type { PlatformProfile, UnifiedActivityItem } from '@streakforge/shared-types';

export class MultiPlatformService {
  /**
   * Fetch Codeforces statistics using official public API
   */
  public static async fetchCodeforcesStats(handle: string): Promise<{
    rating: number;
    rank: string;
    totalSolved: number;
    avatarUrl: string;
    submissions: Array<{ title: string; verdict: string; timestamp: Date }>;
  }> {
    try {
      const infoRes = await fetch(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!infoRes.ok) {
        throw new Error(`Codeforces user.info returned HTTP ${infoRes.status}`);
      }
      const infoData = (await infoRes.json()) as any;

      if (infoData.status !== 'OK' || !infoData.result?.[0]) {
        throw new Error(infoData.comment || `Codeforces user '${handle}' not found`);
      }

      const u = infoData.result[0];
      const rating = u.rating ?? 0;
      const rank = u.rank || 'unrated';
      const avatarUrl = u.titlePhoto || u.avatar || '';

      const statusRes = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=100`,
        { signal: AbortSignal.timeout(8000) }
      );
      const statusData = (statusRes.ok ? await statusRes.json() : {}) as any;

      const solvedSlugs = new Set<string>();
      const recentSubs: Array<{ title: string; verdict: string; timestamp: Date }> = [];

      if (statusData.status === 'OK' && Array.isArray(statusData.result)) {
        for (const sub of statusData.result) {
          const prob = sub.problem || {};
          const probKey = `${prob.contestId || ''}${prob.index || ''}-${prob.name || ''}`;
          if (sub.verdict === 'OK') {
            solvedSlugs.add(probKey);
          }
          if (recentSubs.length < 15) {
            recentSubs.push({
              title: `${prob.name || 'Problem'} (${prob.index || 'A'})`,
              verdict: sub.verdict,
              timestamp: new Date((sub.creationTimeSeconds || Date.now() / 1000) * 1000)
            });
          }
        }
      }

      return {
        rating,
        rank,
        totalSolved: solvedSlugs.size,
        avatarUrl,
        submissions: recentSubs
      };
    } catch (err) {
      console.warn('[MultiPlatformService] Codeforces API fetch failed or offline:', err);
      throw err;
    }
  }

  /**
   * Get all connected platform profiles and verified status
   */
  public static async getPlatformProfiles(userId: string | Types.ObjectId): Promise<{
    profiles: PlatformProfile[];
    timeline: UnifiedActivityItem[];
  }> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const user = await User.findById(userObjectId);
    if (!user) throw new Error('User not found');

    const [lcSubs, gitActs, githubCommitCount] = await Promise.all([
      LeetCodeSubmission.find({ userId: userObjectId }).sort({ submittedAt: -1 }).limit(15).lean(),
      ActivityRecord.find({ userId: userObjectId }).sort({ timestamp: -1 }).limit(15).lean(),
      ActivityRecord.countDocuments({ userId: userObjectId, eventType: 'GITHUB_COMMIT' })
    ]);

    const profiles: PlatformProfile[] = [];

    // 1. GitHub (real tracked commit count — 0 if none)
    profiles.push({
      platform: 'github',
      handle: user.username,
      connected: true,
      rank: githubCommitCount > 0 ? 'Active Contributor' : 'Connected',
      totalSolved: githubCommitCount,
      lastSyncedAt: user.updatedAt.toISOString(),
      avatarUrl: user.avatarUrl
    });

    // 2. LeetCode
    const lcSolved = user.leetcodeStats?.totalSolved ?? 0;
    profiles.push({
      platform: 'leetcode',
      handle: user.leetcodeUsername || 'Not Connected',
      connected: !!user.leetcodeUsername,
      rating: user.leetcodeStats?.ranking,
      rank: user.leetcodeStats?.ranking ? `#${user.leetcodeStats.ranking}` : undefined,
      totalSolved: lcSolved,
      lastSyncedAt: user.leetcodeStats?.lastSyncedAt
        ? new Date(user.leetcodeStats.lastSyncedAt).toISOString()
        : undefined,
      avatarUrl: user.leetcodeStats?.userAvatar
    });

    // 3. Codeforces (live API fetch when connected; never fabricate rating/counts)
    let cfStats: Awaited<ReturnType<typeof MultiPlatformService.fetchCodeforcesStats>> | null = null;
    if (user.codeforcesUsername) {
      try {
        cfStats = await MultiPlatformService.fetchCodeforcesStats(user.codeforcesUsername);
      } catch {
        cfStats = null;
      }
    }

    profiles.push({
      platform: 'codeforces',
      handle: user.codeforcesUsername || 'Not Connected',
      connected: !!user.codeforcesUsername,
      rating: cfStats?.rating,
      rank: user.codeforcesUsername ? (cfStats?.rank || 'Sync Unavailable') : 'Not Connected',
      totalSolved: cfStats?.totalSolved ?? 0,
      lastSyncedAt: cfStats ? new Date().toISOString() : undefined,
      avatarUrl: cfStats?.avatarUrl
    });

    // 5. Build Unified Activity Timeline
    const timeline: UnifiedActivityItem[] = [];

    for (const sub of lcSubs) {
      timeline.push({
        id: `lc_${sub._id}`,
        platform: 'leetcode',
        title: `Solved [${sub.questionId}] ${sub.questionTitle}`,
        subtitle: `${sub.difficulty} • ${sub.language} (${sub.runtimeMs}ms)`,
        timestamp: sub.submittedAt.toISOString(),
        url: sub.githubCommitUrl,
        type: 'SOLVE',
        metadata: { status: sub.syncStatus }
      });
    }

    for (const act of gitActs) {
      timeline.push({
        id: `gh_${(act as any)._id}`,
        platform: 'github',
        title: `Git Commit in repository`,
        subtitle: `Ref: ${(act.reference || '').substring(0, 7)}`,
        timestamp: act.timestamp.toISOString(),
        type: 'COMMIT',
        metadata: { status: act.verificationStatus }
      });
    }

    // Sort combined timeline chronologically descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      profiles,
      timeline: timeline.slice(0, 30)
    };
  }

  /**
   * Connect third-party platform handle
   */
  public static async connectPlatform(
    userId: string | Types.ObjectId,
    platform: 'codeforces' | 'codechef' | 'leetcode',
    handle: string
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const cleanHandle = handle.trim();

    if (!cleanHandle) {
      throw new Error('Platform handle cannot be empty');
    }

    if (platform === 'codeforces') {
      // Verify handle actually exists on Codeforces before persisting
      await this.fetchCodeforcesStats(cleanHandle);
      await User.findByIdAndUpdate(userObjectId, { $set: { codeforcesUsername: cleanHandle } });
    } else if (platform === 'codechef') {
      await User.findByIdAndUpdate(userObjectId, { $set: { codechefUsername: cleanHandle } });
    } else if (platform === 'leetcode') {
      await User.findByIdAndUpdate(userObjectId, { $set: { leetcodeUsername: cleanHandle } });
    }
  }
}
