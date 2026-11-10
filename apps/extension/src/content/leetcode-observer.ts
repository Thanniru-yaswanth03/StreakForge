import { LeetCodeDomExtractor } from './dom-extractor';
import type { DetectedSubmission, ActiveProblemContext } from '../shared/types';

console.log('[StreakForge] LeetCode authentic activity observer initialized.');

let lastObservedSubmissionId: string | null = null;
let lastReportedSlug: string | null = null;
let lastDispatchedSlug = '';
let lastDispatchedTime = 0;
let isUserSubmitting = false;
let submitTimestamp = 0;
let cachedSubmitCode = '';
let cachedSubmitLanguage = '';

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
 * Helper to dispatch submission payload to background worker
 */
function dispatchSubmission(submissionPayload: DetectedSubmission): void {
  const now = Date.now();
  if (
    lastObservedSubmissionId === submissionPayload.submissionId ||
    (lastDispatchedSlug === submissionPayload.questionSlug && now - lastDispatchedTime < 15000)
  ) {
    return;
  }
  lastObservedSubmissionId = submissionPayload.submissionId;
  lastDispatchedSlug = submissionPayload.questionSlug;
  lastDispatchedTime = now;

  console.log('[StreakForge] Dispatching verified submission to worker:', {
    id: submissionPayload.submissionId,
    verdict: submissionPayload.verdict,
    question: submissionPayload.questionTitle,
    language: submissionPayload.language,
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

/**
 * Hook into LeetCode's submit buttons
 */
function attachSubmitListeners(): void {
  const buttons = document.querySelectorAll(
    'button[data-e2e-locator="console-submit-button"], button'
  );

  buttons.forEach((btn) => {
    const text = btn.textContent?.trim() || '';
    const hasSubmitText = /submit/i.test(text);
    const hasAttr = btn.getAttribute('data-e2e-locator') === 'console-submit-button';

    if ((hasSubmitText || hasAttr) && !(btn as any).__streakforge_attached) {
      (btn as any).__streakforge_attached = true;
      btn.addEventListener('click', () => {
        isUserSubmitting = true;
        submitTimestamp = Date.now();
        cachedSubmitCode = LeetCodeDomExtractor.extractEditorCode();
        cachedSubmitLanguage = LeetCodeDomExtractor.extractLanguage(cachedSubmitCode);
        console.log('[StreakForge] Submit button click intercepted. Language:', cachedSubmitLanguage);
      });
    }
  });
}

/**
 * Scans for submission events and results in the DOM (fallback to interceptor)
 */
function checkSubmissionResult(): void {
  // Only check if user recently submitted or if viewing a submission detail page
  const isSubmissionDetailPage = window.location.pathname.includes('/submissions/');
  const isRecentSubmit = isUserSubmitting && (Date.now() - submitTimestamp < 90000);

  if (!isRecentSubmit && !isSubmissionDetailPage) {
    return;
  }

  const result = LeetCodeDomExtractor.extractSubmissionResult();
  if (!result || result.verdict !== 'Accepted') return;

  // Prevent duplicate submissions of the exact same result
  if (lastObservedSubmissionId === result.submissionId) {
    return;
  }

  const code = cachedSubmitCode || LeetCodeDomExtractor.extractEditorCode();
  if (!code || code.trim().length === 0) {
    console.warn('[StreakForge] Source code not yet available in DOM. Waiting...');
    return;
  }

  const problem = LeetCodeDomExtractor.extractProblemDetails();
  const language = LeetCodeDomExtractor.extractLanguage(code) || cachedSubmitLanguage || 'javascript';

  isUserSubmitting = false;

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
    verdict: 'Accepted',
    topicTags: problem.topicTags,
    submittedAt: new Date().toISOString(),
    state: 'DETECTED'
  };

  dispatchSubmission(submissionPayload);
}

// 1. Listen for Main World Interceptor Messages (Direct API Interception)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'STREAKFORGE_VERIFIED_SUBMISSION') {
    const raw = event.data.payload;
    if (!raw || raw.verdict !== 'Accepted') {
      isUserSubmitting = false;
      return;
    }

    const problem = LeetCodeDomExtractor.extractProblemDetails();
    const code = raw.code || cachedSubmitCode || LeetCodeDomExtractor.extractEditorCode();
    const language = raw.language || LeetCodeDomExtractor.extractLanguage(code) || 'javascript';

    const submissionPayload: DetectedSubmission = {
      submissionId: String(raw.submissionId),
      questionId: String(raw.questionId || problem.id),
      questionTitle: problem.title,
      questionSlug: raw.questionSlug || problem.slug,
      difficulty: problem.difficulty,
      language,
      code,
      runtimeMs: raw.runtimeMs || 0,
      runtimePercentile: raw.runtimePercentile || 0,
      memoryBytes: raw.memoryBytes || 0,
      memoryPercentile: raw.memoryPercentile || 0,
      verdict: 'Accepted',
      topicTags: problem.topicTags,
      submittedAt: raw.submittedAt || new Date().toISOString(),
      state: 'DETECTED'
    };

    isUserSubmitting = false;
    dispatchSubmission(submissionPayload);
  }
});

