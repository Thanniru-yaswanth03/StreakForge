import { Octokit } from '@octokit/rest';
import { getLanguageMeta } from '@streakforge/config';
import type { LeetCodeSubmissionInput, Difficulty } from '@streakforge/shared-types';

export interface FormattedSolution {
  codeFilePath: string;
  codeContent: string;
  readmeFilePath: string;
  readmeContent: string;
  commitMessage: string;
}

export interface GitHubExportResult {
  commitSha: string;
  commitUrl: string;
  codeFilePath: string;
  readmeFilePath: string;
  verified: boolean;
}

export interface SolutionFormattingOptions {
  folderPattern?: string;
  fileNamingPattern?: string;
  zeroPadId?: number;
  includeHeader?: boolean;
  includeMetrics?: boolean;
  includeReadme?: boolean;
  preserveOriginalCode?: boolean;
  topicTags?: string[];
}

/**
 * Format bytes to human readable megabytes
 */
export function formatBytesToMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get markdown badge color for LeetCode difficulty
 */
export function getDifficultyColor(diff: Difficulty): string {
  switch (diff) {
    case 'Easy':
      return 'brightgreen';
    case 'Medium':
      return 'orange';
    case 'Hard':
      return 'red';
    default:
      return 'blue';
  }
}

function sanitizeSegment(raw: string): string {
  return (
    raw
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*\\]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/\/+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}

function sanitizePath(raw: string): string {
  return raw
    .split('/')
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .join('/');
}

function formatLanguageFolder(lang: string, prettyName: string): string {
  const lower = lang.toLowerCase();
  if (lower === 'cpp' || lower === 'c++') return 'Cpp';
  if (lower === 'csharp' || lower === 'c#') return 'CSharp';
  if (lower === 'python3' || lower === 'python') return 'Python';
  if (lower === 'golang' || lower === 'go') return 'Go';
  return sanitizeSegment(prettyName);
}

function resolvePlaceholders(
  template: string,
  submission: LeetCodeSubmissionInput,
  ext: string,
  langName: string,
  zeroPadId: number,
  topicTags?: string[]
): string {
  const rawId = String(submission.questionId || '0').trim();
  const paddedId = zeroPadId > 0 && /^\d+$/.test(rawId) ? rawId.padStart(zeroPadId, '0') : rawId;
  const id4 = /^\d+$/.test(rawId) ? rawId.padStart(4, '0') : rawId;
  const topicRaw = topicTags?.[0] || submission.topicTags?.[0] || 'Algorithms';
  const topicClean = sanitizeSegment(topicRaw);
  const langPretty = formatLanguageFolder(submission.language, langName);
  const slugClean = sanitizeSegment(submission.questionSlug);

  return template
    .replace(/\{Difficulty\}|\{difficulty\}/g, submission.difficulty)
    .replace(/\{Language\}/g, langPretty)
    .replace(/\{language\}/g, submission.language.toLowerCase())
    .replace(/\{Topic\}|\{topic\}/g, topicClean)
    .replace(/\{id4\}/g, id4)
    .replace(/\{id\}/g, paddedId)
    .replace(/\{slug\}/g, slugClean)
    .replace(/\{title\}/g, sanitizeSegment(submission.questionTitle))
    .replace(/\{ext\}/g, ext);
}

/**
 * Generate repository file paths and formatted contents for a LeetCode submission
 */
