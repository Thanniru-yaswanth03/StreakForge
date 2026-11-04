import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { FORBIDDEN_FILE_PATTERNS, HIGH_ENTROPY_SECRET_PATTERNS } from '@streakforge/config';
import type { ConflictReport } from '@streakforge/shared-types';

export interface GitFileStatus {
  path: string;
  indexStatus: string;
  workingStatus: string;
  isStaged: boolean;
  isUntracked: boolean;
  isSafe: boolean;
  dangerReason?: string;
  sizeBytes?: number;
}

export interface GitStatusResult {
  branch: string;
  isClean: boolean;
  isDetached: boolean;
  files: GitFileStatus[];
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  untrackedFiles: GitFileStatus[];
  hasSafeChanges: boolean;
  remoteOriginUrl?: string;
}

export interface GitCommitResult {
  sha: string;
  message: string;
  filesCommitted: number;
  branch: string;
  timestamp: string;
  pushed: boolean;
  pushWarning?: string;
}

export interface GitCommitInfo {
  sha: string;
  author: string;
  date: string;
  message: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB safety threshold

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
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
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
    return res.exitCode === 0 && res.stdout.trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * Get current active Git branch
 */
export async function getCurrentBranch(repoPath: string): Promise<{ branch: string; isDetached: boolean }> {
  const symRes = await executeGit(['symbolic-ref', '--short', '-q', 'HEAD'], repoPath);
  if (symRes.exitCode === 0 && symRes.stdout.trim()) {
    return { branch: symRes.stdout.trim(), isDetached: false };
  }

  // Detached HEAD fallback
  const revRes = await executeGit(['rev-parse', '--short', 'HEAD'], repoPath);
  const out = revRes.stdout.trim();
  return { branch: out ? `(detached at ${out})` : 'unknown', isDetached: true };
}

/**
 * Verify if a file path is safe to commit (not in forbidden/secret list and under size limit)
 */
export function isSafeFilePath(
  firstArg: string,
  secondArg?: string
): { safe: boolean; reason?: string; sizeBytes?: number } {
  const repoPath = secondArg !== undefined ? firstArg : process.cwd();
  const relativeFilePath = secondArg !== undefined ? secondArg : firstArg;

  const normalized = relativeFilePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);

  // 1. Pattern checks
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(basename)) {
      return {
        safe: false,
        reason: `Matches security exclusion: ${pattern.toString()}`
      };
    }
  }

  // 2. File size check
  try {
    const fullPath = path.resolve(repoPath, relativeFilePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.size > MAX_FILE_SIZE_BYTES) {
        return {
          safe: false,
          reason: `File size exceeds 50MB safety limit (${(stats.size / (1024 * 1024)).toFixed(1)}MB)`,
          sizeBytes: stats.size
        };
      }
      return { safe: true, sizeBytes: stats.size };
    }
  } catch {
    // If file was deleted or unreadable
  }

  return { safe: true };
}

/**
 * Scan git diff for accidental secret leaks (API keys, PATs, database strings, private keys)
 */
export function scanDiffForSecrets(diffContent: string): { safe: boolean; findings: string[] } {
  const findings: string[] = [];

  for (const line of diffContent.split('\n')) {
    // Only inspect additions
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const cleanLine = line.substring(1).trim();
      for (const pattern of HIGH_ENTROPY_SECRET_PATTERNS) {
        if (pattern.test(cleanLine)) {
          findings.push(`Pattern detected: ${pattern.toString()}`);
        }
      }
    }
  }

  return {
    safe: findings.length === 0,
    findings: Array.from(new Set(findings))
  };
}

/**
 * Inspect Git working tree status with security checks
 */