// 2. Observe DOM mutations
const observer = new MutationObserver(() => {
  reportActiveProblem();
  attachSubmitListeners();
  checkSubmissionResult();
});

function initObserver(): void {
  reportActiveProblem();
  attachSubmitListeners();
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

// 3. Floating on-screen notification widget
function showOnScreenToast(data: {
  title: string;
  language: string;
  difficulty?: string;
  commitSha?: string;
  commitUrl?: string;
  repo?: string;
}) {
  const existing = document.getElementById('streakforge-sync-toast');
  if (existing) existing.remove();

  if (!document.getElementById('streakforge-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'streakforge-toast-styles';
    style.textContent = `
      @keyframes streakforge-slide-in {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes streakforge-slide-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement('div');
  toast.id = 'streakforge-sync-toast';
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #0d1117;
    color: #e6edf3;
    border: 1px solid #238636;
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.7), 0 0 20px rgba(35,134,54,0.35);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    min-width: 320px;
    max-width: 420px;
    animation: streakforge-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const shortSha = data.commitSha ? data.commitSha.slice(0, 7) : 'verified';
  const rawLink = data.commitUrl || (data.repo ? `https://github.com/${data.repo}` : '#');
  const commitLink = rawLink.startsWith('https://') ? rawLink : '#';

  // Build DOM nodes with textContent to avoid HTML injection from problem/repo names
  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px;';

  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const badgeIcon = document.createElement('div');
  badgeIcon.style.cssText = 'width: 22px; height: 22px; border-radius: 50%; background: #238636; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: #fff;';
  badgeIcon.textContent = '✓';
  const badgeText = document.createElement('span');
  badgeText.style.cssText = 'font-size: 13px; font-weight: 700; color: #3fb950; letter-spacing: 0.2px;';
  badgeText.textContent = 'StreakForge Synced to GitHub!';
  titleWrap.append(badgeIcon, badgeText);

  const closeButton = document.createElement('button');
  closeButton.id = 'streakforge-toast-close';
  closeButton.style.cssText = 'background: none; border: none; color: #8b949e; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 4px;';
  closeButton.textContent = '✕';
  headerRow.append(titleWrap, closeButton);

  const detailRow = document.createElement('div');
  detailRow.style.cssText = 'font-size: 12px; color: #c9d1d9; font-weight: 600;';
  detailRow.textContent = `${data.title} `;
  const langSpan = document.createElement('span');
  langSpan.style.cssText = 'font-size: 11px; font-weight: normal; color: #8b949e;';
  langSpan.textContent = `(${data.language})`;
  detailRow.appendChild(langSpan);

  const footerRow = document.createElement('div');
  footerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #8b949e; margin-top: 2px;';
  const repoSpan = document.createElement('span');
  repoSpan.textContent = 'Repo: ';
  const repoStrong = document.createElement('strong');
  repoStrong.style.color = '#e6edf3';
  repoStrong.textContent = data.repo || 'Target Repo';
  repoSpan.appendChild(repoStrong);

  const commitAnchor = document.createElement('a');
  commitAnchor.href = commitLink;
  commitAnchor.target = '_blank';
  commitAnchor.rel = 'noopener noreferrer';
  commitAnchor.style.cssText = 'color: #58a6ff; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 2px;';
  commitAnchor.textContent = `Commit ${shortSha} ↗`;
  footerRow.append(repoSpan, commitAnchor);

  toast.append(headerRow, detailRow, footerRow);

  document.body.appendChild(toast);

  const closeBtn = closeButton;
  const dismiss = () => {
    toast.style.animation = 'streakforge-slide-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn?.addEventListener('click', dismiss);
  setTimeout(dismiss, 6500);
}

// 4. Listen for runtime messages from Popup & Background Worker
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SHOW_ON_SCREEN_SYNC_TOAST') {
      showOnScreenToast(message.payload);
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'MANUAL_CAPTURE_REQUEST') {
      const code = LeetCodeDomExtractor.extractEditorCode();
      const language = LeetCodeDomExtractor.extractLanguage();
      const problem = LeetCodeDomExtractor.extractProblemDetails();
      const result = LeetCodeDomExtractor.extractSubmissionResult();

      sendResponse({
        success: true,
        payload: {
          code,
          language,
          problem,
          result
        }
      });
      return true;
    }
  });
}