export function generateSolutionFiles(
  submission: LeetCodeSubmissionInput,
  patternOrOptions: string | SolutionFormattingOptions = 'solutions/{difficulty}/{id}-{slug}',
  extraOptions?: SolutionFormattingOptions
): FormattedSolution {
  const options: SolutionFormattingOptions =
    typeof patternOrOptions === 'string'
      ? { folderPattern: patternOrOptions, ...extraOptions }
      : { ...patternOrOptions, ...extraOptions };

  const meta = getLanguageMeta(submission.language);
  const ext = meta.extension;
  const zeroPadId = options.zeroPadId ?? 0;
  const includeHeader = options.includeHeader ?? true;
  const includeMetrics = options.includeMetrics ?? true;
  const preserveOriginalCode = options.preserveOriginalCode ?? false;

  const rawFolderPattern = options.folderPattern || 'solutions/{difficulty}/{id}-{slug}';
  const resolvedPattern = sanitizePath(
    resolvePlaceholders(rawFolderPattern, submission, ext, meta.name, zeroPadId, options.topicTags)
  );

  // If pattern already resolves to a specific file (e.g. includes extension), use directly
  const patternIncludesFile =
    resolvedPattern.endsWith(ext) || /\.[a-z0-9]{1,8}$/i.test(resolvedPattern);

  let codeFilePath: string;
  let dirPath: string;

  if (patternIncludesFile) {
    codeFilePath = resolvedPattern;
    const lastSlash = codeFilePath.lastIndexOf('/');
    dirPath = lastSlash > 0 ? codeFilePath.slice(0, lastSlash) : '';
  } else {
    dirPath = resolvedPattern;
    const filePattern = options.fileNamingPattern || '{slug}{ext}';
    const resolvedFileName = sanitizePath(
      resolvePlaceholders(filePattern, submission, ext, meta.name, zeroPadId, options.topicTags)
    );
    const finalFileName = resolvedFileName.endsWith(ext)
      ? resolvedFileName
      : `${resolvedFileName}${ext}`;
    codeFilePath = dirPath ? `${dirPath}/${finalFileName}` : finalFileName;
  }

  const readmeFilePath = dirPath ? `${dirPath}/README.md` : 'README.md';
  const codeFileName = codeFilePath.includes('/')
    ? codeFilePath.slice(codeFilePath.lastIndexOf('/') + 1)
    : codeFilePath;

  const hasRuntime = Number.isFinite(submission.runtimeMs) && submission.runtimeMs > 0;
  const hasMemory = Number.isFinite(submission.memoryBytes) && submission.memoryBytes > 0;
  const hasAnyMetrics = includeMetrics && (hasRuntime || hasMemory);
  const formattedMemory = hasMemory ? formatBytesToMb(submission.memoryBytes) : 'N/A';

  let codeContent = submission.code;
  if (includeHeader && !preserveOriginalCode) {
    const headerLines = [
      `${meta.commentPrefix} Problem: ${submission.questionId}. ${submission.questionTitle}`,
      `${meta.commentPrefix} Difficulty: ${submission.difficulty}`,
      `${meta.commentPrefix} Language: ${meta.name}`
    ];
    if (hasAnyMetrics) {
      const perfParts: string[] = [];
      if (hasRuntime) {
        perfParts.push(`${submission.runtimeMs} ms (${submission.runtimePercentile.toFixed(1)}%)`);
      }
      if (hasMemory) {
        perfParts.push(`${formattedMemory} (${submission.memoryPercentile.toFixed(1)}%)`);
      }
      headerLines.push(`${meta.commentPrefix} Performance: ${perfParts.join(', ')}`);
    }
    headerLines.push(`${meta.commentPrefix} Submitted: ${submission.submittedAt}`);
    headerLines.push('');
    codeContent = `${headerLines.join('\n')}\n${submission.code}`;
  }

  const diffColor = getDifficultyColor(submission.difficulty);
  const leetcodeUrl =
    submission.problemUrl || `https://leetcode.com/problems/${submission.questionSlug}/`;

  const performanceSection = hasAnyMetrics
    ? `## 📊 Performance Statistics

| Metric | Result | Benchmark |
| :--- | :--- | :--- |
${hasRuntime ? `| **Runtime** | **${submission.runtimeMs} ms** | Beats **${submission.runtimePercentile.toFixed(1)}%** of submissions |\n` : ''}${hasMemory ? `| **Memory** | **${formattedMemory}** | Beats **${submission.memoryPercentile.toFixed(1)}%** of submissions |\n` : ''}`
    : `## 📊 Status\n\n- **Verdict**: Accepted\n`;

  const topicLine =
    options.topicTags && options.topicTags.length > 0
      ? `- **Topics**: ${options.topicTags.map((t) => `\`${t}\``).join(', ')}\n`
      : '';

  const codeFenceLang =
    meta.extension === 'py'
      ? 'python'
      : meta.extension === 'js'
        ? 'javascript'
        : meta.extension === 'ts'
          ? 'typescript'
          : meta.extension === 'cpp' || meta.extension === 'cc'
            ? 'cpp'
            : meta.extension === 'cs'
              ? 'csharp'
              : meta.extension === 'rs'
                ? 'rust'
                : meta.extension;

  const readmeContent = `# ${submission.questionId}. [${submission.questionTitle}](${leetcodeUrl})

