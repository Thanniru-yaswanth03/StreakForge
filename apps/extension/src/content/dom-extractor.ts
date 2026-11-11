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
  private static cachedFallbackSubmissionId: { key: string; id: string; timestamp: number } | null = null;
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
    let title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    let id = '0';

    // Check title element in DOM (strictly target active problem heading, never generic nav links)
    const titleSelectors = [
      '[data-cy="question-title"]',
      'div[class*="text-title-large"]',
      'h4[data-cy="question-title"]',
      'div.flex.items-start.justify-between h4',
      ...(slug ? [`a[href="/problems/${slug}/"]`, `a[href*="/problems/${slug}"]`] : [])
    ];

    for (const sel of titleSelectors) {
      const titleEl = document.querySelector(sel);
      if (titleEl && titleEl.textContent) {
        const text = titleEl.textContent.trim();
        const match = text.match(/^([0-9]+)?\.?\s*(.+)$/);
        if (match) {
          if (match[1]) id = match[1].trim();
          if (match[2] && match[2].length > 2 && !match[2].includes('LeetCode')) {
            title = match[2].trim();
            break;
          }
        }
      }
    }

    if (title === slug) {
      const docTitle = document.title || '';
      const match = docTitle.match(/^([0-9]+)?\.?\s*([^-|]+)/);
      if (match) {
        if (match[1]) id = match[1].trim();
        if (match[2]) title = match[2].trim();
      }
    }

    // 2. Difficulty extraction
    let difficulty: Difficulty = 'Easy';
    const diffSelectors = [
      '[class*="text-difficulty-"]',
      '[class*="text-olive"]',
      '[class*="text-yellow"]',
      '[class*="text-pink"]',
      '[class*="text-red"]',
      '[data-degree]',
      'div[class*="rounded-full"][class*="text-"]'
    ];

    for (const sel of diffSelectors) {
      const diffEl = document.querySelector(sel);
      if (diffEl && diffEl.textContent) {
        const diffText = diffEl.textContent.trim().toLowerCase();
        if (diffText.includes('hard')) {
          difficulty = 'Hard';
          break;
        } else if (diffText.includes('medium')) {
          difficulty = 'Medium';
          break;
        } else if (diffText.includes('easy')) {
          difficulty = 'Easy';
          break;
        }
      }
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
   * Infers language from code text keywords and syntactic signatures
   */
  public static inferLanguageFromCode(code?: string): string | null {
    if (!code) return null;
    const c = code.trim();
    if (/:\s*(number|string|boolean|void|any|unknown|never)\b/.test(c) || /interface\s+[A-Z]/.test(c) || /type\s+[A-Z]\w*\s*=/.test(c)) {
      return 'typescript';
    }
    if (
      /\bfunction\s*\w*\s*\(/.test(c) ||
      /\bvar\s+\w+/.test(c) ||
      /\blet\s+\w+/.test(c) ||
      /\bconst\s+\w+/.test(c) ||
      /=>/.test(c) ||
      /console\.log\(/.test(c) ||
      /===|!==/.test(c) ||
      /\/\*\*[\s\S]*?@param/.test(c) ||
      /createCounter/.test(c)
    ) {
      return 'javascript';
    }
    if (/\bdef\s+\w+\s*\(/.test(c) || /\bclass\s+Solution\s*:/.test(c) || /\bself\b/.test(c) || /\belif\b/.test(c)) {
      return 'python3';
    }
    if (/#include\s*</.test(c) || /\bstd::/.test(c) || /\bvector<\w+>/.test(c) || /\bcout\s*<</.test(c)) {
      return 'cpp';
    }
    if (/\bpublic\s+class\s+Solution\b/.test(c) || /System\.out\.println/.test(c)) {
      return 'java';
    }
    if (/\bfunc\s+\w+\(/.test(c) && /\bpackage\b/.test(c)) {
      return 'golang';
    }
    if (/\bfn\s+\w+\(/.test(c) && /\blet\s+mut\b/.test(c)) {
      return 'rust';
    }
    return null;
  }

  /**
   * Identifies the current programming language selected in the editor
   */
  public static extractLanguage(codeSnippet?: string): string {
    // 1. Check window hook exposed by Main World interceptor directly from Monaco
    try {
      const monacoLang = (window as any).__streakforge_getMonacoLanguage?.();
      if (monacoLang && monacoLang.trim().length > 0) {
        return monacoLang;
      }
    } catch {}

    // 2. Code heuristics on provided snippet
    if (codeSnippet) {
      const inferred = this.inferLanguageFromCode(codeSnippet);
      if (inferred) return inferred;
    }

    // 3. Scan DOM language select buttons and elements
    const selectors = [
      'button[id*="headlessui-listbox-button"]',
      '[data-cy="lang-select"]',
      'button.rounded.items-center',
      'div[class*="lang-select"]',
      'button[class*="popover-trigger"]',
      'button[class*="cursor-pointer"]',
      'button[aria-haspopup="listbox"]',
      '[data-mode]',
      '[data-lang]'
    ];

    for (const sel of selectors) {
      const elements = document.querySelectorAll(sel);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const text = (el.textContent || '').trim().toLowerCase();
        if (text === 'javascript' || text.startsWith('javascript')) return 'javascript';
        if (text === 'typescript' || text.startsWith('typescript')) return 'typescript';
        if (text === 'python3' || text === 'python' || text.startsWith('python3')) return 'python3';
        if (text === 'c++' || text === 'cpp' || text.startsWith('c++')) return 'cpp';
        if (text === 'java' || text.startsWith('java')) return 'java';
        if (text === 'c#' || text === 'csharp') return 'csharp';
        if (text === 'go' || text === 'golang') return 'golang';
        if (text === 'rust') return 'rust';
        if (text === 'kotlin') return 'kotlin';
        if (text === 'swift') return 'swift';
        if (text === 'ruby') return 'ruby';
        if (text === 'php') return 'php';
      }
    }

    // 4. Try extracting active editor code and inferring language
    const currentCode = this.extractEditorCode();
    if (currentCode) {
      const inferred = this.inferLanguageFromCode(currentCode);
      if (inferred) return inferred;
    }

    return 'javascript';
  }

  /**
   * Extracts the actual source code currently residing in Monaco editor or submission view
   */
  public static extractEditorCode(): string {
    // 1. Try window hook exposed by Main World interceptor
    try {
      const hookCode = (window as any).__streakforge_getMonacoCode?.();
      if (hookCode && hookCode.trim().length > 0) {
        return hookCode;
      }
    } catch {}

    // 2. Primary on submission tab: full unvirtualized submission code in pre/code container
    const codeSelectors = [
      '.submission-detail code',
      'div[class*="submission-detail"] code',
      'div[class*="submission-detail"] pre',
      'pre code[class*="language-"]',
      '[class*="submission-code"]',
      '[data-key="code"] pre',
      'div.ace_editor'
    ];

    for (const sel of codeSelectors) {
      const codeEl = document.querySelector(sel);
      if (codeEl && codeEl.textContent && codeEl.textContent.trim().length > 0) {
        return codeEl.textContent;
      }
    }

    // 3. Monaco editor DOM lines
    const lines = document.querySelectorAll('.monaco-editor .view-line');
    if (lines.length > 0) {
      const code = Array.from(lines)
        .map((line) => line.textContent || '')
        .join('\n');
      if (code.trim().length > 0) {
        return code;
      }
    }

    // 4. Fallback: Monaco hidden textarea
    const textarea = document.querySelector('textarea.inputarea') as HTMLTextAreaElement | null;
    if (textarea && textarea.value && textarea.value.trim().length > 0) {
      return textarea.value;
    }

    return '';
  }

  /**
   * Scans DOM for submission result banner, verdict, runtime, and memory metrics
   */
  public static extractSubmissionResult(): ExtractedResult | null {
    const verdictSelectors = [
      '[data-e2e-locator="submission-result"]',
      '[class*="result-state"]',
      'div[class*="text-green"]',
      'div[class*="text-sd-green"]',
      'span[class*="text-green"]',
      'span[class*="text-sd-green"]',
      'div[class*="submission-result"]',
      'div[data-state*="success"]'
    ];

    let foundVerdictText: string | null = null;

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

    let verdict: SubmissionVerdict = 'Unknown';
    if (/Accepted/i.test(foundVerdictText)) verdict = 'Accepted';
    else if (/Wrong Answer/i.test(foundVerdictText)) verdict = 'Wrong Answer';
    else if (/Time Limit/i.test(foundVerdictText)) verdict = 'Time Limit Exceeded';
    else if (/Memory Limit/i.test(foundVerdictText)) verdict = 'Memory Limit Exceeded';
    else if (/Runtime Error/i.test(foundVerdictText)) verdict = 'Runtime Error';
    else if (/Compile/i.test(foundVerdictText)) verdict = 'Compile Error';

    const bodyText = document.body.innerText;
    const runtimeMatch = bodyText.match(/Runtime\s*[:\n]?\s*([0-9.]+)\s*ms.*?Beats\s*([0-9.]+)%/i);
    const memoryMatch = bodyText.match(/Memory\s*[:\n]?\s*([0-9.]+)\s*MB.*?Beats\s*([0-9.]+)%/i);

    const runtimeMs = runtimeMatch ? parseFloat(runtimeMatch[1]) : 0;
    const runtimePercentile = runtimeMatch ? parseFloat(runtimeMatch[2]) : 0;
    const memoryMb = memoryMatch ? parseFloat(memoryMatch[1]) : 0;
    const memoryBytes = Math.round(memoryMb * 1024 * 1024);
    const memoryPercentile = memoryMatch ? parseFloat(memoryMatch[2]) : 0;

    // Extract genuine submission ID from URL or submission link
    let submissionId = '';
    const subUrlMatch = window.location.pathname.match(/\/submissions\/(?:detail\/)?([0-9]+)/);
    if (subUrlMatch && subUrlMatch[1]) {
      submissionId = subUrlMatch[1];
    } else {
      const links = document.querySelectorAll('a[href*="/submissions/"]');
      for (let i = 0; i < links.length; i++) {
        const href = links[i].getAttribute('href') || '';
        const match = href.match(/\/submissions\/(?:detail\/)?([0-9]+)/);
        if (match && match[1]) {
          submissionId = match[1];
          break;
        }
      }

      if (!submissionId) {
        const slug = this.getProblemSlug();
        const cacheKey = `${slug}-${verdict}`;
        const now = Date.now();
        if (
          LeetCodeDomExtractor.cachedFallbackSubmissionId &&
          LeetCodeDomExtractor.cachedFallbackSubmissionId.key === cacheKey &&
          now - LeetCodeDomExtractor.cachedFallbackSubmissionId.timestamp < 45000
        ) {
          submissionId = LeetCodeDomExtractor.cachedFallbackSubmissionId.id;
        } else {
          submissionId = `sub-${now}`;
          LeetCodeDomExtractor.cachedFallbackSubmissionId = {
            key: cacheKey,
            id: submissionId,
            timestamp: now
          };
        }
      }
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
