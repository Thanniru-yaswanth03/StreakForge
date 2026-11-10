import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import { BadgeService } from '../services/badgeService.js';
import { getStreakOverview } from '../services/streakService.js';
import type { BadgeTheme } from '@streakforge/shared-types';

export const badgeRouter: Router = Router();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

badgeRouter.get('/streak.svg', async (req: Request, res: Response) => {
  try {
    const usernameQuery = ((req.query.user as string) || '').trim();
    const theme = (req.query.theme as BadgeTheme) || 'dark';

    if (!usernameQuery) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.status(400).send(
        `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="60"><rect width="320" height="60" fill="#21262d"/><text x="15" y="35" fill="#f85149" font-family="sans-serif" font-size="12">Missing ?user=username parameter</text></svg>`
      );
      return;
    }

    const exactInsensitive = new RegExp(`^${escapeRegex(usernameQuery)}$`, 'i');

    // Look up strictly matching user by GitHub username or LeetCode username (no cross-user fallback)
    const user = await User.findOne({
      $or: [
        { username: exactInsensitive },
        { leetcodeUsername: exactInsensitive },
        { 'leetcodeStats.username': exactInsensitive }
      ]
    }).lean();

    if (!user) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.status(404).send(
        `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="60"><rect width="380" height="60" rx="8" fill="#21262d"/><text x="15" y="35" fill="#8b949e" font-family="sans-serif" font-size="12">StreakForge profile not found for @${escapeXml(usernameQuery)}</text></svg>`
      );
      return;
    }

    const overview = await getStreakOverview(user._id);
    const currentStreak = overview.currentStreak || 0;
    const longestStreak = overview.longestStreak || 0;

    let totalSolved = user.leetcodeStats?.totalSolved ?? 0;
    let easySolved = user.leetcodeStats?.easySolved ?? 0;
    let mediumSolved = user.leetcodeStats?.mediumSolved ?? 0;
    let hardSolved = user.leetcodeStats?.hardSolved ?? 0;

    if (totalSolved === 0 && !user.leetcodeStats) {
      const [easyC, medC, hardC] = await Promise.all([
        LeetCodeSubmission.countDocuments({ userId: user._id, difficulty: 'Easy', syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] } }),
        LeetCodeSubmission.countDocuments({ userId: user._id, difficulty: 'Medium', syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] } }),
        LeetCodeSubmission.countDocuments({ userId: user._id, difficulty: 'Hard', syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] } })
      ]);
      easySolved = easyC;
      mediumSolved = medC;
      hardSolved = hardC;
      totalSolved = easyC + medC + hardC;
    }

    const latestActive = await DailyActivitySnapshot.findOne({
      userId: user._id,
      totalActivities: { $gt: 0 }
    })
      .sort({ date: -1 })
      .lean();

    const lastActivityDate = latestActive?.date
      ? new Date(`${latestActive.date}T00:00:00Z`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        })
      : 'No activity yet';

    const svg = BadgeService.generateBadgeSvg(
      {
        username: user.username,
        currentStreak,
        longestStreak,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        lastActivityDate
      },
      theme
    );

    const etag = crypto.createHash('md5').update(svg).digest('hex');

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('ETag', etag);
    res.status(200).send(svg);
  } catch (error: any) {
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.status(500).send(
      `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="60"><rect width="380" height="60" fill="#21262d"/><text x="15" y="35" fill="#f85149" font-family="sans-serif" font-size="12">StreakForge Badge Error: ${escapeXml(error?.message || 'Internal error')}</text></svg>`
    );
  }
});

