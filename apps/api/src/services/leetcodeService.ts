import { Types } from 'mongoose';
import { User, ILeetCodeUserStats } from '../models/User.js';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import { logger } from '../utils/logger.js';
import { logAuditEvent } from './auditService.js';

export interface ScrapedLeetCodeStats {
  username: string;
  realName?: string;
  ranking?: number;
  userAvatar?: string;
  reputation?: number;
  aboutMe?: string;
  countryName?: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptanceRate: number;
  totalActiveDays?: number;
  maxStreak?: number;
  submissionCalendar?: string;
  badgesCount?: number;
  easyTotal?: number;
  mediumTotal?: number;
  hardTotal?: number;
}

/**
 * Query LeetCode's authoritative public GraphQL endpoint for user statistics
 */
export async function fetchLeetCodeUserStats(username: string): Promise<ScrapedLeetCodeStats> {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          ranking
          userAvatar
          reputation
          aboutMe
          countryName
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
          totalSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        submissionCalendar
      }
    }
  `;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'User-Agent': 'StreakForge/1.0 (+https://streakforge.dev)'
    },
    body: JSON.stringify({
      query,
      variables: { username }
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL responded with HTTP ${response.status}: ${response.statusText}`);
  }

  const json: any = await response.json();

  if (json.errors && json.errors.length > 0 && !json.data?.matchedUser) {
    throw new Error(`LeetCode user '${username}' not found or profile is private.`);
  }

  const matched = json.data?.matchedUser;
  if (!matched) {
    throw new Error(`LeetCode user '${username}' does not exist.`);
  }

  const acStats: Array<{ difficulty: string; count: number; submissions: number }> =
    matched.submitStatsGlobal?.acSubmissionNum || [];
  const totalStats: Array<{ difficulty: string; count: number; submissions: number }> =
    matched.submitStatsGlobal?.totalSubmissionNum || [];

  const allAc = acStats.find((s) => s.difficulty === 'All') || { count: 0, submissions: 0 };
  const easyAc = acStats.find((s) => s.difficulty === 'Easy') || { count: 0, submissions: 0 };
  const mediumAc = acStats.find((s) => s.difficulty === 'Medium') || { count: 0, submissions: 0 };
  const hardAc = acStats.find((s) => s.difficulty === 'Hard') || { count: 0, submissions: 0 };

  const allTotal = totalStats.find((s) => s.difficulty === 'All') || { count: 0, submissions: 0 };

  const totalSolved = allAc.count;
  const acceptedSubmissions = allAc.submissions;
  const totalSubmissions = allTotal.submissions;
  const acceptanceRate =
    totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 10000) / 100
      : 0;

  let totalActiveDays = 0;
  let maxStreak = 0;
  try {
    if (matched.submissionCalendar) {
      const calObj = JSON.parse(matched.submissionCalendar);
      const timestamps = Object.keys(calObj)
        .filter((k) => Number(calObj[k]) > 0)
        .map(Number)
        .sort((a, b) => a - b);
      if (timestamps.length > 0) {
        totalActiveDays = timestamps.length;
        let curr = 1;
        maxStreak = 1;
        for (let i = 1; i < timestamps.length; i++) {
          const diffDays = Math.round((timestamps[i] - timestamps[i - 1]) / 86400);
          if (diffDays === 1) {
            curr++;
            if (curr > maxStreak) maxStreak = curr;
          } else if (diffDays > 1) {
            curr = 1;
          }
        }
      }
    }
  } catch (err) {
    logger.warn('Failed parsing LeetCode submissionCalendar JSON', { err });
  }

  return {
    username: matched.username,
    realName: matched.profile?.realName || undefined,
    ranking: matched.profile?.ranking || undefined,
    userAvatar: matched.profile?.userAvatar || '',
    reputation: matched.profile?.reputation || 0,
    aboutMe: matched.profile?.aboutMe || '',
    countryName: matched.profile?.countryName || '',
    totalSolved,
    easySolved: easyAc.count,
    mediumSolved: mediumAc.count,
    hardSolved: hardAc.count,
    totalSubmissions,
    acceptanceRate,
    totalActiveDays,
    maxStreak,
    submissionCalendar: matched.submissionCalendar,
    badgesCount: 0,
    easyTotal: 975,
    mediumTotal: 2139,
    hardTotal: 987
  };
}

