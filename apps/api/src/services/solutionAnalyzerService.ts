import { Types } from 'mongoose';
import { ProblemSolutionRecord } from '../models/ProblemSolutionRecord.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import type { ProblemSolutionRecord as ProblemSolutionRecordType, SolutionApproach, Difficulty } from '@streakforge/shared-types';

export class SolutionAnalyzerService {
  public static async getSolutionRecord(
    userId: string | Types.ObjectId,
    questionSlug: string
  ): Promise<ProblemSolutionRecordType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const slug = questionSlug.toLowerCase();

    let doc = await ProblemSolutionRecord.findOne({
      userId: userObjectId,
      questionSlug: slug
    });

    if (!doc) {
      const master = MASTER_PROBLEM_LIST.find((p) => p.slug.toLowerCase() === slug) || {
        id: 1,
        slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        difficulty: 'Medium' as Difficulty,
        category: 'General'
      };

      // Seed initial default canonical approaches
      const defaultApproaches: SolutionApproach[] = [
        {
          id: 'approach_1',
          name: 'Brute Force Search',
          timeComplexity: 'O(n²)',
          spaceComplexity: 'O(1)',
          language: 'javascript',
          code: `// Brute Force Approach\nfunction solve(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) return [i, j];\n    }\n  }\n  return [];\n}`,
          explanation: 'Iterates through all possible pairs and checks if their sum matches the target.',
          tradeoffs: 'Simple to implement with O(1) auxiliary space, but unacceptable O(n²) time complexity for large constraints.',
          isOptimal: false
        },
        {
          id: 'approach_2',
          name: 'Optimized Hash Map Lookup',
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(n)',
          language: 'javascript',
          code: `// Optimal One-Pass Hash Table\nfunction solve(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
          explanation: 'Maintains a complement map to perform instantaneous O(1) index lookups in a single pass.',
          tradeoffs: 'Trades O(n) memory space to achieve an optimal linear O(n) time runtime.',
          isOptimal: true
        }
      ];

      doc = await ProblemSolutionRecord.create({
        userId: userObjectId,
        questionSlug: slug,
        questionTitle: master.title,
        difficulty: master.difficulty,
        approaches: defaultApproaches,
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(n)',
        patterns: [master.category]
      });
    }

    return {
      id: doc._id.toString(),
      questionSlug: doc.questionSlug,
      questionTitle: doc.questionTitle,
      difficulty: doc.difficulty,
      approaches: doc.approaches,
      optimalTimeComplexity: doc.optimalTimeComplexity,
      optimalSpaceComplexity: doc.optimalSpaceComplexity,
      patterns: doc.patterns,
      lastUpdated: doc.updatedAt.toISOString()
    };
  }

  public static async addApproach(
    userId: string | Types.ObjectId,
    questionSlug: string,
    approach: Omit<SolutionApproach, 'id'>
  ): Promise<ProblemSolutionRecordType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const slug = questionSlug.toLowerCase();

    const record = await this.getSolutionRecord(userId, slug);
    const newApproach: SolutionApproach = {
      ...approach,
      id: `approach_${Date.now()}`
    };

    const updated = await ProblemSolutionRecord.findOneAndUpdate(
      { userId: userObjectId, questionSlug: slug },
      { $push: { approaches: newApproach } },
      { new: true }
    );

    return {
      id: updated!._id.toString(),
      questionSlug: updated!.questionSlug,
      questionTitle: updated!.questionTitle,
      difficulty: updated!.difficulty,
      approaches: updated!.approaches,
      optimalTimeComplexity: updated!.optimalTimeComplexity,
      optimalSpaceComplexity: updated!.optimalSpaceComplexity,
      patterns: updated!.patterns,
      lastUpdated: updated!.updatedAt.toISOString()
    };
  }
}