export async function getGitStatus(repoPath: string): Promise<GitStatusResult> {
  const { branch, isDetached } = await getCurrentBranch(repoPath);
  const statusRes = await executeGit(['status', '--porcelain=v1', '-uall'], repoPath);

  if (statusRes.exitCode !== 0) {
    throw new Error(`git status failed: ${statusRes.stderr}`);
  }

  let remoteOriginUrl: string | undefined = undefined;
  try {
    const remoteRes = await executeGit(['config', '--get', 'remote.origin.url'], repoPath);
    if (remoteRes.exitCode === 0 && remoteRes.stdout) {
      remoteOriginUrl = remoteRes.stdout;
    }
  } catch {
    // Remote optional
  }

  const files: GitFileStatus[] = [];

  if (statusRes.stdout) {
    const lines = statusRes.stdout.split(/\r?\n/);
    for (const line of lines) {
      if (line.length < 4) continue;
      const indexStatus = line[0];
      const workingStatus = line[1];
      const rawPath = line.substring(3).trim().replace(/^"|"$/g, '');

      const safety = isSafeFilePath(repoPath, rawPath);
      const isUntracked = indexStatus === '?' && workingStatus === '?';
      const isStaged = indexStatus !== ' ' && indexStatus !== '?';

      files.push({
        path: rawPath,
        indexStatus,
        workingStatus,
        isStaged,
        isUntracked,
        isSafe: safety.safe,
        dangerReason: safety.reason,
        sizeBytes: safety.sizeBytes
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
    isDetached,
    files,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    hasSafeChanges,
    remoteOriginUrl
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
  const res = await executeGit(['add', '--', ...stagedPaths], repoPath);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to stage files: ${res.stderr}`);
  }

  return stagedPaths;
}

/**
 * Check remote status and identify conflicts non-destructively
 */
export async function checkRemoteStatus(
  repoPath: string,
  remote: string = 'origin',
  branchName?: string
): Promise<ConflictReport> {
  const { branch, isDetached } = await getCurrentBranch(repoPath);
  const targetBranch = branchName || branch;

  if (isDetached) {
    return {
      hasConflict: true,
      type: 'DETACHED_HEAD',
      message: `Repository is in a detached HEAD state at ${targetBranch}.`,
      resolutionInstructions: `Switch to an active branch before committing or pushing: run 'git checkout -b <branch-name>'.`
    };
  }

  // Check if remote exists
  const remoteCheck = await executeGit(['remote'], repoPath);
  if (!remoteCheck.stdout.split('\n').includes(remote)) {
    return {
      hasConflict: false,
      type: 'MISSING_REMOTE',
      message: `Remote "${remote}" is not configured for this repository. Commits will remain local.`,
      resolutionInstructions: `Configure a remote using: git remote add origin <url>`
    };
  }

  // Fetch target branch non-destructively
  try {
    const fetchRes = await executeGit(['fetch', remote, targetBranch], repoPath, 20000);
    if (fetchRes.exitCode !== 0) {
      return {
        hasConflict: false,
        message: `Remote fetch warning: ${fetchRes.stderr}`
      };
    }

    // Check upstream comparison
    const revRes = await executeGit(
      ['rev-list', '--left-right', '--count', `${targetBranch}...${remote}/${targetBranch}`],
      repoPath
    );

    if (revRes.exitCode === 0 && revRes.stdout) {
      const [ahead, behind] = revRes.stdout.split(/\s+/).map((n) => parseInt(n, 10));
      if (behind > 0 && ahead > 0) {
        return {
          hasConflict: true,
          type: 'MERGE_CONFLICT',
          message: `Branches have diverged (${ahead} ahead, ${behind} behind ${remote}/${targetBranch}).`,
          resolutionInstructions: `Non-destructive safety rule active: StreakForge will not force-push. Resolve manually using: git pull --rebase ${remote} ${targetBranch}`
        };
      }
      if (behind > 0) {
        return {
          hasConflict: true,
          type: 'REMOTE_AHEAD',
          message: `Local branch is ${behind} commit(s) behind remote ${remote}/${targetBranch}.`,
          resolutionInstructions: `Fast-forward your local branch first using: git pull ${remote} ${targetBranch}`
        };
      }
    }
  } catch (err: any) {
    return {
      hasConflict: false,
      message: `Remote status check bypassed: ${err.message}`
    };
  }

  return { hasConflict: false };
}

/**
 * Generate smart, meaningful Conventional Commit message based on actual files and diffs
 */
export function generateSmartCommitMessage(
  filePaths: string[],
  diffContent?: string
): string {
  if (filePaths.length === 0) {
    return 'chore: routine update';
  }

  const lowerDiff = (diffContent || '').toLowerCase();

  // Heuristic intent detection from diff
  const isFix =
    lowerDiff.includes('fix') ||
    lowerDiff.includes('error') ||
    lowerDiff.includes('bug') ||
    lowerDiff.includes('handle empty') ||
    lowerDiff.includes('null check') ||
    lowerDiff.includes('catch');

  const isTest = filePaths.every((f) => f.includes('test') || f.includes('spec'));
  const isDoc = filePaths.every(
    (f) => f.toLowerCase().includes('readme') || f.endsWith('.md') || f.includes('docs/')
  );
  const isConfig = filePaths.every(
    (f) => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml') || f.includes('config')
  );

  if (isTest) {
    const target = path.basename(filePaths[0], path.extname(filePaths[0])).replace(/\.(test|spec)$/, '');
    return `test: add test coverage for ${target}`;
  }

  if (isDoc) {
    const docName = path.basename(filePaths[0], path.extname(filePaths[0]));
    return `docs: update documentation for ${docName}`;
  }

  if (isConfig) {
    return `chore(config): update configuration in ${path.basename(filePaths[0])}`;
  }

  if (filePaths.length === 1) {
    const file = filePaths[0];
    const ext = path.extname(file);
    const basename = path.basename(file, ext);

    if (isFix) {
      return `fix: resolve issue in ${basename}`;
    }
    return `feat: update ${basename} implementation`;
  }

  // Multiple files
  const folders = filePaths.map((f) => path.dirname(f).replace(/\\/g, '/').split('/')[0]).filter(Boolean);
  const scope = folders[0] || 'core';

  if (isFix) {
    return `fix(${scope}): resolve issues across ${filePaths.length} files`;
  }

  return `feat(${scope}): enhance functionality across ${filePaths.length} files`;
}

/**
 * Create a safe, genuine Git commit following the strict 15-step workflow
 */
export async function commitSafeChanges(
  repoPath: string,
  options?: {
    message?: string;
    autoPush?: boolean;
    allowedBranches?: string[];
    remote?: string;
  }
): Promise<GitCommitResult> {
  // Step 1 - 4: Status and Branch verification
  const status = await getGitStatus(repoPath);

  if (status.isDetached) {
    throw new Error('Refusing to commit on detached HEAD. Switch to an active branch.');
  }

  if (status.isClean) {
    throw new Error('Refusing to commit: working tree is clean. Genuine code changes required.');
  }

  if (options?.allowedBranches && options.allowedBranches.length > 0) {
    if (!options.allowedBranches.includes(status.branch)) {
      throw new Error(`Branch policy violation: Current branch "${status.branch}" is not in allowed list [${options.allowedBranches.join(', ')}]`);
    }
  }

  // Step 5 - 7: Inspect changed files and scan staged/unstaged for secrets
  let staged = status.stagedFiles.map((f) => f.path);
  if (staged.length === 0) {
    staged = await stageSafeFiles(repoPath);
    if (staged.length === 0) {
      throw new Error('No safe changes available to commit (all changes matched security exclusion patterns or exceeded size limits).');
    }
  }

  // Verify diff content for high-risk secrets
  const diffRes = await executeGit(['diff', '--cached'], repoPath);
  const secretCheck = scanDiffForSecrets(diffRes.stdout);
  if (!secretCheck.safe) {
    // Unstage to prevent accidental future commits
    await executeGit(['reset', 'HEAD', '--', ...staged], repoPath);
    throw new Error(`Commit blocked by Secret Filter: Potential credentials detected in diff (${secretCheck.findings.join('; ')}). Files have been unstaged.`);
  }

  // Step 8: Smart commit message suggestion
  const commitMsg = options?.message || generateSmartCommitMessage(staged, diffRes.stdout);

  // Step 12: Commit genuine changes
  const commitRes = await executeGit(['commit', '-m', commitMsg], repoPath);
  if (commitRes.exitCode !== 0) {
    throw new Error(`git commit failed: ${commitRes.stderr || commitRes.stdout}`);
  }

  // Step 14: Verify resulting commit
  const revRes = await executeGit(['rev-parse', 'HEAD'], repoPath);
  const sha = revRes.stdout;
  if (!sha || sha.length < 8) {
    throw new Error('Commit verification failed: Could not obtain valid commit SHA from HEAD.');
  }

  // Step 13: Push to configured remote (with safety guarantees: never force-push)
  let pushed = false;
  let pushWarning: string | undefined = undefined;

  if (options?.autoPush) {
    const remoteName = options.remote || 'origin';
    const remoteConflict = await checkRemoteStatus(repoPath, remoteName, status.branch);

    if (remoteConflict.hasConflict) {
      pushWarning = `Push skipped: ${remoteConflict.message} ${remoteConflict.resolutionInstructions || ''}`;
    } else {
      const pushRes = await executeGit(['push', remoteName, status.branch], repoPath);
      if (pushRes.exitCode === 0) {
        pushed = true;
      } else {
        pushWarning = `Git push warning: ${pushRes.stderr}`;
      }
    }
  }

  return {
    sha,
    message: commitMsg,
    filesCommitted: staged.length,
    branch: status.branch,
    timestamp: new Date().toISOString(),
    pushed,
    pushWarning
  };
}

/**
 * Create a periodic backup snapshot of selected project folder
 * Backups are clearly marked as backups and not coding contributions.
 */
export async function createBackupSnapshot(repoPath: string): Promise<GitCommitResult> {
  const status = await getGitStatus(repoPath);
  if (status.isClean) {
    throw new Error('Working tree is clean; no modified files to backup.');
  }

  const staged = await stageSafeFiles(repoPath);
  if (staged.length === 0) {
    throw new Error('No safe files to include in backup snapshot.');
  }

  const now = new Date();
  const backupMessage = `backup: snapshot of project files at ${now.toISOString()} [streakforge-backup]`;

  const commitRes = await executeGit(['commit', '-m', backupMessage], repoPath);
  if (commitRes.exitCode !== 0) {
    throw new Error(`Backup commit failed: ${commitRes.stderr}`);
  }

  const revRes = await executeGit(['rev-parse', 'HEAD'], repoPath);

  return {
    sha: revRes.stdout,
    message: backupMessage,
    filesCommitted: staged.length,
    branch: status.branch,
    timestamp: now.toISOString(),
    pushed: false
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
