import { describe, it, expect } from 'vitest';
import { SubmissionStateMachine } from '../src/shared/stateMachine';
import { DuplicateRegistry, generateSubmissionKey } from '../src/shared/duplicateRegistry';
import { resolveSolutionPath, sanitizeSegment, normalizeTopic } from '../src/shared/templateResolver';
import type { DetectedSubmission } from '../src/shared/types';

describe('Phase 4 — LeetCode Chrome Extension Unit & Flow Tests', () => {
  const sampleAcceptedSubmission: DetectedSubmission = {
    submissionId: '987654321',
    questionId: '1',
    questionTitle: 'Two Sum',
    questionSlug: 'two-sum',
    difficulty: 'Easy',
    language: 'python3',
    code: 'class Solution:\n    def twoSum(self, nums, target):\n        return []',
    runtimeMs: 42,
    runtimePercentile: 88.5,
    memoryBytes: 16777216,
    memoryPercentile: 74.2,
    verdict: 'Accepted',
    topicTags: ['Array', 'Hash Table'],
    submittedAt: '2026-11-04T12:00:00.000Z',
    state: 'DETECTED'
  };

  describe('1. Submission State Machine (11-State Architecture)', () => {
    it('executes valid full happy path: DETECTED -> VALIDATING -> ACCEPTED -> SOURCE_RETRIEVAL_PENDING -> SOURCE_RETRIEVED -> EXPORT_PENDING -> EXPORTING -> SYNCED', () => {
      // 1. DETECTED -> VALIDATING
      const t1 = SubmissionStateMachine.transition(sampleAcceptedSubmission, 'VALIDATING');
      expect(t1.submission.state).toBe('VALIDATING');
      expect(t1.log.fromState).toBe('DETECTED');
      expect(t1.log.toState).toBe('VALIDATING');

      // 2. VALIDATING -> ACCEPTED
      const t2 = SubmissionStateMachine.transition(t1.submission, 'ACCEPTED');
      expect(t2.submission.state).toBe('ACCEPTED');

      // 3. ACCEPTED -> SOURCE_RETRIEVAL_PENDING
      const t3 = SubmissionStateMachine.transition(t2.submission, 'SOURCE_RETRIEVAL_PENDING');
      expect(t3.submission.state).toBe('SOURCE_RETRIEVAL_PENDING');

      // 4. SOURCE_RETRIEVAL_PENDING -> SOURCE_RETRIEVED
      const t4 = SubmissionStateMachine.transition(t3.submission, 'SOURCE_RETRIEVED');
      expect(t4.submission.state).toBe('SOURCE_RETRIEVED');

      // 5. SOURCE_RETRIEVED -> EXPORT_PENDING
      const t5 = SubmissionStateMachine.transition(t4.submission, 'EXPORT_PENDING');
      expect(t5.submission.state).toBe('EXPORT_PENDING');

      // 6. EXPORT_PENDING -> EXPORTING
      const t6 = SubmissionStateMachine.transition(t5.submission, 'EXPORTING');
      expect(t6.submission.state).toBe('EXPORTING');

      // 7. EXPORTING -> SYNCED
      const t7 = SubmissionStateMachine.transition(t6.submission, 'SYNCED');
      expect(t7.submission.state).toBe('SYNCED');
    });

    it('guard check: throws when transitioning to SOURCE_RETRIEVED with empty code', () => {
      const emptyCodeSubmission: DetectedSubmission = {
        ...sampleAcceptedSubmission,
        code: '   ',
        state: 'SOURCE_RETRIEVAL_PENDING'
      };

      expect(() => {
        SubmissionStateMachine.transition(emptyCodeSubmission, 'SOURCE_RETRIEVED');
      }).toThrow(/Cannot transition to SOURCE_RETRIEVED with empty source code/);
    });

    it('guard check: throws when transitioning to ACCEPTED if verdict is not Accepted', () => {
      const wrongAnswerSubmission: DetectedSubmission = {
        ...sampleAcceptedSubmission,
        verdict: 'Wrong Answer',
        state: 'VALIDATING'
      };

      expect(() => {
        SubmissionStateMachine.transition(wrongAnswerSubmission, 'ACCEPTED');
      }).toThrow(/cannot transition to ACCEPTED/);
    });

    it('correctly transitions non-accepted verdicts to REJECTED', () => {
      const tleSubmission: DetectedSubmission = {
        ...sampleAcceptedSubmission,
        verdict: 'Time Limit Exceeded',
        state: 'VALIDATING'
      };

      const tReject = SubmissionStateMachine.transition(
        tleSubmission,
        'REJECTED',
        'Time Limit Exceeded observed'
      );
      expect(tReject.submission.state).toBe('REJECTED');
      expect(tReject.log.reason).toContain('Time Limit Exceeded');
    });

    it('handles transient network failure by transitioning from EXPORTING to RETRY_PENDING', () => {
      const exportingSub: DetectedSubmission = {
        ...sampleAcceptedSubmission,
        state: 'EXPORTING'
      };

      const tRetry = SubmissionStateMachine.transition(
        exportingSub,
        'RETRY_PENDING',
        'Network unreachable: ECONNREFUSED'
      );
      expect(tRetry.submission.state).toBe('RETRY_PENDING');
    });

    it('blocks illegal direct state skips (e.g. DETECTED -> SYNCED)', () => {
      expect(() => {
        SubmissionStateMachine.transition(sampleAcceptedSubmission, 'SYNCED');
      }).toThrow(/Invalid submission state transition/);
    });
  });

  describe('2. Duplicate Prevention & Idempotency', () => {
    it('generates consistent deterministic keys across user, submission ID, and target repo', () => {
      const key1 = generateSubmissionKey('OctoCat', '12345', 'octocat/leetcode-repo');
      const key2 = generateSubmissionKey('octocat ', '12345', 'OCTOCAT/LEETCODE-REPO ');
      expect(key1).toBe('octocat:12345:octocat/leetcode-repo');
      expect(key1).toBe(key2);
    });
  });

  describe('3. Template Path Resolver & Sanitization', () => {
    it('resolves standard template with language, topic, and padded ID', () => {
      const resolved = resolveSolutionPath(
        'leetcode-solutions/{Language}/{Topic}/{id}_{slug}{ext}',
        {
          language: 'python3',
          topic: 'Arrays',
          difficulty: 'Easy',
          questionId: '1',
          questionSlug: 'two-sum'
        }
      );

      expect(resolved.dirPath).toBe('leetcode-solutions/Python/Arrays');
      expect(resolved.codeFileName).toBe('001_two-sum.py');
      expect(resolved.codeFilePath).toBe('leetcode-solutions/Python/Arrays/001_two-sum.py');
      expect(resolved.readmeFilePath).toBe('leetcode-solutions/Python/Arrays/README.md');
    });

    it('resolves difficulty-first directory pattern', () => {
      const resolved = resolveSolutionPath('{Difficulty}/{id}-{slug}', {
        language: 'java',
        difficulty: 'Medium',
        questionId: '146',
        questionSlug: 'lru-cache'
      });

      expect(resolved.dirPath).toBe('Medium/146-lru-cache');
      expect(resolved.codeFileName).toBe('lru-cache.java');
      expect(resolved.codeFilePath).toBe('Medium/146-lru-cache/lru-cache.java');
    });

    it('correctly maps extensions for C++, TypeScript, Go, and Rust', () => {
      const cppRes = resolveSolutionPath('{Language}/{slug}{ext}', {
        language: 'cpp',
        difficulty: 'Hard',
        questionId: '4',
        questionSlug: 'median-of-two-arrays'
      });
      expect(cppRes.codeFileName).toBe('median-of-two-arrays.cpp');

      const tsRes = resolveSolutionPath('{Language}/{slug}{ext}', {
        language: 'typescript',
        difficulty: 'Easy',
        questionId: '21',
        questionSlug: 'merge-two-sorted-lists'
      });
      expect(tsRes.codeFileName).toBe('merge-two-sorted-lists.ts');

      const goRes = resolveSolutionPath('{Language}/{slug}{ext}', {
        language: 'golang',
        difficulty: 'Medium',
        questionId: '200',
        questionSlug: 'number-of-islands'
      });
      expect(goRes.codeFileName).toBe('number-of-islands.go');

      const rustRes = resolveSolutionPath('{Language}/{slug}{ext}', {
        language: 'rust',
        difficulty: 'Hard',
        questionId: '42',
        questionSlug: 'trapping-rain-water'
      });
      expect(rustRes.codeFileName).toBe('trapping-rain-water.rs');
    });

    it('sanitizes dangerous path traversal segments', () => {
      const sanitized = sanitizeSegment('../../etc/passwd');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');

      const cleanTopic = normalizeTopic('');
      expect(cleanTopic).toBe('General');
    });
  });
});
