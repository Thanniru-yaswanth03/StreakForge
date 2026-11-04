import { spawn } from 'node:child_process';
import path from 'node:path';
import { FORBIDDEN_FILE_PATTERNS, HIGH_ENTROPY_SECRET_PATTERNS } from '@streakforge/config';

export interface GitFileStatus {
  path: string;
  indexStatus: string;
  workingStatus: string;
  isStaged: boolean;
  isUntracked: boolean;
  isSafe: boolean;
  dangerReason?: string;
}

export interface GitStatusResult {
  branch: string;
  isClean: boolean;
  files: GitFileStatus[];
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  untrackedFiles: GitFileStatus[];
  hasSafeChanges: boolean;
}

export interface GitCommitResult {
  sha: string;
  message: string;
  filesCommitted: number;
  branch: string;
  timestamp: string;
}

export interface GitCommitInfo {
  sha: string;
  author: string;
  date: string;
  message: string;
}

/**
 * Execute Git CLI command safely using spawn with argument array (prevents shell injection)
 */
export async function executeGit(
  args: string[],
  cwd: string,
  timeoutMs: number = 30000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to execute git process: ${err.message}`));
    });

    proc.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0
      });
    });
  });
}

/**
 * Verify whether a directory is a valid git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const res = await executeGit(['rev-parse', '--is-inside-work-tree'], repoPath);
    return res.exitCode === 0 && res.stdout === 'true';
  } catch {
    return false;
  }
}

/**
 * Get current active Git branch
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  const res = await executeGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to get current branch: ${res.stderr}`);
  }
  return res.stdout;
}

/**
 * Verify if a file path is safe to commit (not in forbidden/secret list)
 */
export function isSafeFilePath(relativeFilePath: string): { safe: boolean; reason?: string } {
  const normalized = relativeFilePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);

  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(basename)) {
      return {
        safe: false,
        reason: `File matches security exclusion pattern: ${pattern.toString()}`
      };
    }
  }

  return { safe: true };
}

/**
 * Scan git diff for accidental secret leaks (API keys, PATs)
 */
export function scanDiffForSecrets(diffContent: string): { safe: boolean; findings: string[] } {
  const findings: string[] = [];

  for (const line of diffContent.split('\n')) {
    // Only inspect additions
    if (line.startsWith('+') && !line.startsWith('+++')) {
      for (const pattern of HIGH_ENTROPY_SECRET_PATTERNS) {
        if (pattern.test(line)) {
          findings.push(`Suspicious secret token detected: ${pattern.toString()}`);
        }
      }
    }
  }

  return {
    safe: findings.length === 0,
    findings
  };
}

/**
 * Inspect Git working tree status with security checks
 */
export async function getGitStatus(repoPath: string): Promise<GitStatusResult> {
  const branch = await getCurrentBranch(repoPath);
  const statusRes = await executeGit(['status', '--porcelain=v1', '-uall'], repoPath);

  if (statusRes.exitCode !== 0) {
    throw new Error(`git status failed: ${statusRes.stderr}`);
  }

  const files: GitFileStatus[] = [];

  if (statusRes.stdout) {
    const lines = statusRes.stdout.split('\n');
    for (const line of lines) {
      if (line.length < 3) continue;
      const indexStatus = line[0];
      const workingStatus = line[1];
      const rawPath = line.substring(3).trim().replace(/^"|"$/g, '');

      const safety = isSafeFilePath(rawPath);
      const isUntracked = indexStatus === '?' && workingStatus === '?';
      const isStaged = indexStatus !== ' ' && indexStatus !== '?';

      files.push({
        path: rawPath,
        indexStatus,
        workingStatus,
        isStaged,
        isUntracked,
        isSafe: safety.safe,
        dangerReason: safety.reason
      });
    }
  }

  const stagedFiles = files.filter((f) => f.isStaged);
  const unstagedFiles = files.filter((f) => !f.isStaged && !f.isUntracked);
  const untrackedFiles = files.filter((f) => f.isUntracked);
  const hasSafeChanges = files.some((f) => f.isSafe);

  return {
    branch,
    isClean: files.length === 0,
    files,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    hasSafeChanges
  };
}

