/**
 * StreakForge Main World LeetCode Interceptor
 * Injected directly into LeetCode's execution context ("world": "MAIN").
 * Intercepts submission payloads and Monaco Editor models to guarantee 100% accurate,
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
    return null;
  }

  // Provide window hook for reading Monaco editor models
  (window as any).__streakforge_getMonacoCode = function (): string | null {
    try {
      const monaco = (window as any).monaco;
      if (monaco?.editor) {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          // Find model with highest length or active URI
          for (const m of models) {
            const val = m.getValue();
            if (val && val.trim().length > 10) {
              return val;
            }
          }
          return models[0].getValue();
        }
      }
    } catch (e) {
      console.warn('[StreakForge Interceptor] Error accessing Monaco:', e);
    }
    return null;
  };

  // Provide window hook for reading Monaco editor language directly
  (window as any).__streakforge_getMonacoLanguage = function (): string | null {
    try {
      const monaco = (window as any).monaco;
      if (monaco?.editor) {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          for (const m of models) {
            const langId = typeof m.getLanguageId === 'function' ? m.getLanguageId() : (typeof m.getModeId === 'function' ? m.getModeId() : null);
            if (langId) {
              return normalizeLanguage(langId);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[StreakForge Interceptor] Error accessing Monaco language:', e);
    }
    return null;
  };

  // State to track in-flight submission
  let inFlightSubmission: {
    questionSlug: string;
    questionId?: string;
    lang?: string;
    code?: string;
    submittedAt?: string;
    submissionId?: string;
  } | null = null;

  // Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const reqObj = typeof args[0] !== 'string' ? (args[0] as Request | undefined) : undefined;
    const url = typeof args[0] === 'string' ? args[0] : reqObj?.url || '';
    const options = args[1] || {};
    const method = String(options.method || reqObj?.method || 'GET').toUpperCase();

    // 1. Intercept LeetCode /submit/ POST
    if (url.includes('/submit/') && method === 'POST') {
      try {
        let body: any = null;
        if (typeof options.body === 'string') {
          body = JSON.parse(options.body);
        } else if (reqObj) {
          body = await reqObj.clone().json().catch(() => null);
        }

        const slugMatch = url.match(/\/problems\/([^/]+)\/submit/);
        const pathSlugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
        const questionSlug = (slugMatch?.[1] || pathSlugMatch?.[1] || '').toLowerCase();

        if (body) {
          const rawCode = body.typed_code || '';
          const detectedLang = normalizeLanguage(
            body.lang ||
              (window as any).__streakforge_getMonacoLanguage?.() ||
              inferLanguageFromCode(rawCode) ||
              'javascript'
          );

          inFlightSubmission = {
            questionSlug,
            questionId: String(body.question_id || ''),
            lang: detectedLang,
            code: rawCode,
            submittedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[StreakForge Interceptor] Error parsing /submit/ request:', err);
      }
    }

    const response = await originalFetch.apply(this, args);

    // 2. Intercept response of /submit/ to get submission_id
    if (url.includes('/submit/') && method === 'POST') {
      try {
        const cloned = response.clone();
        cloned
          .json()
          .then((data) => {
            if (data?.submission_id && inFlightSubmission) {
              inFlightSubmission.submissionId = String(data.submission_id);
            }
          })
          .catch(() => {});
      } catch {}
    }

    // 3. Intercept /check/ polling response for verdict (works even if inFlightSubmission wasn't captured cleanly)
    if (url.includes('/check/')) {
      try {
        const checkIdMatch = url.match(/\/check\/(?:detail\/)?(\d+)/);
        const cloned = response.clone();
        cloned
          .json()
          .then((data) => {
            if (data && (data.state === 'SUCCESS' || data.status_msg)) {
              const verdict = data.status_msg || (data.run_success ? 'Accepted' : 'Unknown');

              if (verdict === 'Accepted') {
                const rawRuntime = parseFloat(String(data.status_runtime || '').replace(/[^0-9.]/g, ''));
                const runtimeMs = Number.isFinite(rawRuntime) ? rawRuntime : 0;
                const rawRuntimePct = parseFloat(String(data.runtime_percentile ?? ''));
                const runtimePercentile = Number.isFinite(rawRuntimePct) ? rawRuntimePct : 0;
                const rawMemoryMb = parseFloat(String(data.status_memory || '').replace(/[^0-9.]/g, ''));
                const memoryBytes = Number.isFinite(rawMemoryMb) ? Math.round(rawMemoryMb * 1024 * 1024) : 0;
                const rawMemoryPct = parseFloat(String(data.memory_percentile ?? ''));
                const memoryPercentile = Number.isFinite(rawMemoryPct) ? rawMemoryPct : 0;

                let finalCode = inFlightSubmission?.code || data.code || '';
                if (!finalCode || finalCode.trim().length === 0) {
                  finalCode = (window as any).__streakforge_getMonacoCode?.() || '';
                }

                let finalLang =
                  inFlightSubmission?.lang ||
                  (data.lang ? normalizeLanguage(data.lang) : null) ||
                  (window as any).__streakforge_getMonacoLanguage?.() ||
                  'javascript';
                const codeInferred = inferLanguageFromCode(finalCode);
                if (codeInferred && !inFlightSubmission?.lang && !data.lang) {
                  finalLang = codeInferred;
                }

                const pathSlugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
                const payload = {
                  submissionId:
                    inFlightSubmission?.submissionId ||
                    String(data.submission_id || checkIdMatch?.[1] || Date.now()),
                  questionId: inFlightSubmission?.questionId || String(data.question_id || ''),
                  questionSlug:
                    inFlightSubmission?.questionSlug ||
                    (pathSlugMatch?.[1] || '').toLowerCase(),
                  language: finalLang,
                  code: finalCode,
                  verdict: 'Accepted',
                  runtimeMs,
                  runtimePercentile,
                  memoryBytes,
                  memoryPercentile,
                  submittedAt: inFlightSubmission?.submittedAt || new Date().toISOString()
                };

                window.postMessage(
                  {
                    type: 'STREAKFORGE_VERIFIED_SUBMISSION',
                    payload
                  },
                  '*'
                );

                inFlightSubmission = null;
              }
            }
          })
          .catch(() => {});
      } catch {}
    }

    return response;
  };
})();
