import type { Difficulty } from '@streakforge/shared-types';
import type { SubmissionVerdict } from '../shared/types';

export interface ExtractedProblem {
  slug: string;
  title: string;
  id: string;
  difficulty: Difficulty;
  topicTags: string[];
}

export interface ExtractedResult {
  verdict: SubmissionVerdict;
  runtimeMs: number;
  runtimePercentile: number;
  memoryBytes: number;
  memoryPercentile: number;
  submissionId: string;
}

export class LeetCodeDomExtractor {
  /**
   * Extracts problem slug from current window location
   */
  public static getProblemSlug(): string {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Extracts problem title, ID, difficulty, and topic tags
   */
  public static extractProblemDetails(): ExtractedProblem {
    const slug = this.getProblemSlug();

    // 1. Title and ID extraction
    let title = slug;
    let id = '1';

    // Check title element in DOM
    const titleEl = document.querySelector(
      '[data-cy="question-title"], div[class*="text-title-large"], h4[data-cy="question-title"]'
    );

    if (titleEl && titleEl.textContent) {
      const text = titleEl.textContent.trim();
      const match = text.match(/^([0-9]+)?\.?\s*(.+)$/);
      if (match) {
        if (match[1]) id = match[1].trim();
        if (match[2]) title = match[2].trim();
      }
    } else {
      // Fallback: document.title e.g. "1. Two Sum - LeetCode"
      const docTitle = document.title || '';
      const match = docTitle.match(/^([0-9]+)?\.?\s*([^-|]+)/);
      if (match) {
        if (match[1]) id = match[1].trim();
        if (match[2]) title = match[2].trim();
      }
    }

    // 2. Difficulty extraction
    let difficulty: Difficulty = 'Easy';
    const diffEl = document.querySelector(
      '[class*="text-difficulty-"], [class*="text-olive"], [class*="text-yellow"], [class*="text-pink"], [class*="text-red"]'
    );
    const diffText = diffEl?.textContent?.trim().toLowerCase() || document.body.innerText.toLowerCase();

    if (diffText.includes('hard')) {
      difficulty = 'Hard';
    } else if (diffText.includes('medium')) {
      difficulty = 'Medium';
    } else if (diffText.includes('easy')) {
      difficulty = 'Easy';
    }

    // 3. Topic tags extraction
    const topicTags: string[] = [];
    const tagElements = document.querySelectorAll('a[href*="/tag/"], [class*="topic-tag"]');
    tagElements.forEach((el) => {
      const t = el.textContent?.trim();
      if (t && !topicTags.includes(t)) {
        topicTags.push(t);
      }
    });

    return {
      slug,
      title,
      id,
      difficulty,
      topicTags: topicTags.length > 0 ? topicTags : ['Algorithms']
    };
  }

  /**
   * Identifies the current programming language selected in the editor
   */
  public static extractLanguage(): string {
    // Check language selector dropdown buttons
    const selectors = [
      'button[id*="headlessui-listbox-button"]',
      '[data-cy="lang-select"]',
      'button.rounded.items-center',
      'div[class*="lang-select"]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('python3') || text === 'python') return 'python3';
        if (text.includes('c++') || text === 'cpp') return 'cpp';
        if (text.includes('java') && !text.includes('javascript')) return 'java';
        if (text.includes('typescript')) return 'typescript';
        if (text.includes('javascript')) return 'javascript';
        if (text.includes('c#') || text === 'csharp') return 'csharp';
        if (text.includes('go') || text === 'golang') return 'golang';
        if (text.includes('rust')) return 'rust';
        if (text.includes('kotlin')) return 'kotlin';
        if (text.includes('swift')) return 'swift';
        if (text.includes('ruby')) return 'ruby';
        if (text.includes('php')) return 'php';
      }
    }

    return 'python3'; // Safe default
  }