/**
 * Stage safe files explicitly
 */
export async function stageSafeFiles(repoPath: string, filePaths?: string[]): Promise<string[]> {
  const status = await getGitStatus(repoPath);
  const filesToStage = filePaths
    ? status.files.filter((f) => filePaths.includes(f.path) && f.isSafe)
    : status.files.filter((f) => f.isSafe);

  if (filesToStage.length === 0) {
    return [];
  }

  const stagedPaths = filesToStage.map((f) => f.path);
  // Stage files individually or in batches to avoid shell length issues
  const res = await executeGit(['add', '--', ...stagedPaths], repoPath);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to stage files: ${res.stderr}`);
  }

  return stagedPaths;
}

/**
 * Automatically generate a clean conventional commit message based on modified files
 */
export function generateCommitMessage(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return 'chore: routine update';
  }

  if (filePaths.length === 1) {
    const file = filePaths[0];
    const ext = path.extname(file);
    const basename = path.basename(file, ext);

    if (file.toLowerCase().includes('readme') || ext === '.md') {
      return `docs: update documentation in ${basename}`;
    }
    if (file.includes('test') || file.includes('spec')) {
      return `test: update test cases for ${basename}`;
    }
    return `feat: update ${basename}`;
  }

  // Detect common folder or scope
  const folders = filePaths.map((f) => path.dirname(f).split(path.sep)[0]).filter(Boolean);
  const primaryFolder = folders[0] || 'core';

  return `chore(${primaryFolder}): update ${filePaths.length} files`;
}

/**
 * Create a safe, genuine Git commit
 */
export async function commitSafeChanges(
  repoPath: string,
  options?: {
    message?: string;
    stageUntracked?: boolean;
    autoPush?: boolean;
  }
): Promise<GitCommitResult> {
  const status = await getGitStatus(repoPath);

  if (status.isClean) {
    throw new Error('Refusing to commit: working tree is clean. Genuine changes required.');
  }

  // Check diff of staged changes for secrets
  const diffRes = await executeGit(['diff', '--cached'], repoPath);
  const secretCheck = scanDiffForSecrets(diffRes.stdout);
  if (!secretCheck.safe) {
    throw new Error(`Commit aborted: Potential secrets detected in staged diff: ${secretCheck.findings.join('; ')}`);
  }

  // If no files are staged yet, stage safe files
  let staged = status.stagedFiles.map((f) => f.path);
  if (staged.length === 0) {
    staged = await stageSafeFiles(repoPath);
    if (staged.length === 0) {
      throw new Error('No safe changes available to commit.');
    }
  }

  const commitMsg = options?.message || generateCommitMessage(staged);
  const commitRes = await executeGit(['commit', '-m', commitMsg], repoPath);

  if (commitRes.exitCode !== 0) {
    throw new Error(`git commit failed: ${commitRes.stderr}`);
  }

  const revRes = await executeGit(['rev-parse', 'HEAD'], repoPath);
  const sha = revRes.stdout;

  if (options?.autoPush) {
    const pushRes = await executeGit(['push', 'origin', status.branch], repoPath);
    if (pushRes.exitCode !== 0) {
      // Note: we don't roll back the local commit if push fails, but we record the error
      console.warn(`Git push warning: ${pushRes.stderr}`);
    }
  }

  return {
    sha,
    message: commitMsg,
    filesCommitted: staged.length,
    branch: status.branch,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get recent commits from local repository
 */
export async function getRecentCommits(repoPath: string, count: number = 5): Promise<GitCommitInfo[]> {
  const res = await executeGit(
    ['log', `-${count}`, '--pretty=format:%H|%an|%aI|%s'],
    repoPath
  );

  if (res.exitCode !== 0 || !res.stdout) {
    return [];
  }

  return res.stdout.split('\n').map((line) => {
    const [sha, author, date, message] = line.split('|');
    return { sha, author, date, message };
  });
}