/**
 * Synchronize LeetCode profile stats for a StreakForge user and update database
 */
export async function syncLeetCodeUserStats(
  userId: string,
  usernameOverride?: string
): Promise<ILeetCodeUserStats> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const leetcodeUser = (usernameOverride || user.leetcodeUsername || '').trim();
  if (!leetcodeUser) {
    throw new Error('No LeetCode profile linked. Connect your LeetCode username in Settings.');
  }

  logger.info(`[LeetCodeSync] Fetching authentic stats for '${leetcodeUser}' (StreakForge user ${user.username})`);

  const scraped = await fetchLeetCodeUserStats(leetcodeUser);

  const statsDoc: ILeetCodeUserStats = {
    username: scraped.username,
    realName: scraped.realName,
    ranking: scraped.ranking,
    userAvatar: scraped.userAvatar,
    reputation: scraped.reputation,
    aboutMe: scraped.aboutMe,
    countryName: scraped.countryName,
    totalSolved: scraped.totalSolved,
    easySolved: scraped.easySolved,
    mediumSolved: scraped.mediumSolved,
    hardSolved: scraped.hardSolved,
    totalSubmissions: scraped.totalSubmissions,
    acceptanceRate: scraped.acceptanceRate,
    totalActiveDays: scraped.totalActiveDays,
    maxStreak: scraped.maxStreak,
    submissionCalendar: scraped.submissionCalendar,
    badgesCount: scraped.badgesCount,
    easyTotal: scraped.easyTotal,
    mediumTotal: scraped.mediumTotal,
    hardTotal: scraped.hardTotal,
    lastSyncedAt: new Date()
  };

  user.leetcodeUsername = scraped.username;
  user.leetcodeStats = statsDoc;
  await user.save();

  // Synchronize authentic submission calendar days into DailyActivitySnapshot via bulkWrite
  if (scraped.submissionCalendar) {
    try {
      const cal = JSON.parse(scraped.submissionCalendar);
      const bulkOps: any[] = [];
      for (const [tsStr, count] of Object.entries(cal)) {
        const numCount = Number(count);
        if (!Number.isFinite(numCount) || numCount <= 0) continue;
        const d = new Date(Number(tsStr) * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        bulkOps.push({
          updateOne: {
            filter: { userId: user._id, date: dateStr },
            update: {
              $set: {
                leetCodeCount: numCount,
                'leetcode.submissions': numCount,
                'leetcode.accepted': numCount,
                leetCodeStreakEligible: true,
                overallStreakEligible: true,
                streakMaintained: true
              },
              $setOnInsert: {
                userId: user._id,
                date: dateStr,
                github: { commits: 0, prs: 0, issues: 0, other: 0 },
                localDev: { sessions: 0, filesChanged: 0, activeMinutes: 0 },
                maintenance: { backups: 0, dependencyUpdates: 0, docsSync: 0 },
                'leetcode.uniqueProblems': 0,
                githubStreakEligible: false,
                localDevStreakEligible: false,
                gitCommitCount: 0,
                totalActivities: numCount,
                languagesUsed: []
              }
            },
            upsert: true
          }
        });
      }
      if (bulkOps.length > 0) {
        await DailyActivitySnapshot.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (err) {
      logger.warn('Failed to upsert DailyActivitySnapshots from submissionCalendar', { err });
    }
  }

  await logAuditEvent({
    userId,
    component: 'API',
    action: 'LEETCODE_STATS_SYNCED',
    status: 'SUCCESS',
    description: `Synchronized LeetCode profile for @${scraped.username}: ${scraped.totalSolved} solved (${scraped.easySolved}E / ${scraped.mediumSolved}M / ${scraped.hardSolved}H), rank #${scraped.ranking || 'N/A'}`
  });

  return statsDoc;
}

/**
 * Get cached LeetCode stats, refreshing automatically if older than 30 seconds
 */
export async function getOrRefreshLeetCodeStats(
  userId: string,
  forceRefresh: boolean = false
): Promise<ILeetCodeUserStats | null> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (!user.leetcodeUsername) {
    return null;
  }

  const currentStats = user.leetcodeStats;
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

  if (!forceRefresh && currentStats && currentStats.lastSyncedAt && new Date(currentStats.lastSyncedAt) > thirtySecondsAgo) {
    return currentStats;
  }

  try {
    return await syncLeetCodeUserStats(userId);
  } catch (err: any) {
    if (currentStats) {
      logger.warn(`Failed background refresh for LeetCode stats, falling back to cached: ${err.message}`);
      return currentStats;
    }
    return null;
  }
}

export interface PublicAcSubmissionMeta {
  submissionId: string;
  questionId: string;
  questionTitle: string;
  questionSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: string;
  topicTags: string[];
  submittedAt: string;
}

/**
 * Query LeetCode's public GraphQL API for recent accepted submissions metadata.
 * Note: Public LeetCode GraphQL does NOT expose submission source code.
 */
export async function fetchPublicRecentAcSubmissions(
  username: string,
  limit: number = 20
): Promise<PublicAcSubmissionMeta[]> {
  const safeLimit = Math.min(25, Math.max(1, limit));
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
        lang
      }
    }
  `;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0 (compatible; StreakForge/4.0)'
    },
    body: JSON.stringify({ query, variables: { username, limit: safeLimit } })
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL returned HTTP ${response.status}`);
  }

  const json: any = await response.json();
  const list = json?.data?.recentAcSubmissionList;
  if (!Array.isArray(list)) {
    return [];
  }

  // Enrich unique problem slugs with authentic difficulty, numeric questionFrontendId, and topicTags
  const uniqueSlugs = Array.from(new Set<string>(list.map((s: any) => s.titleSlug).filter(Boolean)));
  const questionMetaMap = new Map<
    string,
    { questionId: string; difficulty: 'Easy' | 'Medium' | 'Hard'; topicTags: string[] }
  >();

  await Promise.all(
    uniqueSlugs.slice(0, 20).map(async (slug) => {
      try {
        const qQuery = `
          query questionMeta($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionFrontendId
              difficulty
              topicTags {
                name
              }
            }
          }
        `;
        const qRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Referer: 'https://leetcode.com'
          },
          body: JSON.stringify({ query: qQuery, variables: { titleSlug: slug } })
        });
        if (qRes.ok) {
          const qJson: any = await qRes.json();
          const q = qJson?.data?.question;
          if (q) {
            questionMetaMap.set(slug, {
              questionId: String(q.questionFrontendId || '0'),
              difficulty:
                q.difficulty === 'Medium' || q.difficulty === 'Hard' ? q.difficulty : 'Easy',
              topicTags: Array.isArray(q.topicTags) ? q.topicTags.map((t: any) => t.name) : []
            });
          }
        }
      } catch {
        // Skip enrichment failure gracefully
      }
    })
  );

  return list.map((s: any) => {
    const meta = questionMetaMap.get(s.titleSlug);
    const tsMs = Number(s.timestamp) * 1000;
    return {
      submissionId: String(s.id),
      questionId: meta?.questionId || '0',
      questionTitle: s.title || s.titleSlug,
      questionSlug: s.titleSlug,
      difficulty: meta?.difficulty || 'Easy',
      language: s.lang || 'unknown',
      topicTags: meta?.topicTags || [],
      submittedAt: Number.isFinite(tsMs) && tsMs > 0 ? new Date(tsMs).toISOString() : new Date().toISOString()
    };
  });
}

