/**
 * StreakForge Main World LeetCode Interceptor
 * Injected directly into LeetCode's execution context ("world": "MAIN").
 * Intercepts submission payloads and Monaco Editor models to guarantee accurate,
 * unvirtualized source-code extraction and verified submission IDs.
 */

(function () {
  console.log('[StreakForge Interceptor] Main world interceptor active.');

  function normalizeLanguage(lang?: string): string {
    if (!lang) return 'javascript';
    const l = lang.toLowerCase().trim();
    if (l.includes('javascript') || l === 'js') return 'javascript';
    if (l.includes('typescript') || l === 'ts') return 'typescript';
    if (l.includes('python3') || l === 'py3' || l === 'python' || l === 'py') return 'python3';
    if (l.includes('c++') || l === 'cpp') return 'cpp';
    if (l.includes('java') && !l.includes('javascript')) return 'java';
    if (l.includes('c#') || l === 'csharp' || l === 'cs') return 'csharp';
    if (l.includes('go') || l === 'golang') return 'golang';
    if (l.includes('rust') || l === 'rs') return 'rust';
    if (l.includes('kotlin') || l === 'kt') return 'kotlin';
    if (l.includes('swift')) return 'swift';
    if (l.includes('ruby') || l === 'rb') return 'ruby';
    if (l.includes('php')) return 'php';
    return l;
  }

  function inferLanguageFromCode(code?: string): string | null {
    if (!code) return null;
    const c = code.trim();
    if (
      /:\s*(number|string|boolean|void|any|unknown|never)\b/.test(c) ||
      /interface\s+[A-Z]/.test(c) ||
      /type\s+[A-Z]\w*\s*=/.test(c)
    ) {
      return 'typescript';
    }
    if (
      /\bpublic\s+class\s+Solution\b/.test(c) ||
      /\bclass\s+Solution\s*\{[\s\S]*?\bpublic\b/.test(c) ||
      /System\.out\.println/.test(c)
    ) {
      return 'java';
    }
    if (
      /#include\s*</.test(c) ||
      /\bstd::/.test(c) ||
      /\bvector<\w+>/.test(c) ||
      /\bcout\s*<</.test(c)
    ) {
      return 'cpp';
    }
    if (
      /\bdef\s+\w+\s*\(/.test(c) ||
      /\bclass\s+Solution\s*:/.test(c) ||
      /\bself\b/.test(c) ||
      /\belif\b/.test(c)
    ) {
      return 'python3';
    }
    if (
      /\bfunction\s*\w*\s*\(/.test(c) ||
      /\bvar\s+\w+/.test(c) ||
      /\blet\s+\w+/.test(c) ||
      /\bconst\s+\w+/.test(c) ||
      /=>/.test(c)
    ) {
      return 'javascript';
    }
    return null;
  }

  function isNonSolutionText(val: string): boolean {
    return /^(Input|Output|Explanation|Example\s*\d*|Constraints)\s*:/i.test((val || '').trim());
  }

  function pickPrimaryMonacoModel(): { code: string | null; language: string | null } {
    try {
      const monaco = (window as any).monaco;
      if (!monaco?.editor) return { code: null, language: null };

      // 1. Prefer an active mounted code editor that is not a diff/testcase widget
      if (typeof monaco.editor.getEditors === 'function') {
        const editors = monaco.editor.getEditors() || [];
        for (const ed of editors) {
          const dom = typeof ed.getDomNode === 'function' ? ed.getDomNode() : null;
          if (dom && dom.closest?.('[data-e2e-locator*="testcase"]')) continue;
          const model = typeof ed.getModel === 'function' ? ed.getModel() : null;
          if (!model) continue;
          const val = model.getValue();
          const langId =
            typeof model.getLanguageId === 'function'
              ? model.getLanguageId()
              : typeof model.getModeId === 'function'
                ? model.getModeId()
                : '';
          if (
            val &&
            val.trim().length > 0 &&
            !isNonSolutionText(val) &&
            langId !== 'plaintext' &&
            langId !== 'json'
          ) {
            return { code: val, language: langId ? normalizeLanguage(langId) : null };
          }
        }
      }

      // 2. Fallback to filtering monaco.editor.getModels() cleanly (prefer non-plaintext/non-json programming models)
      const models = monaco.editor.getModels() || [];
      let bestModel: { code: string; language: string | null; score: number } | null = null;
      for (const m of models) {
        const val = m.getValue() || '';
        if (!val.trim() || isNonSolutionText(val)) continue;
        const langId =
          typeof m.getLanguageId === 'function'
            ? m.getLanguageId()
            : typeof m.getModeId === 'function'
              ? m.getModeId()
              : '';
        const isCodeLang = langId && !['plaintext', 'json', 'markdown'].includes(langId);
        const score = (isCodeLang ? 100000 : 0) + val.length;
        if (!bestModel || score > bestModel.score) {
          bestModel = {
            code: val,
            language: langId ? normalizeLanguage(langId) : null,
            score
          };
        }
      }
      if (bestModel) {
        return { code: bestModel.code, language: bestModel.language };
      }
    } catch (e) {
      console.warn('[StreakForge Interceptor] Error accessing Monaco:', e);
    }
    return { code: null, language: null };
  }

  (window as any).__streakforge_getMonacoCode = function (): string | null {
    return pickPrimaryMonacoModel().code;
  };

  (window as any).__streakforge_getMonacoLanguage = function (): string | null {
    return pickPrimaryMonacoModel().language;
  };

  // Respond to isolated content-script queries for Monaco editor state
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'STREAKFORGE_GET_EDITOR_STATE' && event.data?.requestId) {
      const picked = pickPrimaryMonacoModel();
      window.postMessage(
        {
          type: 'STREAKFORGE_EDITOR_STATE',
          requestId: event.data.requestId,
          code: picked.code || '',
          language: picked.language
        },
        window.location.origin
      );
    }
  });

  interface TrackedSubmission {
    questionSlug: string;
    questionId?: string;
    lang?: string;
    code?: string;
    submittedAt?: string;
    submissionId?: string;
    fromSubmitBody?: boolean;
  }

  // Track submissions keyed by submissionId + keep latest pending before ID arrives
  const trackedBySubmissionId = new Map<string, TrackedSubmission>();
  let latestInFlight: TrackedSubmission | null = null;

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const reqObj = typeof args[0] !== 'string' ? (args[0] as Request | undefined) : undefined;
    const url = typeof args[0] === 'string' ? args[0] : reqObj?.url || '';
    const options = args[1] || {};
    const method = String(options.method || reqObj?.method || 'GET').toUpperCase();

    // 1. Intercept LeetCode /submit/ POST (exact typed_code sent to judge!)
    let currentSubmit: TrackedSubmission | null = null;
    if (url.includes('/submit/') && method === 'POST') {
      try {
        let rawBodyText = '';
        if (typeof options.body === 'string') {
          rawBodyText = options.body;
        } else if (reqObj) {
          rawBodyText = await reqObj.clone().text().catch(() => '');
        }

        const body = rawBodyText ? JSON.parse(rawBodyText) : null;
        const slugMatch = url.match(/\/problems\/([^/]+)\/submit/);
        const pathSlugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
        const questionSlug = (slugMatch?.[1] || pathSlugMatch?.[1] || '').toLowerCase();

        if (body && typeof body.typed_code === 'string' && body.typed_code.trim().length > 0) {
          const picked = pickPrimaryMonacoModel();
          const detectedLang = normalizeLanguage(
            body.lang || picked.language || inferLanguageFromCode(body.typed_code) || 'javascript'
          );

          currentSubmit = {
            questionSlug,
            questionId: String(body.question_id || ''),
            lang: detectedLang,
            code: body.typed_code,
            submittedAt: new Date().toISOString(),
            fromSubmitBody: true
          };
          latestInFlight = currentSubmit;
        }
      } catch (err) {
        console.warn('[StreakForge Interceptor] Error parsing /submit/ request:', err);
      }
    }

    const response = await originalFetch.apply(this, args);

    // 2. Intercept response of /submit/ to bind exact submission_id
    if (url.includes('/submit/') && method === 'POST' && currentSubmit) {
      try {
        const cloned = response.clone();
        cloned
          .json()
          .then((data) => {
            if (data?.submission_id) {
              const idStr = String(data.submission_id);
              currentSubmit!.submissionId = idStr;
              trackedBySubmissionId.set(idStr, currentSubmit!);
            }
          })
          .catch(() => {});
      } catch {}
    }

    // 3. Intercept /check/ polling response for authoritative Accepted verdict
    if (url.includes('/check/')) {
      try {
        const checkIdMatch = url.match(/\/check\/(?:detail\/)?(\d+)/) || url.match(/\/submissions\/detail\/(\d+)\/check/);
        const cloned = response.clone();
        cloned
          .json()
          .then((data) => {
            if (data && (data.state === 'SUCCESS' || data.status_msg)) {
              const verdict = data.status_msg || (data.run_success ? 'Accepted' : 'Unknown');
              if (verdict !== 'Accepted') {
                return;
              }

              const resolvedSubId = String(
                data.submission_id || checkIdMatch?.[1] || latestInFlight?.submissionId || Date.now()
              );
              const tracked = trackedBySubmissionId.get(resolvedSubId) || latestInFlight;

              const rawRuntime = parseFloat(String(data.status_runtime || '').replace(/[^0-9.]/g, ''));
              const runtimeMs = Number.isFinite(rawRuntime) ? rawRuntime : 0;
              const rawRuntimePct = parseFloat(String(data.runtime_percentile ?? ''));
              const runtimePercentile = Number.isFinite(rawRuntimePct) ? rawRuntimePct : 0;
              const rawMemoryMb = parseFloat(String(data.status_memory || '').replace(/[^0-9.]/g, ''));
              const memoryBytes = Number.isFinite(rawMemoryMb)
                ? Math.round(rawMemoryMb * 1024 * 1024)
                : 0;
              const rawMemoryPct = parseFloat(String(data.memory_percentile ?? ''));
              const memoryPercentile = Number.isFinite(rawMemoryPct) ? rawMemoryPct : 0;

              const picked = pickPrimaryMonacoModel();
              let finalCode = tracked?.code || data.code || picked.code || '';
              if (isNonSolutionText(finalCode)) finalCode = '';

              const finalLang =
                tracked?.lang ||
                (data.lang ? normalizeLanguage(data.lang) : null) ||
                picked.language ||
                inferLanguageFromCode(finalCode) ||
                'javascript';

              const pathSlugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
              const payload = {
                submissionId: resolvedSubId,
                questionId: tracked?.questionId || String(data.question_id || ''),
                questionSlug: tracked?.questionSlug || (pathSlugMatch?.[1] || '').toLowerCase(),
                language: finalLang,
                code: finalCode,
                fromSubmitBody: Boolean(tracked?.fromSubmitBody && finalCode),
                verdict: 'Accepted',
                runtimeMs,
                runtimePercentile,
                memoryBytes,
                memoryPercentile,
                submittedAt: tracked?.submittedAt || new Date().toISOString()
              };

              window.postMessage(
                {
                  type: 'STREAKFORGE_VERIFIED_SUBMISSION',
                  payload
                },
                window.location.origin
              );

              trackedBySubmissionId.delete(resolvedSubId);
              if (latestInFlight === tracked) latestInFlight = null;
            }
          })
          .catch(() => {});
      } catch {}
    }

    return response;
  };
})();
