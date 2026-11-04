import { describe, it, expect } from 'vitest';
import { generateSolutionFiles, formatBytesToMb, getDifficultyColor } from './index.js';
import type { LeetCodeSubmissionInput } from '@streakforge/shared-types';

describe('Sync Engine - LeetCode Transformation', () => {
  const mockSubmission: LeetCodeSubmissionInput = {
    submissionId: '12345678',
    questionId: '1',
    questionTitle: 'Two Sum',
    questionSlug: 'two-sum',
    difficulty: 'Easy',
    language: 'typescript',
    code: 'function twoSum(nums: number[], target: number): number[] { return []; }',
    runtimeMs: 48,
    runtimePercentile: 91.5,
    memoryBytes: 52428800, // 50MB
    memoryPercentile: 82.3,
    submittedAt: '2026-11-04T12:00:00.000Z'
  };

  it('formats bytes to MB properly', () => {
    expect(formatBytesToMb(52428800)).toBe('50.0 MB');
  });

  it('returns proper difficulty colors', () => {
    expect(getDifficultyColor('Easy')).toBe('brightgreen');
    expect(getDifficultyColor('Medium')).toBe('orange');
    expect(getDifficultyColor('Hard')).toBe('red');
  });

  it('generates proper file paths and formatted README', () => {
    const res = generateSolutionFiles(mockSubmission);

    expect(res.codeFilePath).toBe('solutions/Easy/1-two-sum/two-sum.ts');
    expect(res.readmeFilePath).toBe('solutions/Easy/1-two-sum/README.md');
    expect(res.codeContent).toContain('Problem: 1. Two Sum');
    expect(res.codeContent).toContain('Performance: 48 ms');
    expect(res.readmeContent).toContain('# 1. [Two Sum]');
    expect(res.readmeContent).toContain('Difficulty-Easy-brightgreen');
    expect(res.commitMessage).toBe('feat(leetcode): solve [1] Two Sum (48ms, 50.0 MB)');
  });

  it('supports custom directory patterns', () => {
    const res = generateSolutionFiles(mockSubmission, 'src/leetcode/{difficulty}/{slug}');
    expect(res.codeFilePath).toBe('src/leetcode/Easy/two-sum/two-sum.ts');
    expect(res.readmeFilePath).toBe('src/leetcode/Easy/two-sum/README.md');
  });
});

