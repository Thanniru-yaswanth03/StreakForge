import { LeetCodeDomExtractor } from './dom-extractor';
import type { DetectedSubmission, ActiveProblemContext } from '../shared/types';

console.log('[StreakForge] LeetCode authentic activity observer initialized.');

let lastVerifiedSubmissionId: string | null = null;
let lastDispatchedTime = 0;
let lastDispatchedWasVerified = false;
let lastReportedSlug: string | null = null;
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
    chrome.runtime
      .sendMessage({
        type: 'PROBLEM_VIEWED',
        payload
      })
      .catch(() => {});
  }
}

/**
 * Helper to dispatch submission payload to background worker.
 * Verified interceptor submissions ALWAYS take precedence over fallback DOM detections.
 */
function dispatchSubmission(
  submissionPayload: DetectedSubmission,
  isVerifiedInterceptor: boolean = false
): void {
  if (!submissionPayload.code || LeetCodeDomExtractor.isLikelyNonCodeSnippet(submissionPayload.code)) {
    console.warn('[StreakForge] Refusing dispatch of empty or non-code snippet');
    return;
  }

  const now = Date.now();
  if (lastVerifiedSubmissionId === submissionPayload.submissionId) {
    return;
  }

  // Never let DOM fallback shadow/block an authentic verified interceptor event!
  if (!isVerifiedInterceptor && lastDispatchedWasVerified && now - lastDispatchedTime < 30000) {
    return;
  }
  if (!isVerifiedInterceptor && !lastDispatchedWasVerified && now - lastDispatchedTime < 15000) {
    return;
  }

  lastVerifiedSubmissionId = submissionPayload.submissionId;
  lastDispatchedTime = now;
  lastDispatchedWasVerified = isVerifiedInterceptor;

  console.log('[StreakForge] Dispatching verified submission to worker:', {
    id: submissionPayload.submissionId,
    verdict: submissionPayload.verdict,
    question: submissionPayload.questionTitle,
    language: submissionPayload.language,
    codeLength: submissionPayload.code.length
  });

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime
      .sendMessage({
        type: 'LEETCODE_SUBMISSION_DETECTED',
        payload: submissionPayload
      })
      .catch((err) => {
        console.warn('[StreakForge] Failed to dispatch submission message to worker:', err);
      });
  }
}

/**
 * Hook into LeetCode's submit buttons and capture exact Monaco code via MAIN world bridge
 */
function attachSubmitListeners(): void {
  const buttons = document.querySelectorAll(
    'button[data-e2e-locator="console-submit-button"], button'
  );

  buttons.forEach((btn) => {
    const text = btn.textContent?.trim() || '';
    const hasSubmitText = /^submit$/i.test(text) || text.toLowerCase() === 'submit';
    const hasAttr = btn.getAttribute('data-e2e-locator') === 'console-submit-button';

    if ((hasSubmitText || hasAttr) && !(btn as any).__streakforge_attached) {
      (btn as any).__streakforge_attached = true;
      btn.addEventListener('click', async () => {
        isUserSubmitting = true;
        submitTimestamp = Date.now();
        cachedSubmitCode = '';
        cachedSubmitLanguage = '';

        const mainState = await LeetCodeDomExtractor.requestMainWorldEditorState(500);
        if (mainState.code && !LeetCodeDomExtractor.isLikelyNonCodeSnippet(mainState.code)) {
          cachedSubmitCode = mainState.code;
          cachedSubmitLanguage =
            mainState.language || LeetCodeDomExtractor.extractLanguage(mainState.code);
        } else {
          const domCode = LeetCodeDomExtractor.extractEditorCode();
          if (domCode && !LeetCodeDomExtractor.isLikelyNonCodeSnippet(domCode)) {
            cachedSubmitCode = domCode;
            cachedSubmitLanguage = LeetCodeDomExtractor.extractLanguage(domCode);
          }
        }
      });
    }
  });
}

