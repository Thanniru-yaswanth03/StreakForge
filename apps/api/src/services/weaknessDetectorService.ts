import { Types } from 'mongoose';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { StudyProgress } from '../models/StudyProgress.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import type { TopicPerformance, ProblemRecommendation, WeaknessReport, TopicMasteryStatus } from '@streakforge/shared-types';

export class WeaknessDetectorService {
  private static TOPIC_COLORS: Record<string, string> = {
    'Arrays & Hashing': '#3fb950',
    'Two Pointers': '#58a6ff',
    'Sliding Window': '#388bfd',
    'Stack': '#f85149',
    'Binary Search': '#79c0ff',
    'Linked List': '#d29922',
    'Trees': '#56d364',
    'Heap / Priority Queue': '#db61a2',
    'Backtracking': '#bc8cff',
    'Tries': '#e3b341',
    'Graphs': '#f778ba',
    'Dynamic Programming': '#a371f7',
    '1-D Dynamic Programming': '#a371f7',
    '2-D Dynamic Programming': '#8957e5',
    'Bit Manipulation': '#2ea043'
  };

  public static async analyzeWeaknesses(userId: string | Types.ObjectId): Promise<WeaknessReport> {
    const userObjectId = new Types.ObjectId(userId.toString());

    // 1. Fetch user's study progress and raw submissions
    const [progressDocs, submissions] = await Promise.all([
      StudyProgress.find({ userId: userObjectId }).lean(),
      LeetCodeSubmission.find({ userId: userObjectId }).lean()
    ]);

    // Build sets of solved and attempted problem slugs
    const solvedMap = new Map<string, { status: string; needsRevision: boolean }>();
    const failedSlugs = new Set<string>();

    for (const p of progressDocs) {
      const isSolved = p.status === 'SOLVED' || p.status === 'MASTERED' || p.status === 'NEEDS_REVISION';
      if (isSolved) {
        solvedMap.set(p.questionSlug.toLowerCase(), {
          status: p.status,
          needsRevision: p.status === 'NEEDS_REVISION'
        });
      }
    }

    for (const sub of submissions) {
      if (sub.syncStatus === 'SYNCED') {
        if (!solvedMap.has(sub.questionSlug.toLowerCase())) {
          solvedMap.set(sub.questionSlug.toLowerCase(), { status: 'SOLVED', needsRevision: false });
        }
      } else if (sub.syncStatus === 'FAILED') {
        failedSlugs.add(sub.questionSlug.toLowerCase());
      }
    }

    // 2. Aggregate performance across canonical topics
    const topicStats: Record<
      string,
      { attempted: number; solved: number; failed: number; needsRevision: number }
    > = {};

    for (const problem of MASTER_PROBLEM_LIST) {
      const cat = problem.category || 'General';
      if (!topicStats[cat]) {
        topicStats[cat] = { attempted: 0, solved: 0, failed: 0, needsRevision: 0 };
      }

      const pSlug = problem.slug.toLowerCase();
      const progress = solvedMap.get(pSlug);
      const hasFailed = failedSlugs.has(pSlug);

      if (progress) {
        topicStats[cat].attempted++;
        topicStats[cat].solved++;
        if (progress.needsRevision) {
          topicStats[cat].needsRevision++;
        }
      } else if (hasFailed) {
        topicStats[cat].attempted++;
        topicStats[cat].failed++;
      }
    }

    // 3. Format topic mastery
    const topics: TopicPerformance[] = Object.entries(topicStats).map(([topic, stats]) => {
      const accuracy = stats.attempted > 0 ? Math.round((stats.solved / stats.attempted) * 100) : 0;
      let status: TopicMasteryStatus = 'MODERATE';

      if (stats.needsRevision >= 2 || (stats.attempted > 0 && accuracy < 40)) {
        status = 'CRITICAL_WEAK';
      } else if (stats.solved === 0 || accuracy < 60) {
        status = 'WEAK';
      } else if (accuracy >= 80 && stats.solved >= 2 && stats.needsRevision === 0) {
        status = 'STRONG';
      } else {
        status = 'MODERATE';
      }

      return {
        topic,
        attempted: stats.attempted,
        solved: stats.solved,
        accuracy,
        failedAttempts: stats.failed,
        needsRevisionCount: stats.needsRevision,
        status,
        color: this.TOPIC_COLORS[topic] || '#58a6ff'
      };
    });

    // Sort: weakest / critical weak first, then lowest accuracy
    topics.sort((a, b) => {
      const score = (s: TopicMasteryStatus) => (s === 'CRITICAL_WEAK' ? 0 : s === 'WEAK' ? 1 : s === 'MODERATE' ? 2 : 3);
      if (score(a.status) !== score(b.status)) return score(a.status) - score(b.status);
      return a.accuracy - b.accuracy;
    });

    const weakestTopics = topics
      .filter((t) => t.status === 'CRITICAL_WEAK' || t.status === 'WEAK')
      .map((t) => t.topic)
      .slice(0, 3);

    // 4. Generate next-problem recommendations
    const recommendations: ProblemRecommendation[] = [];
    const targetTopics = weakestTopics.length > 0 ? weakestTopics : ['Dynamic Programming', 'Graphs', 'Trees'];

    for (const topic of targetTopics) {
      const candidate = MASTER_PROBLEM_LIST.find((p) => {
        const cat = p.category;
        const slug = p.slug.toLowerCase();
        return cat === topic && !solvedMap.has(slug);
      });

      if (candidate) {
        recommendations.push({
          id: candidate.id,
          slug: candidate.slug,
          title: candidate.title,
          difficulty: candidate.difficulty,
          category: candidate.category,
          pattern: topic,
          reason: `Targeted practice to strengthen detected weakness in ${topic}`,
          sourceTrack: 'Blind 75'
        });
      }
    }

    // If still less than 3, add unmastered Easy or Medium
    if (recommendations.length < 3) {
      for (const p of MASTER_PROBLEM_LIST) {
        if (recommendations.length >= 3) break;
        const slug = p.slug.toLowerCase();
        if (!solvedMap.has(slug) && !recommendations.some((r) => r.slug === p.slug)) {
          recommendations.push({
            id: p.id,
            slug: p.slug,
            title: p.title,
            difficulty: p.difficulty,
            category: p.category,
            pattern: p.category,
            reason: `High-signal foundational interview problem in ${p.category}`,
            sourceTrack: 'Blind 75'
          });
        }
      }
    }

    const totalAttempted = topics.reduce((acc, t) => acc + t.attempted, 0);
    const totalSolved = topics.reduce((acc, t) => acc + t.solved, 0);
    const overallAccuracyPercent = totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : 100;

    return {
      topics,
      weakestTopics,
      recommendations,
      overallAccuracyPercent
    };
  }
}

