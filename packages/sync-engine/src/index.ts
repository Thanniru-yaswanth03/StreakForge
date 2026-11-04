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

/**
 * Generate repository file paths and formatted contents for a LeetCode submission
 */
export function generateSolutionFiles(
  submission: LeetCodeSubmissionInput,
  pattern: string = 'solutions/{difficulty}/{id}-{slug}'
): FormattedSolution {
  const meta = getLanguageMeta(submission.language);
  const ext = meta.extension;

  // Resolve directory path from pattern
  const dirPath = pattern
    .replace('{difficulty}', submission.difficulty)
    .replace('{id}', submission.questionId)
    .replace('{slug}', submission.questionSlug);

  const codeFilePath = `${dirPath}/${submission.questionSlug}${ext}`;
  const readmeFilePath = `${dirPath}/README.md`;

  const diffColor = getDifficultyColor(submission.difficulty);
  const formattedMemory = formatBytesToMb(submission.memoryBytes);
  const leetcodeUrl = `https://leetcode.com/problems/${submission.questionSlug}/`;

  // Formatted source code with attribution header
  const header = [
    `${meta.commentPrefix} Problem: ${submission.questionId}. ${submission.questionTitle}`,
    `${meta.commentPrefix} Difficulty: ${submission.difficulty}`,
    `${meta.commentPrefix} Language: ${meta.name}`,
    `${meta.commentPrefix} Performance: ${submission.runtimeMs} ms (beats ${submission.runtimePercentile}%), ${formattedMemory} (beats ${submission.memoryPercentile}%)`,
    `${meta.commentPrefix} LeetCode: ${leetcodeUrl}`,
    `${meta.commentPrefix} Synchronized via StreakForge at ${submission.submittedAt}`,
    '',
    ''
  ].join('\n');

  const codeContent = header + submission.code;

  // Formatted Markdown README
  const readmeContent = `# ${submission.questionId}. [${submission.questionTitle}](${leetcodeUrl})

![Difficulty: ${submission.difficulty}](https://img.shields.io/badge/Difficulty-${submission.difficulty}-${diffColor}.svg)
![Language: ${meta.name}](https://img.shields.io/badge/Language-${encodeURIComponent(meta.name)}-blue.svg)
![Status: Accepted](https://img.shields.io/badge/Status-Accepted-brightgreen.svg)

## 📊 Performance Statistics

| Metric | Result | Benchmark |
| :--- | :--- | :--- |
| **Runtime** | **${submission.runtimeMs} ms** | Beats **${submission.runtimePercentile.toFixed(1)}%** of submissions |
| **Memory** | **${formattedMemory}** | Beats **${submission.memoryPercentile.toFixed(1)}%** of submissions |

## 💻 Solution Details

- **File**: [\`${submission.questionSlug}${ext}\`](./${submission.questionSlug}${ext})
- **Language**: \`${meta.name}\`
- **Submitted**: \`${new Date(submission.submittedAt).toUTCString()}\`

---
*Synchronized automatically with verified authenticity by [StreakForge](https://github.com/streakforge).*
`;

  const commitMessage = `feat(leetcode): solve [${submission.questionId}] ${submission.questionTitle} (${submission.runtimeMs}ms, ${formattedMemory})`;

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
 */
export async function exportSolutionToGitHub(
  octokit: Octokit,
  repoFullName: string,
  defaultBranch: string = 'main',
  submission: LeetCodeSubmissionInput,
  author: { name: string; email: string },
  pattern?: string
): Promise<GitHubExportResult> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repoFullName}. Expected "owner/repo".`);
  }

  const solution = generateSolutionFiles(submission, pattern);

  // Helper to get existing file SHA if it exists
  async function getExistingFileSha(filePath: string): Promise<string | undefined> {
    try {
      const existing = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: defaultBranch
      });
      if ('sha' in existing.data) {
        return existing.data.sha;
      }
    } catch {
      // File doesn't exist yet, which is expected for new submissions
    }
    return undefined;
  }

  // 1. Commit/update README.md
  const readmeSha = await getExistingFileSha(solution.readmeFilePath);
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: solution.readmeFilePath,
    message: `docs(leetcode): update description for [${submission.questionId}] ${submission.questionTitle}`,
    content: Buffer.from(solution.readmeContent, 'utf-8').toString('base64'),
    branch: defaultBranch,
    sha: readmeSha,
    author: {
      name: author.name,
      email: author.email
    }
  });

  // 2. Commit/update Solution code
  const codeSha = await getExistingFileSha(solution.codeFilePath);
  const codeUploadRes = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: solution.codeFilePath,
    message: solution.commitMessage,
    content: Buffer.from(solution.codeContent, 'utf-8').toString('base64'),
    branch: defaultBranch,
    sha: codeSha,
    author: {
      name: author.name,
      email: author.email
    }
  });

  const commitSha = codeUploadRes.data.commit.sha || '';
  const commitUrl = codeUploadRes.data.commit.html_url || `https://github.com/${owner}/${repo}/commit/${commitSha}`;

  return {
    commitSha,
    commitUrl,
    codeFilePath: solution.codeFilePath,
    readmeFilePath: solution.readmeFilePath
  };
}