async function enrichSubmissionWithGraphQL(
  submissionId: string,
  slug: string
): Promise<{
  code?: string;
  questionId?: string;
  questionTitle?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topicTags?: string[];
  language?: string;
  runtimeMs?: number;
  runtimePercentile?: number;
  memoryBytes?: number;
  memoryPercentile?: number;
}> {
  const result: any = {};

  if (submissionId && /^\d+$/.test(submissionId)) {
    try {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query submissionDetails($submissionId: Int!) {
              submissionDetails(submissionId: $submissionId) {
                code
                runtimeDisplay
                runtimePercentile
                memoryDisplay
                memoryPercentile
                lang { name }
                question {
                  questionFrontendId
                  title
                  titleSlug
                  difficulty
                  topicTags { name }
                }
              }
            }
          `,
          variables: { submissionId: Number(submissionId) }
        })
      });
      if (res.ok) {
        const json = await res.json();
        const details = json?.data?.submissionDetails;
        if (details) {
          if (details.code) result.code = details.code;
          if (details.lang?.name) result.language = details.lang.name;
          const rt = parseFloat(String(details.runtimeDisplay || '').replace(/[^0-9.]/g, ''));
          if (Number.isFinite(rt)) result.runtimeMs = rt;
          if (Number.isFinite(details.runtimePercentile)) {
            result.runtimePercentile = details.runtimePercentile;
          }
          const memMb = parseFloat(String(details.memoryDisplay || '').replace(/[^0-9.]/g, ''));
          if (Number.isFinite(memMb)) result.memoryBytes = Math.round(memMb * 1024 * 1024);
          if (Number.isFinite(details.memoryPercentile)) {
            result.memoryPercentile = details.memoryPercentile;
          }
          if (details.question) {
            result.questionId = String(details.question.questionFrontendId || '');
            result.questionTitle = details.question.title;
            if (['Easy', 'Medium', 'Hard'].includes(details.question.difficulty)) {
              result.difficulty = details.question.difficulty;
            }
            if (Array.isArray(details.question.topicTags)) {
              result.topicTags = details.question.topicTags.map((t: any) => t.name);
            }
          }
        }
      }
    } catch {
      // Best-effort GraphQL enrichment
    }
  }

  if ((!result.questionId || !result.difficulty) && slug) {
    try {
      const qRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query questionData($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                questionFrontendId
                title
                difficulty
                topicTags { name }
              }
            }
          `,
          variables: { titleSlug: slug }
        })
      });
      if (qRes.ok) {
        const qJson = await qRes.json();
        const q = qJson?.data?.question;
        if (q) {
          result.questionId = result.questionId || String(q.questionFrontendId || '');
          result.questionTitle = result.questionTitle || q.title;
          if (!result.difficulty && ['Easy', 'Medium', 'Hard'].includes(q.difficulty)) {
            result.difficulty = q.difficulty;
          }
          if (!result.topicTags && Array.isArray(q.topicTags)) {
            result.topicTags = q.topicTags.map((t: any) => t.name);
          }
        }
      }
    } catch {
      // Keep DOM fallback
    }
  }

  return result;
}

/**
 * Fetch the latest accepted submission for the active problem slug via LeetCode GraphQL (used on manual Sync Now)
 */
