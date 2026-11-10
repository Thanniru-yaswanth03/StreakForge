import { Types } from 'mongoose';
import { MockInterviewSession, IMockProblem } from '../models/MockInterviewSession.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import type { MockInterviewSession as MockInterviewSessionType, InterviewDifficulty, Difficulty } from '@streakforge/shared-types';

export class MockInterviewService {
  public static async startSession(
    userId: string | Types.ObjectId,
    difficulty: InterviewDifficulty = 'MEDIUM',
    track: string = 'Blind 75'
  ): Promise<MockInterviewSessionType> {
    const userObjectId = new Types.ObjectId(userId.toString());

    // Select suitable problems from MASTER_PROBLEM_LIST
    let timeLimitMinutes = 45;
    let selectedProblems: typeof MASTER_PROBLEM_LIST = [];

    if (difficulty === 'EASY') {
      timeLimitMinutes = 30;
      selectedProblems = MASTER_PROBLEM_LIST.filter((p) => p.difficulty === 'Easy').slice(0, 2);
    } else if (difficulty === 'HARD') {
      timeLimitMinutes = 60;
      selectedProblems = MASTER_PROBLEM_LIST.filter((p) => p.difficulty === 'Hard').slice(0, 2);
      if (selectedProblems.length < 2) {
        selectedProblems = MASTER_PROBLEM_LIST.filter((p) => p.difficulty === 'Hard' || p.difficulty === 'Medium').slice(0, 2);
      }
    } else if (difficulty === 'RANDOM') {
      timeLimitMinutes = 60;
      const easy = MASTER_PROBLEM_LIST.find((p) => p.difficulty === 'Easy');
      const med = MASTER_PROBLEM_LIST.find((p) => p.difficulty === 'Medium');
      const hard = MASTER_PROBLEM_LIST.find((p) => p.difficulty === 'Hard');
      selectedProblems = [easy!, med!, hard!].filter(Boolean);
    } else {
      // Default MEDIUM
      timeLimitMinutes = 45;
      selectedProblems = MASTER_PROBLEM_LIST.filter((p) => p.difficulty === 'Medium').slice(0, 2);
    }

    const mockProblems: IMockProblem[] = selectedProblems.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      solved: false,
      notes: ''
    }));

    const doc = await MockInterviewSession.create({
      userId: userObjectId,
      track,
      difficulty,
      timeLimitMinutes,
      timeSpentSeconds: 0,
      problems: mockProblems,
      status: 'IN_PROGRESS',
      scorePercent: 0,
      feedback: 'Interview session active. Manage your pacing and test edge cases.'
    });

    return {
      id: doc._id.toString(),
      track: doc.track,
      difficulty: doc.difficulty,
      timeLimitMinutes: doc.timeLimitMinutes,
      timeSpentSeconds: doc.timeSpentSeconds,
      problems: doc.problems,
      status: doc.status,
      scorePercent: doc.scorePercent,
      feedback: doc.feedback,
      startedAt: doc.startedAt.toISOString()
    };
  }

  public static async completeSession(
    userId: string | Types.ObjectId,
    sessionId: string,
    timeSpentSeconds: number,
    problemResults: Array<{ slug: string; solved: boolean; notes?: string }>
  ): Promise<MockInterviewSessionType> {
    if (!Types.ObjectId.isValid(sessionId)) {
      const err: any = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    const doc = await MockInterviewSession.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId.toString())
    });
    if (!doc) {
      const err: any = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    const safeResults = Array.isArray(problemResults) ? problemResults : [];
    const safeTimeSpent = Math.max(0, Math.round(Number(timeSpentSeconds) || 0));

    let solvedCount = 0;
    doc.problems = doc.problems.map((p: any) => {
      const res = safeResults.find((r) => r.slug === p.slug);
      if (res && res.solved) {
        solvedCount++;
        return { ...p, solved: true, notes: res.notes || p.notes };
      }
      return { ...p, solved: res?.solved ?? false, notes: res?.notes || p.notes };
    });

    const scorePercent = Math.round((solvedCount / (doc.problems.length || 1)) * 100);
    doc.timeSpentSeconds = safeTimeSpent;
    doc.status = 'COMPLETED';
    doc.scorePercent = scorePercent;
    doc.completedAt = new Date();

    if (scorePercent === 100) {
      doc.feedback = 'Outstanding performance! Clean algorithmic logic delivered within the target interview time window.';
    } else if (scorePercent >= 50) {
      doc.feedback = 'Solid progress. Focus on time allocation and identifying edge-case inputs earlier in the solution lifecycle.';
    } else {
      doc.feedback = 'Keep practicing. Review foundational pattern templates in the Knowledge Vault before attempting timed sets.';
    }

    await doc.save();

    return {
      id: doc._id.toString(),
      track: doc.track,
      difficulty: doc.difficulty,
      timeLimitMinutes: doc.timeLimitMinutes,
      timeSpentSeconds: doc.timeSpentSeconds,
      problems: doc.problems,
      status: doc.status,
      scorePercent: doc.scorePercent,
      feedback: doc.feedback,
      startedAt: doc.startedAt.toISOString(),
      completedAt: doc.completedAt?.toISOString()
    };
  }

  public static async getSessions(userId: string | Types.ObjectId): Promise<MockInterviewSessionType[]> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const docs = await MockInterviewSession.find({ userId: userObjectId }).sort({ createdAt: -1 }).limit(10).lean();

    return docs.map((doc: any) => ({
      id: (doc._id as any).toString(),
      track: doc.track,
      difficulty: doc.difficulty,
      timeLimitMinutes: doc.timeLimitMinutes,
      timeSpentSeconds: doc.timeSpentSeconds,
      problems: doc.problems,
      status: doc.status,
      scorePercent: doc.scorePercent,
      feedback: doc.feedback,
      startedAt: doc.startedAt.toISOString(),
      completedAt: doc.completedAt?.toISOString()
    }));
  }
}
