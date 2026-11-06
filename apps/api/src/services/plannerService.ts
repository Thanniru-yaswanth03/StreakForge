import { Types } from 'mongoose';
import { CodingGoal } from '../models/CodingGoal.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { StudyProgress } from '../models/StudyProgress.js';
import type { CodingGoal as CodingGoalType, RoutineItem } from '@streakforge/shared-types';

export class PlannerService {
  public static async getPlanner(userId: string | Types.ObjectId): Promise<CodingGoalType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    let doc = await CodingGoal.findOne({ userId: userObjectId });
    if (!doc) {
      doc = await CodingGoal.create({
        userId: userObjectId,
        weekStartDate: todayStr
      });
    }

    // Compute verified activity completed today
    const [todaySubs, todayReviews] = await Promise.all([
      LeetCodeSubmission.find({
        userId: userObjectId,
        syncStatus: 'SYNCED',
        submittedAt: { $gte: startOfToday }
      }).lean(),
      StudyProgress.find({
        userId: userObjectId,
        lastReviewedAt: { $gte: startOfToday }
      }).lean()
    ]);

    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    for (const sub of todaySubs) {
      if (sub.difficulty === 'Easy') easyCount++;
      else if (sub.difficulty === 'Medium') mediumCount++;
      else if (sub.difficulty === 'Hard') hardCount++;
    }

    const completedToday = {
      easy: easyCount,
      medium: mediumCount,
      hard: hardCount,
      total: todaySubs.length,
      revisionCount: todayReviews.length
    };

    doc.completedToday = completedToday;
    await doc.save();

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      dailyTarget: doc.dailyTarget,
      weeklyTarget: doc.weeklyTarget,
      studyRoutines: doc.studyRoutines,
      completedToday,
      completedThisWeek: doc.completedThisWeek || todaySubs.length,
      weekStartDate: doc.weekStartDate
    };
  }

  public static async updateTargets(
    userId: string | Types.ObjectId,
    dailyTarget: { easy: number; medium: number; hard: number; revisionMinutes: number },
    weeklyTarget: number
  ): Promise<CodingGoalType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const doc = await CodingGoal.findOneAndUpdate(
      { userId: userObjectId },
      { $set: { dailyTarget, weeklyTarget } },
      { upsert: true, new: true }
    );

    return this.getPlanner(userId);
  }

  public static async updateRoutines(
    userId: string | Types.ObjectId,
    studyRoutines: RoutineItem[]
  ): Promise<CodingGoalType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    await CodingGoal.findOneAndUpdate(
      { userId: userObjectId },
      { $set: { studyRoutines } },
      { upsert: true, new: true }
    );

    return this.getPlanner(userId);
  }
}