async function fetchLatestAcceptedForProblem(slug: string): Promise<{
  submissionId: string;
  code: string;
  language: string;
  runtimeMs: number;
  runtimePercentile: number;
  memoryBytes: number;
  memoryPercentile: number;
  questionId?: string;
  questionTitle?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topicTags?: string[];
  submittedAt: string;
} | null> {
  if (!slug) return null;
  try {
    const listRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query submissionList($questionSlug: String!, $offset: Int!, $limit: Int!) {
            submissionList(questionSlug: $questionSlug, offset: $offset, limit: $limit) {
              submissions {
                id
                statusDisplay
                lang
                timestamp
              }
            }
          }
        `,
        variables: { questionSlug: slug, offset: 0, limit: 15 }
      })
    });
    if (!listRes.ok) return null;
    const listJson = await listRes.json();
    const subs = listJson?.data?.submissionList?.submissions || [];
    const latestAc = subs.find((s: any) => s.statusDisplay === 'Accepted');
    if (!latestAc?.id) return null;

    const det = await enrichSubmissionWithGraphQL(String(latestAc.id), slug);
    if (!det.code) return null;

    return {
      submissionId: String(latestAc.id),
      code: det.code,
      language: det.language || latestAc.lang || 'javascript',
      runtimeMs: det.runtimeMs || 0,
      runtimePercentile: det.runtimePercentile || 0,
      memoryBytes: det.memoryBytes || 0,
      memoryPercentile: det.memoryPercentile || 0,
      questionId: det.questionId,
      questionTitle: det.questionTitle,
      difficulty: det.difficulty,
      topicTags: det.topicTags,
      submittedAt: Number(latestAc.timestamp)
        ? new Date(Number(latestAc.timestamp) * 1000).toISOString()
        : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

/**
 * Fallback DOM observer (waits 4s after Submit click so MAIN-world API interceptor always finishes first)
 */
async function checkSubmissionResult(): Promise<void> {
  const isSubmissionDetailPage = window.location.pathname.includes('/submissions/');
  const elapsed = Date.now() - submitTimestamp;
  const isRecentSubmit = isUserSubmitting && elapsed >= 4000 && elapsed < 90000;

  if (!isRecentSubmit && !isSubmissionDetailPage) {
    return;
  }

  const result = LeetCodeDomExtractor.extractSubmissionResult();
  if (!result || result.verdict !== 'Accepted') return;

  if (lastVerifiedSubmissionId === result.submissionId) return;

  const problem = LeetCodeDomExtractor.extractProblemDetails();
  let code = cachedSubmitCode || '';
  let language = cachedSubmitLanguage || '';
  let runtimeMs = result.runtimeMs;
  let runtimePercentile = result.runtimePercentile;
  let memoryBytes = result.memoryBytes;
  let memoryPercentile = result.memoryPercentile;
  let questionId = problem.id;
  let questionTitle = problem.title;
  let difficulty = problem.difficulty;
  let topicTags = problem.topicTags;

  // Prefer authoritative GraphQL submissionDetails if we have a numeric submissionId!
  if (/^\d+$/.test(result.submissionId)) {
    const det = await enrichSubmissionWithGraphQL(result.submissionId, problem.slug);
    if (det.code) code = det.code;
    if (det.language) language = det.language;
    if (det.runtimeMs) runtimeMs = det.runtimeMs;
    if (det.runtimePercentile) runtimePercentile = det.runtimePercentile;
    if (det.memoryBytes) memoryBytes = det.memoryBytes;
    if (det.memoryPercentile) memoryPercentile = det.memoryPercentile;
    if (det.questionId) questionId = det.questionId;
    if (det.questionTitle) questionTitle = det.questionTitle;
    if (det.difficulty) difficulty = det.difficulty;
    if (det.topicTags?.length) topicTags = det.topicTags;
  }

  if (!code || LeetCodeDomExtractor.isLikelyNonCodeSnippet(code)) {
    const mainState = await LeetCodeDomExtractor.requestMainWorldEditorState(500);
    if (mainState.code && !LeetCodeDomExtractor.isLikelyNonCodeSnippet(mainState.code)) {
      code = mainState.code;
      if (!language && mainState.language) language = mainState.language;
    } else {
      const domCode = LeetCodeDomExtractor.extractEditorCode();
      if (domCode && !LeetCodeDomExtractor.isLikelyNonCodeSnippet(domCode)) {
        code = domCode;
      }
    }
  }

  if (!code || LeetCodeDomExtractor.isLikelyNonCodeSnippet(code)) {
    return;
  }

  isUserSubmitting = false;

  const submissionPayload: DetectedSubmission = {
    submissionId: result.submissionId,
    questionId,
    questionTitle,
    questionSlug: problem.slug,
    difficulty,
    language: language || LeetCodeDomExtractor.extractLanguage(code) || 'javascript',
    code,
    runtimeMs,
    runtimePercentile,
    memoryBytes,
    memoryPercentile,
    verdict: 'Accepted',
    topicTags,
    submittedAt: new Date().toISOString(),
    state: 'DETECTED'
  };

  dispatchSubmission(submissionPayload, false);
}

// 1. Listen for Main World Interceptor Messages (Authoritative API Interception)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'STREAKFORGE_VERIFIED_SUBMISSION') {
    const raw = event.data.payload;
    if (!raw || raw.verdict !== 'Accepted') {
      isUserSubmitting = false;
      return;
    }

    (async () => {
      const problem = LeetCodeDomExtractor.extractProblemDetails();
      const targetSlug = raw.questionSlug || problem.slug;
      let code = raw.code || '';
      let questionId = String(raw.questionId || problem.id || '');
      let questionTitle = problem.title;
      let difficulty = problem.difficulty;
      let topicTags = problem.topicTags;
      let language = raw.language || '';
      let runtimeMs = raw.runtimeMs || 0;
      let runtimePercentile = raw.runtimePercentile || 0;
      let memoryBytes = raw.memoryBytes || 0;
      let memoryPercentile = raw.memoryPercentile || 0;

      // Always fetch authoritative submissionDetails when numeric submissionId exists and anything is incomplete
      // (or if code didn't come straight from /submit/ typed_code POST body!)
      const needServerVerification =
        !raw.fromSubmitBody ||
        !code ||
        LeetCodeDomExtractor.isLikelyNonCodeSnippet(code) ||
        !questionId ||
        questionId === '0' ||
        !questionTitle;

      if (needServerVerification) {
        const enriched = await enrichSubmissionWithGraphQL(String(raw.submissionId || ''), targetSlug);
        if (enriched.code) code = enriched.code;
        if (enriched.language && (!raw.fromSubmitBody || !language)) language = enriched.language;
        if (enriched.questionId) questionId = enriched.questionId;
        if (enriched.questionTitle) questionTitle = enriched.questionTitle;
        if (enriched.difficulty) difficulty = enriched.difficulty;
        if (enriched.topicTags?.length) topicTags = enriched.topicTags;
        if (enriched.runtimeMs && !runtimeMs) runtimeMs = enriched.runtimeMs;
        if (enriched.runtimePercentile && !runtimePercentile) {
          runtimePercentile = enriched.runtimePercentile;
        }
        if (enriched.memoryBytes && !memoryBytes) memoryBytes = enriched.memoryBytes;
        if (enriched.memoryPercentile && !memoryPercentile) {
          memoryPercentile = enriched.memoryPercentile;
        }
      }

      if (!code || LeetCodeDomExtractor.isLikelyNonCodeSnippet(code)) {
        const mainState = await LeetCodeDomExtractor.requestMainWorldEditorState(500);
        if (mainState.code && !LeetCodeDomExtractor.isLikelyNonCodeSnippet(mainState.code)) {
          code = mainState.code;
          if (!language && mainState.language) language = mainState.language;
        }
      }

      const submissionPayload: DetectedSubmission = {
        submissionId: String(raw.submissionId),
        questionId: questionId || '0',
        questionTitle,
        questionSlug: targetSlug,
        difficulty,
        language: language || LeetCodeDomExtractor.extractLanguage(code) || 'javascript',
        code,
        runtimeMs,
        runtimePercentile,
        memoryBytes,
        memoryPercentile,
        verdict: 'Accepted',
        topicTags,
        submittedAt: raw.submittedAt || new Date().toISOString(),
        state: 'DETECTED'
      };

      isUserSubmitting = false;
      dispatchSubmission(submissionPayload, true);
    })();
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

  const dismiss = () => {
    toast.style.animation = 'streakforge-slide-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => toast.remove(), 300);
  };

  closeButton?.addEventListener('click', dismiss);
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
      (async () => {
        const problem = LeetCodeDomExtractor.extractProblemDetails();
        const result = LeetCodeDomExtractor.extractSubmissionResult();

        // Try fetching the genuine latest Accepted submission for this problem from LeetCode GraphQL first
        const latestAc = await fetchLatestAcceptedForProblem(problem.slug);
        if (latestAc) {
          sendResponse({
            success: true,
            payload: {
              code: latestAc.code,
              language: latestAc.language,
              problem: {
                ...problem,
                id: latestAc.questionId || problem.id,
                title: latestAc.questionTitle || problem.title,
                difficulty: latestAc.difficulty || problem.difficulty,
                topicTags: latestAc.topicTags?.length ? latestAc.topicTags : problem.topicTags
              },
              result: {
                verdict: 'Accepted',
                submissionId: latestAc.submissionId,
                runtimeMs: latestAc.runtimeMs,
                runtimePercentile: latestAc.runtimePercentile,
                memoryBytes: latestAc.memoryBytes,
                memoryPercentile: latestAc.memoryPercentile
              }
            }
          });
          return;
        }

        // Fallback to active MAIN-world Monaco editor when viewing an active Accepted result
        const mainState = await LeetCodeDomExtractor.requestMainWorldEditorState(500);
        const code =
          mainState.code && !LeetCodeDomExtractor.isLikelyNonCodeSnippet(mainState.code)
            ? mainState.code
            : LeetCodeDomExtractor.extractEditorCode();
        const language =
          mainState.language || LeetCodeDomExtractor.extractLanguage(code);

        sendResponse({
          success: true,
          payload: {
            code,
            language,
            problem,
            result
          }
        });
      })();
      return true;
    }
  });
}
