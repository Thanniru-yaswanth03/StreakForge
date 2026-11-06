import { Types } from 'mongoose';
import { StudyProgress, IStudyProgressDocument } from '../models/StudyProgress.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import {
  MASTER_PROBLEM_LIST,
  CURRICULUM_TRACKS,
  getProblemsForTrack
} from '../data/curriculaData.js';
import type {
  CurriculumTrackId,
  StudyProblemStatus,
  SrsRating,
  StudyProgressItem,
  RevisionQueueSummary
} from '@streakforge/shared-types';

export class StudyService {
  /**
   * Helper to format a Date as YYYY-MM-DD in UTC
   */
  public static getUtcDateString(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Add days to a YYYY-MM-DD string
   */
  public static addDaysToDateString(dateStr: string, days: number): string {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Get curriculum progress with automatic reconciliation against authentic LeetCode submissions
   */
  public static async getCurriculumProgress(
    userId: string | Types.ObjectId,
    trackId: CurriculumTrackId
  ) {
    const userObjectId = new Types.ObjectId(userId.toString());
    const problems = getProblemsForTrack(trackId);
    const trackInfo = CURRICULUM_TRACKS[trackId] || CURRICULUM_TRACKS.blind75;

    // Fetch existing progress
    const userProgress = await StudyProgress.find({ userId: userObjectId }).lean();
    const progressMap = new Map<string, any>();
    userProgress.forEach((p) => progressMap.set(p.questionSlug, p));

    // Fetch authentic accepted submissions from our DB
    const acceptedSubs = await LeetCodeSubmission.find({
      userId: userObjectId,
      status: 'Accepted'
    }).lean();
    const solvedSlugSet = new Set<string>();
    acceptedSubs.forEach((s) => {
      if (s.questionSlug) solvedSlugSet.add(s.questionSlug.toLowerCase());
      if (s.questionTitle) {
        const slug = s.questionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        solvedSlugSet.add(slug);
      }
    });

    const todayStr = this.getUtcDateString();
    let solvedCount = 0;
    let attemptedCount = 0;
    let masteredCount = 0;
    let needsRevisionCount = 0;

    const enrichedProblems = problems.map((problem) => {
      let progress = progressMap.get(problem.slug);

      // Auto-detect authentic LeetCode solve if not manually started/solved
      if (!progress && solvedSlugSet.has(problem.slug.toLowerCase())) {
        progress = {
          userId: userObjectId,
          problemId: problem.id,
          questionSlug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty,
          category: problem.category,
          curricula: [trackId],
          status: 'SOLVED',
          repetitionLevel: 1,
          easeFactor: 2.5,
          intervalDays: 3,
          nextReviewDate: this.addDaysToDateString(todayStr, 3),
          history: []
        };
      }

      const status: StudyProblemStatus = progress?.status || 'NOT_STARTED';
      const isCountedAsSolved = status === 'SOLVED' || status === 'MASTERED' || status === 'NEEDS_REVISION';
      if (isCountedAsSolved) solvedCount++;
      if (status === 'MASTERED') masteredCount++;
      if (status === 'NEEDS_REVISION') needsRevisionCount++;
      if (status === 'ATTEMPTED') attemptedCount++;

      return {
        ...problem,
        status,
        userNotes: progress?.userNotes || '',
        repetitionLevel: progress?.repetitionLevel || 0,
        easeFactor: progress?.easeFactor || 2.5,
        intervalDays: progress?.intervalDays || 1,
        lastReviewedAt: progress?.lastReviewedAt,
        nextReviewDate: status === 'NEEDS_REVISION' ? todayStr : (progress?.nextReviewDate || todayStr),
        history: progress?.history || []
      };
    });

    // Topic breakdown
    const topicStats: Record<string, { total: number; solved: number }> = {};
    const diffStats: Record<string, { total: number; solved: number }> = {
      Easy: { total: 0, solved: 0 },
      Medium: { total: 0, solved: 0 },
      Hard: { total: 0, solved: 0 }
    };

    enrichedProblems.forEach((p) => {
      if (!topicStats[p.category]) topicStats[p.category] = { total: 0, solved: 0 };
      topicStats[p.category].total++;
      if (diffStats[p.difficulty]) diffStats[p.difficulty].total++;

      if (p.status === 'SOLVED' || p.status === 'MASTERED' || p.status === 'NEEDS_REVISION') {
        topicStats[p.category].solved++;
        if (diffStats[p.difficulty]) diffStats[p.difficulty].solved++;
      }
    });

    const completionPercent = Math.round((solvedCount / (enrichedProblems.length || 1)) * 100);

    return {
      track: trackInfo,
      totalProblems: enrichedProblems.length,
      solvedCount,
      attemptedCount,
      masteredCount,
      needsRevisionCount,
      completionPercent,
      diffStats,
      topicStats,
      problems: enrichedProblems
    };
  }

  /**
   * Update problem status or notes
   */
  public static async updateProblemStatus(
    userId: string | Types.ObjectId,
    questionSlug: string,
    status: StudyProblemStatus,
    userNotes?: string
  ): Promise<StudyProgressItem> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const masterProblem = MASTER_PROBLEM_LIST.find((p) => p.slug === questionSlug) || {
      id: 9999,
      slug: questionSlug,
      title: questionSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      difficulty: 'Medium' as const,
      category: 'General'
    };

    const todayStr = this.getUtcDateString();
    let nextReview = todayStr;
    if (status === 'SOLVED') nextReview = this.addDaysToDateString(todayStr, 3);
    else if (status === 'MASTERED') nextReview = this.addDaysToDateString(todayStr, 30);
    else if (status === 'NEEDS_REVISION') nextReview = todayStr;

    const doc = await StudyProgress.findOneAndUpdate(
      { userId: userObjectId, questionSlug },
      {
        $set: {
          problemId: masterProblem.id,
          title: masterProblem.title,
          difficulty: masterProblem.difficulty,
          category: masterProblem.category,
          status,
          ...(userNotes !== undefined ? { userNotes } : {}),
          nextReviewDate: nextReview
        },
        $setOnInsert: {
          repetitionLevel: status === 'SOLVED' ? 1 : 0,
          easeFactor: 2.5,
          intervalDays: status === 'SOLVED' ? 3 : 1,
          history: []
        }
      },
      { upsert: true, new: true }
    );

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      problemId: doc.problemId,
      questionSlug: doc.questionSlug,
      title: doc.title,
      difficulty: doc.difficulty,
      category: doc.category,
      curricula: (doc.curricula || []) as CurriculumTrackId[],
      status: doc.status,
      userNotes: doc.userNotes,
      repetitionLevel: doc.repetitionLevel,
      easeFactor: doc.easeFactor,
      intervalDays: doc.intervalDays,
      lastReviewedAt: doc.lastReviewedAt ? doc.lastReviewedAt.toISOString() : undefined,
      nextReviewDate: doc.nextReviewDate,
      history: doc.history.map((h) => ({
        reviewedAt: h.reviewedAt.toISOString(),
        rating: h.rating,
        intervalDays: h.intervalDays
      })),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  /**
   * SuperMemo-2 Spaced Repetition Review Execution
   */
  public static async recordReview(
    userId: string | Types.ObjectId,
    questionSlug: string,
    rating: SrsRating,
    userNotes?: string
  ): Promise<StudyProgressItem> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const masterProblem = MASTER_PROBLEM_LIST.find((p) => p.slug === questionSlug) || {
      id: 9999,
      slug: questionSlug,
      title: questionSlug,
      difficulty: 'Medium' as const,
      category: 'General'
    };

    let doc = await StudyProgress.findOne({ userId: userObjectId, questionSlug });
    if (!doc) {
      doc = new StudyProgress({
        userId: userObjectId,
        problemId: masterProblem.id,
        questionSlug,
        title: masterProblem.title,
        difficulty: masterProblem.difficulty,
        category: masterProblem.category,
        status: 'SOLVED',
        repetitionLevel: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        nextReviewDate: this.getUtcDateString(),
        history: []
      });
    }

    const todayStr = this.getUtcDateString();
    let { repetitionLevel, easeFactor, intervalDays } = doc;

    // SuperMemo-2 Calculation
    if (rating === 'AGAIN') {
      repetitionLevel = 0;
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      doc.status = 'NEEDS_REVISION';
    } else if (rating === 'HARD') {
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      doc.status = 'SOLVED';
    } else if (rating === 'GOOD') {
      if (repetitionLevel === 0) intervalDays = 1;
      else if (repetitionLevel === 1) intervalDays = 3;
      else if (repetitionLevel === 2) intervalDays = 7;
      else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));

      repetitionLevel++;
      doc.status = repetitionLevel >= 5 ? 'MASTERED' : 'SOLVED';
    } else if (rating === 'EASY') {
      if (repetitionLevel === 0) intervalDays = 3;
      else if (repetitionLevel === 1) intervalDays = 7;
      else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor * 1.3));

      repetitionLevel++;
      easeFactor += 0.15;
      doc.status = repetitionLevel >= 3 ? 'MASTERED' : 'SOLVED';
    }

    const nextReview = this.addDaysToDateString(todayStr, intervalDays);

    doc.repetitionLevel = repetitionLevel;
    doc.easeFactor = easeFactor;
    doc.intervalDays = intervalDays;
    doc.lastReviewedAt = new Date();
    doc.nextReviewDate = nextReview;
    if (userNotes !== undefined) doc.userNotes = userNotes;

    doc.history.push({
      reviewedAt: new Date(),
      rating,
      intervalDays
    });

    await doc.save();

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      problemId: doc.problemId,
      questionSlug: doc.questionSlug,
      title: doc.title,
      difficulty: doc.difficulty,
      category: doc.category,
      curricula: (doc.curricula || []) as CurriculumTrackId[],
      status: doc.status,
      userNotes: doc.userNotes,
      repetitionLevel: doc.repetitionLevel,
      easeFactor: doc.easeFactor,
      intervalDays: doc.intervalDays,
      lastReviewedAt: doc.lastReviewedAt.toISOString(),
      nextReviewDate: doc.nextReviewDate,
      history: doc.history.map((h) => ({
        reviewedAt: h.reviewedAt.toISOString(),
        rating: h.rating,
        intervalDays: h.intervalDays
      })),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  /**
   * Fetch Spaced Repetition Queue categorized into Due Today, Overdue, and Upcoming
   */
  public static async getRevisionQueue(
    userId: string | Types.ObjectId
  ): Promise<RevisionQueueSummary> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const todayStr = this.getUtcDateString();

    const allItems = await StudyProgress.find({
      userId: userObjectId,
      status: { $ne: 'NOT_STARTED' }
    })
      .sort({ nextReviewDate: 1 })
      .lean();

    const dueToday: StudyProgressItem[] = [];
    const overdue: StudyProgressItem[] = [];
    const upcoming: StudyProgressItem[] = [];

    let totalMastered = 0;
    let totalNeedsRevision = 0;
    let totalSolved = 0;

    for (const item of allItems) {
      const isCountedAsSolved = item.status === 'SOLVED' || item.status === 'MASTERED' || item.status === 'NEEDS_REVISION';
      if (isCountedAsSolved) totalSolved++;
      if (item.status === 'MASTERED') totalMastered++;
      if (item.status === 'NEEDS_REVISION') totalNeedsRevision++;

      const mapped: StudyProgressItem = {
        id: item._id.toString(),
        userId: item.userId.toString(),
        problemId: item.problemId,
        questionSlug: item.questionSlug,
        title: item.title,
        difficulty: item.difficulty,
        category: item.category,
        curricula: (item.curricula || []) as CurriculumTrackId[],
        status: item.status,
        userNotes: item.userNotes,
        repetitionLevel: item.repetitionLevel,
        easeFactor: item.easeFactor,
        intervalDays: item.intervalDays,
        lastReviewedAt: item.lastReviewedAt ? item.lastReviewedAt.toISOString() : undefined,
        nextReviewDate: item.status === 'NEEDS_REVISION' ? todayStr : item.nextReviewDate,
        history: (item.history || []).map((h: any) => ({
          reviewedAt: h.reviewedAt.toISOString(),
          rating: h.rating,
          intervalDays: h.intervalDays
        })),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      };

      if (item.status === 'NEEDS_REVISION' || item.nextReviewDate <= todayStr) {
        if (item.nextReviewDate < todayStr && item.status !== 'NEEDS_REVISION') {
          overdue.push(mapped);
        } else {
          dueToday.push(mapped);
        }
      } else {
        upcoming.push(mapped);
      }
    }

    return {
      dueToday,
      overdue,
      upcoming,
      totalMastered,
      totalNeedsRevision,
      totalSolved
    };
  }
}