  /**
   * Attempts to detect authenticated LeetCode user in the DOM
   */
  public static extractAuthenticatedUser(): string | undefined {
    // Check avatar or user profile links
    const profileLink = document.querySelector(
      'a[href^="/u/"], a[href^="/profile/"], [data-cy="nav-user-avatar"]'
    );
    if (profileLink) {
      const href = profileLink.getAttribute('href') || '';
      const match = href.match(/\/u\/([^/]+)/) || href.match(/\/profile\/([^/]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const avatarImg = document.querySelector('img[alt*="avatar"], img[alt*="user"]');
    if (avatarImg) {
      const alt = avatarImg.getAttribute('alt') || '';
      if (alt && !alt.toLowerCase().includes('avatar') && !alt.toLowerCase().includes('user')) {
        return alt.trim();
      }
    }

    return undefined;
  }

  /**
   * Extracts the actual source code currently residing in Monaco editor
   */
  public static extractEditorCode(): string {
    // Monaco editor DOM lines
    const lines = document.querySelectorAll('.monaco-editor .view-line');
    if (lines.length > 0) {
      const code = Array.from(lines)
        .map((line) => line.textContent || '')
        .join('\n');
      if (code.trim().length > 0) {
        return code;
      }
    }

    // Fallback: submission code container or pre
    const codeEl = document.querySelector('.submission-detail code, pre code, [class*="submission-code"]');
    if (codeEl && codeEl.textContent && codeEl.textContent.trim().length > 0) {
      return codeEl.textContent;
    }

    return '';
  }

  /**
   * Scans DOM for submission result banner, verdict, runtime, and memory metrics
   */
  public static extractSubmissionResult(): ExtractedResult | null {
    // Check for verdict text in submission result container
    const verdictSelectors = [
      '[data-e2e-locator="submission-result"]',
      '[class*="result-state"]',
      'div[class*="text-green"]',
      'div[class*="text-red"]',
      'span[class*="text-green"]',
      'span[class*="text-red"]',
      'div[class*="submission-result"]'
    ];

    let foundVerdictText: string | null = null;

    // Check specific selectors first
    for (const sel of verdictSelectors) {
      const elements = document.querySelectorAll(sel);
      for (let i = 0; i < elements.length; i++) {
        const text = elements[i].textContent?.trim() || '';
        if (/^(Accepted|Wrong Answer|Time Limit Exceeded|Memory Limit Exceeded|Runtime Error|Compile Error)/i.test(text)) {
          foundVerdictText = text;
          break;
        }
      }
      if (foundVerdictText) break;
    }

    // Fallback: scan small leaf text elements for exact matches
    if (!foundVerdictText) {
      const leafElements = Array.from(document.querySelectorAll('*')).filter((el) => {
        return (
          el.children.length === 0 &&
          /^(Accepted|Wrong Answer|Time Limit Exceeded|Memory Limit Exceeded|Runtime Error|Compile Error)$/i.test(
            el.textContent?.trim() || ''
          )
        );
      });
      if (leafElements.length > 0) {
        foundVerdictText = leafElements[0].textContent?.trim() || null;
      }
    }

    if (!foundVerdictText) {
      return null;
    }

    // Determine canonical verdict
    let verdict: SubmissionVerdict = 'Unknown';
    if (/Accepted/i.test(foundVerdictText)) verdict = 'Accepted';
    else if (/Wrong Answer/i.test(foundVerdictText)) verdict = 'Wrong Answer';
    else if (/Time Limit/i.test(foundVerdictText)) verdict = 'Time Limit Exceeded';
    else if (/Memory Limit/i.test(foundVerdictText)) verdict = 'Memory Limit Exceeded';
    else if (/Runtime Error/i.test(foundVerdictText)) verdict = 'Runtime Error';
    else if (/Compile/i.test(foundVerdictText)) verdict = 'Compile Error';

    // Parse runtime & memory
    const bodyText = document.body.innerText;
    const runtimeMatch = bodyText.match(/Runtime\s*[:\n]?\s*([0-9.]+)\s*ms.*?Beats\s*([0-9.]+)%/i);
    const memoryMatch = bodyText.match(/Memory\s*[:\n]?\s*([0-9.]+)\s*MB.*?Beats\s*([0-9.]+)%/i);

    const runtimeMs = runtimeMatch ? parseFloat(runtimeMatch[1]) : 50;
    const runtimePercentile = runtimeMatch ? parseFloat(runtimeMatch[2]) : 75;
    const memoryMb = memoryMatch ? parseFloat(memoryMatch[1]) : 16;
    const memoryBytes = Math.round(memoryMb * 1024 * 1024);
    const memoryPercentile = memoryMatch ? parseFloat(memoryMatch[2]) : 70;

    // Extract submission ID from URL (e.g. /submissions/detail/123456789/) or generate deterministic timestamp ID
    let submissionId = '';
    const subUrlMatch = window.location.pathname.match(/\/submissions\/detail\/([0-9]+)/);
    if (subUrlMatch && subUrlMatch[1]) {
      submissionId = subUrlMatch[1];
    } else {
      const slug = this.getProblemSlug();
      submissionId = `${slug}-${Date.now().toString().slice(-8)}`;
    }

    return {
      verdict,
      runtimeMs,
      runtimePercentile,
      memoryBytes,
      memoryPercentile,
      submissionId
    };
  }
}

