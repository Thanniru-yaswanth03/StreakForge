import { LeetCodeDomExtractor } from './dom-extractor';
import type { DetectedSubmission, ActiveProblemContext } from '../shared/types';

console.log('[StreakForge] LeetCode authentic activity observer initialized.');

let lastObservedSubmissionId: string | null = null;
let lastObservedVerdict: string | null = null;
let lastReportedSlug: string | null = null;

/**
 * Broadcasts currently viewed problem details to background worker and popup
 */
function reportActiveProblem(): void {
  const slug = LeetCodeDomExtractor.getProblemSlug();
  if (!slug || slug === lastReportedSlug) return;

  const details = LeetCodeDomExtractor.extractProblemDetails();
  const language = LeetCodeDomExtractor.extractLanguage();

  const payload: ActiveProblemContext = {
    title: details.title,
    slug: details.slug,
    id: details.id,
    difficulty: details.difficulty,
    language,
    topicTags: details.topicTags,
    detectedAt: new Date().toISOString()
  };

  lastReportedSlug = slug;

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'PROBLEM_VIEWED',
      payload
    }).catch(() => {
      // Background worker might be idle
    });
  }
}

/**
 * Scans for submission events and results
 */
function checkSubmissionResult(): void {
  const result = LeetCodeDomExtractor.extractSubmissionResult();
  if (!result) return;

  // Debounce duplicate notifications for same result
  if (
    lastObservedSubmissionId === result.submissionId &&
    lastObservedVerdict === result.verdict
  ) {
    return;
  }

  lastObservedSubmissionId = result.submissionId;
  lastObservedVerdict = result.verdict;

  const problem = LeetCodeDomExtractor.extractProblemDetails();
  const language = LeetCodeDomExtractor.extractLanguage();
  const code = LeetCodeDomExtractor.extractEditorCode();

  const submissionPayload: DetectedSubmission = {
    submissionId: result.submissionId,
    questionId: problem.id,
    questionTitle: problem.title,
    questionSlug: problem.slug,
    difficulty: problem.difficulty,
    language,
    code,
    runtimeMs: result.runtimeMs,
    runtimePercentile: result.runtimePercentile,
    memoryBytes: result.memoryBytes,
    memoryPercentile: result.memoryPercentile,
    verdict: result.verdict,
    topicTags: problem.topicTags,
    submittedAt: new Date().toISOString(),
    state: 'DETECTED'
  };

  console.log('[StreakForge] Submission event observed:', {
    id: submissionPayload.submissionId,
    verdict: submissionPayload.verdict,
    question: submissionPayload.questionTitle,
    codeLength: submissionPayload.code.length
  });

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'LEETCODE_SUBMISSION_DETECTED',
      payload: submissionPayload
    }).catch((err) => {
      console.warn('[StreakForge] Failed to dispatch submission message to worker:', err);
    });
  }
}

// Observe DOM mutations
const observer = new MutationObserver(() => {
  reportActiveProblem();
  checkSubmissionResult();
});

function initObserver(): void {
  reportActiveProblem();
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initObserver);
} else {
  initObserver();
}

// Listen for manual capture requests from Popup
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'MANUAL_CAPTURE_REQUEST') {
      const code = LeetCodeDomExtractor.extractEditorCode();
      const language = LeetCodeDomExtractor.extractLanguage();
      const problem = LeetCodeDomExtractor.extractProblemDetails();

      sendResponse({
        success: true,
        payload: {
          code,
          language,
          problem
        }
      });
      return true;
    }
  });
}