![Difficulty: ${submission.difficulty}](https://img.shields.io/badge/Difficulty-${submission.difficulty}-${diffColor}.svg)
![Language: ${meta.name}](https://img.shields.io/badge/Language-${encodeURIComponent(meta.name)}-blue.svg)
![Status: Accepted](https://img.shields.io/badge/Status-Accepted-brightgreen.svg)

${performanceSection}
## 💻 Solution Details

- **File**: [\`${codeFileName}\`](./${codeFileName})
- **Language**: \`${meta.name}\`
${topicLine}- **Submitted**: \`${new Date(submission.submittedAt).toUTCString()}\`

## 📝 Submitted Code

\`\`\`${codeFenceLang}
${submission.code}
\`\`\`

---
*Synchronized automatically by [StreakForge](https://github.com/streakforge).*
`;

  const commitPerfSuffix =
    hasRuntime && hasMemory
      ? ` (${submission.runtimeMs}ms, ${formattedMemory})`
      : hasRuntime
        ? ` (${submission.runtimeMs}ms)`
        : '';
  const commitMessage = `feat(leetcode): solve [${submission.questionId}] ${submission.questionTitle}${commitPerfSuffix}`;

  return {
    codeFilePath,
    codeContent,
    readmeFilePath,
    readmeContent,
    commitMessage
  };
}

/**
 * Export solution files directly to user's GitHub repository via Octokit REST API
 * and verify commit existence before returning success.
 */
export async function exportSolutionToGitHub(
  octokit: Octokit,
  repoFullName: string,
  defaultBranch: string = 'main',
  submission: LeetCodeSubmissionInput,
  author: { name: string; email: string },
  pattern?: string,
  options?: SolutionFormattingOptions
): Promise<GitHubExportResult> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repoFullName}. Expected "owner/repo".`);
  }

  const branch = (defaultBranch || 'main').trim();
  const includeReadme = options?.includeReadme ?? true;
  const solution = generateSolutionFiles(submission, pattern, options);

  const validAuthor =
    author?.email && author.email.includes('@') && author?.name
      ? { name: author.name, email: author.email }
      : undefined;

  async function verifyCommittedSha(sha: string): Promise<void> {
    if (!sha) {
      throw new Error('GitHub API did not return a commit SHA');
    }
    const commitRes = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha
    });
    if (commitRes.data.sha !== sha) {
      throw new Error(
        `Commit verification mismatch: expected ${sha}, received ${commitRes.data.sha}`
      );
    }
  }

  async function getExistingFileSha(filePath: string): Promise<string | undefined> {
    try {
      const existing = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      if ('sha' in existing.data) {
        return existing.data.sha;
      }
    } catch {
      // File doesn't exist yet
    }
    return undefined;
  }

  // Try atomic Git Data API commit first (if branch already exists and repo is non-empty)
  let headSha: string | null = null;
  try {
    const refRes = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    headSha = refRes.data.object.sha;
  } catch (err: any) {
    const status = err?.status || err?.response?.status;
    // If branch ref missing because repo is empty (409/404), fall back to Contents API below
    if (status && status !== 404 && status !== 409) {
      throw err;
    }
  }

  if (headSha) {
    const baseCommit = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: headSha
    });

    const treeItems: Array<{
      path: string;
      mode: '100644';
      type: 'blob';
      sha: string;
    }> = [];

    const codeBlob = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(solution.codeContent, 'utf-8').toString('base64'),
      encoding: 'base64'
    });
    treeItems.push({
      path: solution.codeFilePath,
      mode: '100644',
      type: 'blob',
      sha: codeBlob.data.sha
    });

    if (includeReadme) {
      const readmeBlob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(solution.readmeContent, 'utf-8').toString('base64'),
        encoding: 'base64'
      });
      treeItems.push({
        path: solution.readmeFilePath,
        mode: '100644',
        type: 'blob',
        sha: readmeBlob.data.sha
      });
    }

    const newTree = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseCommit.data.tree.sha,
      tree: treeItems
    });

    const newCommit = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: solution.commitMessage,
      tree: newTree.data.sha,
      parents: [headSha],
      ...(validAuthor ? { author: validAuthor } : {})
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.data.sha
    });

    const commitSha = newCommit.data.sha;
    await verifyCommittedSha(commitSha);

    return {
      commitSha,
      commitUrl:
        newCommit.data.html_url || `https://github.com/${owner}/${repo}/commit/${commitSha}`,
      codeFilePath: solution.codeFilePath,
      readmeFilePath: solution.readmeFilePath,
      verified: true
    };
  }

  // Fallback for brand-new empty repositories: create via Contents API
  if (includeReadme) {
    const readmeSha = await getExistingFileSha(solution.readmeFilePath);
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: solution.readmeFilePath,
      message: `docs(leetcode): add description for [${submission.questionId}] ${submission.questionTitle}`,
      content: Buffer.from(solution.readmeContent, 'utf-8').toString('base64'),
      branch,
      sha: readmeSha,
      ...(validAuthor ? { author: validAuthor } : {})
    });
  }

  const codeSha = await getExistingFileSha(solution.codeFilePath);
  const codeUploadRes = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: solution.codeFilePath,
    message: solution.commitMessage,
    content: Buffer.from(solution.codeContent, 'utf-8').toString('base64'),
    branch,
    sha: codeSha,
    ...(validAuthor ? { author: validAuthor } : {})
  });

  const commitSha = codeUploadRes.data.commit.sha || '';
  await verifyCommittedSha(commitSha);

  return {
    commitSha,
    commitUrl:
      codeUploadRes.data.commit.html_url ||
      `https://github.com/${owner}/${repo}/commit/${commitSha}`,
    codeFilePath: solution.codeFilePath,
    readmeFilePath: solution.readmeFilePath,
    verified: true
  };
}
