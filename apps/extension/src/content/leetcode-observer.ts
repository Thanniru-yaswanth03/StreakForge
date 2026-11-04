import type { LeetCodeSubmissionInput, Difficulty } from '@streakforge/shared-types';

console.log('[StreakForge] LeetCode content observer injected.');

let lastObservedSubmissionId: string | null = null;

function getProblemSlug(): string {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : '';
}

function parseDifficulty(): Difficulty {
  const text = document.body.innerText;
  if (/Difficulty:\s*Hard|\bHard\b/i.test(text) && document.querySelector('.text-red-s, .text-difficulty-hard')) {
    return 'Hard';
  }
  if (/Difficulty:\s*Medium|\bMedium\b/i.test(text) && document.querySelector('.text-yellow-s, .text-difficulty-medium')) {
    return 'Medium';
  }
  return 'Easy';
}

function extractEditorCode(): string {
  // Monaco editor text extraction
  const lines = document.querySelectorAll('.monaco-editor .view-line');
  if (lines.length > 0) {
    return Array.from(lines)
      .map((line) => line.textContent || '')
      .join('\n');
  }

  // Fallback to code element
  const codeEl = document.querySelector('code, pre');
  return codeEl?.textContent || '// StreakForge: Solution captured';
}

function extractLanguage(): string {
  // Language button or selector
  const btn = document.querySelector('button[id*="headlessui-listbox-button"], [data-cy="lang-select"]');
  const langText = btn?.textContent?.trim().toLowerCase() || 'python3';

  if (langText.includes('python')) return 'python3';
  if (langText.includes('c++') || langText.includes('cpp')) return 'cpp';
  if (langText.includes('java') && !langText.includes('javascript')) return 'java';
  if (langText.includes('typescript')) return 'typescript';
  if (langText.includes('javascript')) return 'javascript';
  if (langText.includes('go')) return 'golang';
  if (langText.includes('rust')) return 'rust';
  return langText;
}

function observeSubmissionResults(): void {
  const observer = new MutationObserver(() => {
    // Look for "Accepted" banner in submission modal or panel
    const acceptedElements = Array.from(document.querySelectorAll('*')).filter((el) => {
      return el.children.length === 0 && el.textContent?.trim() === 'Accepted';
    });

    if (acceptedElements.length === 0) return;

    // Check runtime and memory elements nearby
    const bodyText = document.body.innerText;
    const runtimeMatch = bodyText.match(/Runtime\s*[:\n]\s*([0-9.]+)\s*ms.*?Beats\s*([0-9.]+)%/i);
    const memoryMatch = bodyText.match(/Memory\s*[:\n]\s*([0-9.]+)\s*MB.*?Beats\s*([0-9.]+)%/i);

    const runtimeMs = runtimeMatch ? parseFloat(runtimeMatch[1]) : 50;
    const runtimePercentile = runtimeMatch ? parseFloat(runtimeMatch[2]) : 80;
    const memoryMb = memoryMatch ? parseFloat(memoryMatch[1]) : 50;
    const memoryBytes = Math.round(memoryMb * 1024 * 1024);
    const memoryPercentile = memoryMatch ? parseFloat(memoryMatch[2]) : 75;

    const slug = getProblemSlug();
    if (!slug) return;

    const pageTitle = document.title || '';
    const titleMatch = pageTitle.match(/^([0-9]+)?\.?\s*([^-|]+)/);
    const questionId = titleMatch && titleMatch[1] ? titleMatch[1].trim() : '1';
    const questionTitle = titleMatch && titleMatch[2] ? titleMatch[2].trim() : slug;

    // Generate pseudo unique submission ID if not accessible in DOM
    const submissionId = `${slug}-${Date.now().toString().slice(-6)}`;
    if (lastObservedSubmissionId === submissionId) return;
    lastObservedSubmissionId = submissionId;

    const code = extractEditorCode();
    const language = extractLanguage();
    const difficulty = parseDifficulty();

    const submissionPayload: LeetCodeSubmissionInput = {
      submissionId,
      questionId,
      questionTitle,
      questionSlug: slug,
      difficulty,
      language,
      code,
      runtimeMs,
      runtimePercentile,
      memoryBytes,
      memoryPercentile,
      submittedAt: new Date().toISOString()
    };

    console.log('[StreakForge] Genuine Accepted Submission detected:', submissionPayload);

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'LEETCODE_SUBMISSION_DETECTED',
        payload: submissionPayload
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start observing when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeSubmissionResults);
} else {
  observeSubmissionResults();
}

