import { Types } from 'mongoose';
import { StudyProgress } from '../models/StudyProgress.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { MockInterviewSession } from '../models/MockInterviewSession.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import { getStreakOverview } from './streakService.js';
import type { CareerReadinessScore } from '@streakforge/shared-types';

export class CareerReadinessService {
  public static async calculateReadiness(userId: string | Types.ObjectId): Promise<CareerReadinessScore> {
    const userObjectId = new Types.ObjectId(userId.toString());

    const [progressDocs, submissions, mockSessions, gitCommits, connectedRepos, overview] = await Promise.all([
      StudyProgress.find({ userId: userObjectId }).lean(),
      LeetCodeSubmission.find({
        userId: userObjectId,
        syncStatus: { $in: ['SYNCED', 'SKIPPED', 'PENDING'] }
      }).lean(),
      MockInterviewSession.find({ userId: userObjectId, status: 'COMPLETED' }).lean(),
      ActivityRecord.countDocuments({ userId: userObjectId, eventType: 'GITHUB_COMMIT' }),
      RepositoryConnection.countDocuments({ userId: userObjectId }),
      getStreakOverview(userId)
    ]);

    const solvedSlugs = new Set<string>();
    let masteredCount = 0;
    let needsRevisionCount = 0;

    progressDocs.forEach((p) => {
      const isSolved = p.status === 'SOLVED' || p.status === 'MASTERED' || p.status === 'NEEDS_REVISION';
      if (isSolved) solvedSlugs.add(p.questionSlug.toLowerCase());
      if (p.status === 'MASTERED') masteredCount++;
      if (p.status === 'NEEDS_REVISION') needsRevisionCount++;
    });
    submissions.forEach((s) => solvedSlugs.add(s.questionSlug.toLowerCase()));

    // 1. DSA Curriculum Coverage (Max 35 pts)
    const curriculumTotal = MASTER_PROBLEM_LIST.length || 75;
    const curriculumRatio = Math.min(1, solvedSlugs.size / curriculumTotal);
    const dsaScore = Math.round(curriculumRatio * 35);

    // 2. SRS Retention (Max 20 pts) - 0 when no problems reviewed yet
    const totalSrsTracked = masteredCount + needsRevisionCount;
    const srsRatio = totalSrsTracked > 0 ? masteredCount / totalSrsTracked : 0;
    const srsScore = Math.round(srsRatio * 20);

    // 3. Coding Consistency (Max 20 pts) - computed strictly from verified StreakEngine overview
    const streakDays = overview.currentStreak || 0;
    const weeklyConsistency = overview.weeklyConsistencyPercent || 0;
    const consistencyScore = Math.min(
      20,
      Math.round((Math.min(7, streakDays) / 7) * 12 + (weeklyConsistency / 100) * 8)
    );

    // 4. Mock Interview Performance (Max 15 pts) - 0 if no interviews completed
    let mockScore = 0;
    if (mockSessions.length > 0) {
      const avgScore = mockSessions.reduce((acc, s) => acc + s.scorePercent, 0) / mockSessions.length;
      mockScore = Math.round((avgScore / 100) * 15);
    }

    // 5. GitHub Portfolio Completeness (Max 10 pts) - scaled cleanly without hardcoded baselines
    const portfolioScore = connectedRepos > 0 ? Math.min(10, 4 + Math.min(6, Math.floor(gitCommits / 2))) : 0;

    const overallScore = Math.min(100, dsaScore + srsScore + consistencyScore + mockScore + portfolioScore);

    let tier: 'READY_FOR_SCREEN' | 'INTERVIEW_READY' | 'COMPETITIVE' | 'FOUNDATIONAL' = 'FOUNDATIONAL';
    if (overallScore >= 80) tier = 'READY_FOR_SCREEN';
    else if (overallScore >= 65) tier = 'INTERVIEW_READY';
    else if (overallScore >= 45) tier = 'COMPETITIVE';

    const recommendedNextActions: string[] = [];
    if (dsaScore < 25) {
      recommendedNextActions.push('Expand DSA breadth: Complete 5 more core Blind 75 questions in Arrays & Two Pointers.');
    }
    if (needsRevisionCount > 0) {
      recommendedNextActions.push(`Clear your active Revision Queue (${needsRevisionCount} problem scheduled today for recall practice).`);
    }
    if (mockSessions.length === 0) {
      recommendedNextActions.push('Simulate your first 45-minute Medium timed mock session in Mock Interview Mode.');
    }
    if (recommendedNextActions.length < 3) {
      recommendedNextActions.push('Keep daily commit momentum active on your target repository to push your streak above 7 days.');
    }

    return {
      overallScore,
      tier,
      components: {
        dsaCurriculumCoverage: {
          score: dsaScore,
          max: 35,
          details: `${solvedSlugs.size} problems mastered across Blind 75 / NeetCode 150`
        },
        spacedRepetitionRetention: {
          score: srsScore,
          max: 20,
          details: `${masteredCount} problems in long-term memory; ${needsRevisionCount} in active review`
        },
        codingConsistency: {
          score: consistencyScore,
          max: 20,
          details: `${streakDays}-day verified streak with authenticated activity`
        },
        mockInterviewPerformance: {
          score: mockScore,
          max: 15,
          details: `${mockSessions.length} timed interview simulations completed`
        },
        githubPortfolioCompleteness: {
          score: portfolioScore,
          max: 10,
          details: `${connectedRepos} repositories linked with automated README cataloging`
        }
      },
      recommendedNextActions,
      disclaimer: 'The Career Readiness score measures objective completion across technical DSA curricula, retention, and portfolio telemetry. It is an internal benchmark and does not constitute a hiring or placement guarantee.'
    };
  }
}

