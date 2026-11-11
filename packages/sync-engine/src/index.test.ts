import { describe, it, expect, vi } from 'vitest';
import {
  generateSolutionFiles,
  exportSolutionToGitHub,
  formatBytesToMb,
  getDifficultyColor
} from './index.js';
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

  it('supports padded IDs, Language/Topic tokens, solution.ext naming, and raw code preservation', () => {
    const javaSub: LeetCodeSubmissionInput = {
      ...mockSubmission,
      language: 'java',
      code: 'class Solution {}',
      runtimeMs: 0,
      runtimePercentile: 0,
      memoryBytes: 0,
      memoryPercentile: 0,
      topicTags: ['Array', 'Hash Table']
    };

    const paddedRes = generateSolutionFiles(javaSub, {
      folderPattern: '{Difficulty}/{id4}-{slug}',
      fileNamingPattern: 'solution{ext}',
      includeHeader: false,
      includeMetrics: true
    });
    expect(paddedRes.codeFilePath).toBe('Easy/0001-two-sum/solution.java');
    expect(paddedRes.readmeFilePath).toBe('Easy/0001-two-sum/README.md');
    expect(paddedRes.codeContent).toBe('class Solution {}');
    expect(paddedRes.readmeContent).toContain('Verdict');
    expect(paddedRes.readmeContent).not.toContain('0 ms');
    expect(paddedRes.commitMessage).toBe('feat(leetcode): solve [1] Two Sum');

    const fullPathRes = generateSolutionFiles(javaSub, 'leetcode-solutions/{Language}/{Topic}/{id4}_{slug}{ext}');
    expect(fullPathRes.codeFilePath).toBe('leetcode-solutions/Java/Array/0001_two-sum.java');
    expect(fullPathRes.readmeFilePath).toBe('leetcode-solutions/Java/Array/README.md');
  });

  it('commits atomically via Git Data API and verifies committed SHA with GitHub', async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: 'head_sha_1' } } });
    const getCommitGit = vi.fn().mockResolvedValue({ data: { tree: { sha: 'base_tree_1' } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: 'blob_sha_1' } });
    const createTree = vi.fn().mockResolvedValue({ data: { sha: 'tree_sha_1' } });
    const createCommit = vi.fn().mockResolvedValue({
      data: { sha: 'new_commit_sha_99', html_url: 'https://github.com/user/repo/commit/new_commit_sha_99' }
    });
    const updateRef = vi.fn().mockResolvedValue({});
    const verifyCommitRepos = vi.fn().mockResolvedValue({ data: { sha: 'new_commit_sha_99' } });

    const mockOctokit: any = {
      rest: {
        git: {
          getRef,
          getCommit: getCommitGit,
          createBlob,
          createTree,
          createCommit,
          updateRef
        },
        repos: {
          getCommit: verifyCommitRepos,
          getContent: vi.fn(),
          createOrUpdateFileContents: vi.fn()
        }
      }
    };

    const res = await exportSolutionToGitHub(
      mockOctokit,
      'testuser/leetcode-hustle',
      'main',
      mockSubmission,
      { name: 'Test User', email: 'test@example.com' },
      '{Difficulty}/{id4}-{slug}',
      { fileNamingPattern: 'solution{ext}' }
    );

    expect(res.verified).toBe(true);
    expect(res.commitSha).toBe('new_commit_sha_99');
    expect(res.codeFilePath).toBe('Easy/0001-two-sum/solution.ts');
    expect(createBlob).toHaveBeenCalledTimes(2);
    expect(verifyCommitRepos).toHaveBeenCalledWith({
      owner: 'testuser',
      repo: 'leetcode-hustle',
      ref: 'new_commit_sha_99'
    });
  });

  it('throws verification error if GitHub getCommit SHA mismatches instead of reporting success', async () => {
    const mockOctokit: any = {
      rest: {
        git: {
          getRef: vi.fn().mockResolvedValue({ data: { object: { sha: 'head_sha_1' } } }),
          getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: 'base_tree_1' } } }),
          createBlob: vi.fn().mockResolvedValue({ data: { sha: 'blob_1' } }),
          createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree_1' } }),
          createCommit: vi.fn().mockResolvedValue({ data: { sha: 'sha_expected' } }),
          updateRef: vi.fn().mockResolvedValue({})
        },
        repos: {
          getCommit: vi.fn().mockResolvedValue({ data: { sha: 'sha_different' } })
        }
      }
    };

    await expect(
      exportSolutionToGitHub(
        mockOctokit,
        'testuser/repo',
        'main',
        mockSubmission,
        { name: 'Test', email: 'test@example.com' }
      )
    ).rejects.toThrow('Commit verification mismatch');
  });
});

