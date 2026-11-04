import crypto from 'node:crypto';
import { Octokit } from '@octokit/rest';
import mongoose, { Types } from 'mongoose';
import { ENV } from '../config/env.js';
import { Account } from '../models/Account.js';
import { User } from '../models/User.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { decryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';
import {
  CommitDiagnosticsResult,
  RepoHealthDiagnosticsResult,
  GitHubActivityFeed,
  CommitAttributionCheck
} from '@streakforge/shared-types';

// In-memory cache for conditional GitHub API requests (ETag & cursors)
interface CacheEntry {
  etag?: string;
  data: any;
  cachedAt: number;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory processed webhook deliveries for deduplication
const processedDeliveries = new Set<string>();

/**
 * Clean up old webhook delivery IDs periodically
 */
setInterval(() => {
  if (processedDeliveries.size > 2000) {
    processedDeliveries.clear();
  }
}, 30 * 60 * 1000);

/**
 * Retrieve an authenticated Octokit instance for a given user
 */
export async function getAuthenticatedOctokit(userId: string): Promise<Octokit> {
  const account = await Account.findOne({
    userId: new Types.ObjectId(userId),
    provider: 'github'
  });

  if (!account || !account.accessTokenEncrypted) {
    throw new Error('GITHUB_NOT_CONNECTED: No connected GitHub account found for this user');
  }

  const rawToken = decryptToken(account.accessTokenEncrypted);
  return new Octokit({
    auth: rawToken,
    userAgent: 'StreakForge-Server/1.0.0'
  });
}

/**
 * Fetch GitHub activity feed across user's connected repositories
 */
export async function getGitHubActivity(
  userId: string,
  page = 1,
  limit = 20
): Promise<GitHubActivityFeed> {
  const octokit = await getAuthenticatedOctokit(userId);

  // Get user's connected repositories
  const connectedRepos = await RepositoryConnection.find({
    userId: new Types.ObjectId(userId)
  }).limit(10);

  const reposToScan: Array<{ owner: string; repo: string; fullName: string; defaultBranch: string }> = [];

  if (connectedRepos.length > 0) {
    for (const r of connectedRepos) {
      const [owner, repo] = r.repoFullName.split('/');
      if (owner && repo) {
        reposToScan.push({ owner, repo, fullName: r.repoFullName, defaultBranch: r.defaultBranch });
      }
    }
  } else {
    // If no repos explicitly connected yet, inspect top recent repositories
    try {
      const userRepos = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 5
      });
      for (const r of userRepos.data) {
        reposToScan.push({
          owner: r.owner.login,
          repo: r.name,
          fullName: r.full_name,
          defaultBranch: r.default_branch
        });
      }
    } catch (err) {
      logger.warn('Failed to retrieve fallback user repos for activity feed', { err });
    }
  }

  const commits: GitHubActivityFeed['commits'] = [];
  const pullRequests: GitHubActivityFeed['pullRequests'] = [];
  const issues: GitHubActivityFeed['issues'] = [];
  const branches: GitHubActivityFeed['branches'] = [];
  const releases: GitHubActivityFeed['releases'] = [];

  // Concurrently fetch activity across target repositories with rate-limit safety
  await Promise.all(
    reposToScan.map(async ({ owner, repo, fullName, defaultBranch }) => {
      try {
        // 1. Commits
        const commitsRes = await octokit.rest.repos.listCommits({
          owner,
          repo,
          per_page: Math.min(limit, 15)
        });

        for (const c of commitsRes.data) {
          commits.push({
            sha: c.sha,
            repo: fullName,
            branch: defaultBranch,
            author: c.commit.author?.name || c.author?.login || 'Unknown',
            authorEmail: c.commit.author?.email,
            message: c.commit.message,
            timestamp: c.commit.author?.date || new Date().toISOString(),
            filesChanged: 0, // List commits doesn't return file count without detail fetch
            url: c.html_url
          });
        }

        // 2. Pull Requests
        const prsRes = await octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          per_page: 10
        });

        for (const pr of prsRes.data) {
          pullRequests.push({
            number: pr.number,
            title: pr.title,
            repo: fullName,
            state: pr.merged_at ? 'MERGED' : pr.state === 'open' ? 'OPEN' : 'CLOSED',
            author: pr.user?.login || 'Unknown',
            createdAt: pr.created_at,
            url: pr.html_url
          });
        }

        // 3. Issues (GitHub includes PRs in issues endpoint, so filter out pull_request key)
        const issuesRes = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: 'all',
          per_page: 10
        });

        for (const issue of issuesRes.data) {
          if (!issue.pull_request) {
            issues.push({
              number: issue.number,
              title: issue.title,
              repo: fullName,
              state: issue.state === 'open' ? 'OPEN' : 'CLOSED',
              author: issue.user?.login || 'Unknown',
              createdAt: issue.created_at,
              url: issue.html_url
            });
          }
        }

        // 4. Branches
        const branchesRes = await octokit.rest.repos.listBranches({
          owner,
          repo,
          per_page: 10
        });

        for (const b of branchesRes.data) {
          branches.push({
            name: b.name,
            repo: fullName,
            isProtected: Boolean(b.protected),
            lastCommitSha: b.commit.sha
          });
        }

        // 5. Releases
        const releasesRes = await octokit.rest.repos.listReleases({
          owner,
          repo,
          per_page: 5
        });

        for (const rel of releasesRes.data) {
          releases.push({
            id: rel.id,
            name: rel.name || rel.tag_name,
            tagName: rel.tag_name,
            repo: fullName,
            publishedAt: rel.published_at || rel.created_at,
            url: rel.html_url
          });
        }
      } catch (err: any) {
        logger.warn(`Failed fetching partial activity for ${fullName}`, { error: err.message });
      }
    })
  );

  // Sort commits descending by timestamp
  commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  pullRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Rate limit inspection
  let rateLimit = { limit: 5000, remaining: 4950, reset: Math.floor(Date.now() / 1000) + 3600 };
  try {
    const rl = await octokit.rest.rateLimit.get();
    rateLimit = {
      limit: rl.data.rate.limit,
      remaining: rl.data.rate.remaining,
      reset: rl.data.rate.reset
    };
  } catch {
    // Keep fallback
  }

  return {
    commits: commits.slice((page - 1) * limit, page * limit),
    pullRequests,
    issues,
    branches,
    releases,
    rateLimit
  };
}

/**
 * Commit Attribution Diagnostic Tool
 * Explains exactly why a commit might not appear on the official GitHub contribution graph.
 */
export async function diagnoseCommitAttribution(
  userId: string,
  input: {
    repoFullName: string;
    commitSha: string;
    branch?: string;
  }
): Promise<CommitDiagnosticsResult> {
  const octokit = await getAuthenticatedOctokit(userId);
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const [owner, repo] = input.repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid repoFullName. Must be in "owner/repo" format');
  }

  // 1. Fetch Commit Details from GitHub
  const commitRes = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: input.commitSha
  });
  const commitData = commitRes.data;
  const authorEmail = commitData.commit.author?.email || '';

  // 2. Fetch Repository Details
  const repoRes = await octokit.rest.repos.get({ owner, repo });
  const repoData = repoRes.data;
  const defaultBranch = repoData.default_branch;
  const inspectedBranch = input.branch || defaultBranch;

  const checks: CommitAttributionCheck[] = [];

  // Check 1: Author Email Association
  const verifiedEmails = (user.verifiedEmails || [user.email]).map((e) => e.toLowerCase());
  const isEmailAssociated = authorEmail ? verifiedEmails.includes(authorEmail.toLowerCase()) : false;

  checks.push({
    name: 'Author Email Association',
    passed: isEmailAssociated,
    message: isEmailAssociated
      ? `Commit author email "${authorEmail}" matches verified GitHub account emails.`
      : `Commit author email "${authorEmail || 'None'}" is NOT associated with your GitHub account.`,
    actionableFix: isEmailAssociated
      ? undefined
      : `Configure your local git email via: git config user.email "${user.email}", or add "${authorEmail}" to your GitHub Settings > Emails.`
  });

  // Check 2: Repository Eligibility (Fork status)
  const isFork = repoData.fork;
  const forkPassed = !isFork;

  checks.push({
    name: 'Repository Ownership & Fork Policy',
    passed: forkPassed,
    message: forkPassed
      ? `Repository "${input.repoFullName}" is a standalone repository (not a fork).`
      : `Repository "${input.repoFullName}" is a fork. GitHub does not count commits in a fork towards your contribution graph unless merged into the parent repository.`,
    actionableFix: forkPassed
      ? undefined
      : 'Open a Pull Request to merge your changes into the upstream parent repository.'
  });

  // Check 3: Default Branch or gh-pages Eligibility
  let branchPassed = false;
  let branchMessage = '';
  let branchFix: string | undefined;

  try {
    if (inspectedBranch === defaultBranch || inspectedBranch === 'gh-pages') {
      branchPassed = true;
      branchMessage = `Commit is on eligible branch "${inspectedBranch}" (default branch is "${defaultBranch}").`;
    } else {
      // Check if commit has been merged into default branch
      const compareRes = await octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${defaultBranch}...${input.commitSha}`
      });

      if (compareRes.data.status === 'identical' || compareRes.data.status === 'behind') {
        branchPassed = true;
        branchMessage = `Commit was authored on "${inspectedBranch}" and has been merged into default branch "${defaultBranch}".`;
      } else {
        branchPassed = false;
        branchMessage = `Commit is currently on branch "${inspectedBranch}", which is not yet merged into default branch "${defaultBranch}".`;
        branchFix = `Merge branch "${inspectedBranch}" into "${defaultBranch}" using a Pull Request or fast-forward merge.`;
      }
    }
  } catch (err) {
    branchPassed = inspectedBranch === defaultBranch;
    branchMessage = `Branch status checked against default branch "${defaultBranch}".`;
  }

  checks.push({
    name: 'Branch Eligibility (Default or gh-pages)',
    passed: branchPassed,
    message: branchMessage,
    actionableFix: branchFix
  });

  // Check 4: Commit Type (Merge vs Non-Empty)
  const isMergeCommit = (commitData.parents?.length || 0) > 1;
  const isEmptyCommit = (commitData.files?.length || 0) === 0;
  const commitTypePassed = !isEmptyCommit;

  checks.push({
    name: 'Commit Content & Integrity',
    passed: commitTypePassed,
    message: isEmptyCommit
      ? 'Commit is an empty commit (0 files changed).'
      : isMergeCommit
      ? 'Commit is a merge commit. Merge commits count if they contain genuine modifications.'
      : `Standard commit with ${commitData.files?.length || 0} file(s) changed.`,
    actionableFix: isEmptyCommit
      ? 'Ensure commits contain actual code modifications to register as genuine activity.'
      : undefined
  });

  // Check 5: Timestamp Within Past Year
  const commitTimestamp = new Date(commitData.commit.author?.date || Date.now());
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const isWithinYear = commitTimestamp >= oneYearAgo;

  checks.push({
    name: 'Contribution Window (Last 365 Days)',
    passed: isWithinYear,
    message: isWithinYear
      ? `Committed on ${commitTimestamp.toLocaleDateString()}, within the visible 1-year contribution window.`
      : `Committed on ${commitTimestamp.toLocaleDateString()}, which is older than 365 days and outside the standard annual graph view.`,
    actionableFix: isWithinYear ? undefined : 'Historical commits older than 1 year are preserved in yearly archives.'
  });

  const allPassed = checks.every((c) => c.passed);
  const criticalFail = !isEmailAssociated || !branchPassed || (!forkPassed && isFork);

  let status: 'ELIGIBLE' | 'INELIGIBLE' | 'WARNING' = 'ELIGIBLE';
  if (criticalFail) {
    status = 'INELIGIBLE';
  } else if (!allPassed) {
    status = 'WARNING';
  }

  const summary =
    status === 'ELIGIBLE'
      ? `Commit ${input.commitSha.slice(0, 7)} meets all GitHub contribution graph requirements.`
      : status === 'WARNING'
      ? `Commit ${input.commitSha.slice(0, 7)} has minor non-blocking flags but may still appear.`
      : `Commit ${input.commitSha.slice(0, 7)} is NOT eligible to appear on your contribution graph due to attribution or branch requirements.`;

  return {
    commitSha: input.commitSha,
    authorEmail,
    repoFullName: input.repoFullName,
    branch: inspectedBranch,
    isEligible: status === 'ELIGIBLE',
    status,
    checks,
    summary
  };
}

/**
 * Repository Health Diagnostics Tool
 * Scans root configuration files, branch protection, issues, and scans recent commit diffs for exposed secrets.
 */
export async function diagnoseRepositoryHealth(
  userId: string,
  repoFullName: string
): Promise<RepoHealthDiagnosticsResult> {
  const octokit = await getAuthenticatedOctokit(userId);
  const [owner, repo] = repoFullName.split('/');

  if (!owner || !repo) {
    throw new Error('Invalid repoFullName. Must be in "owner/repo" format');
  }

  // 1. Fetch Repository Details
  const repoRes = await octokit.rest.repos.get({ owner, repo });
  const repoData = repoRes.data;
  const defaultBranch = repoData.default_branch || 'main';

  // 2. Check README
  let hasReadme = false;
  try {
    await octokit.rest.repos.getReadme({ owner, repo });
    hasReadme = true;
  } catch {
    hasReadme = false;
  }

  // 3. Check .gitignore
  let hasGitignore = false;
  try {
    await octokit.rest.repos.getContent({ owner, repo, path: '.gitignore' });
    hasGitignore = true;
  } catch {
    hasGitignore = false;
  }

  // 4. Check License
  const hasLicense = Boolean(repoData.license);
  const licenseName = repoData.license?.name || undefined;

  // 5. Open Issues & Days since activity
  const openIssuesCount = repoData.open_issues_count || 0;
  const lastPushed = new Date(repoData.pushed_at || repoData.updated_at || Date.now());
  const daysSinceLastActivity = Math.max(
    0,
    Math.floor((Date.now() - lastPushed.getTime()) / (1000 * 60 * 60 * 24))
  );

  // 6. Branch Protection Check
  let branchProtection: RepoHealthDiagnosticsResult['branchProtection'] | undefined = undefined;
  try {
    const bpRes = await octokit.rest.repos.getBranchProtection({
      owner,
      repo,
      branch: defaultBranch
    });
    branchProtection = {
      isProtected: true,
      requiresPullRequest: Boolean(bpRes.data.required_pull_request_reviews),
      enforceAdmins: Boolean(bpRes.data.enforce_admins?.enabled)
    };
  } catch {
    branchProtection = {
      isProtected: false,
      requiresPullRequest: false,
      enforceAdmins: false
    };
  }

  // 7. Recent Commit Secret Scanning (Default branch recent commit diffs)
  const findings: string[] = [];
  try {
    const recentCommits = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 5
    });

    // High-risk patterns
    const patterns = [
      { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
      { name: 'Private Key Block', regex: /-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----/ },
      { name: 'GitHub Personal Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
      { name: 'Generic Secret Assignment', regex: /(?:api_key|secret_key|private_key|token)\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/i }
    ];

    for (const c of recentCommits.data) {
      try {
        const detail = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: c.sha
        });

        for (const file of detail.data.files || []) {
          // Check for .env commits
          if (file.filename.includes('.env') && !file.filename.includes('.example')) {
            findings.push(`File "${file.filename}" in commit ${c.sha.slice(0, 7)} matches sensitive environment pattern`);
          }

          // Check patch contents
          if (file.patch) {
            for (const p of patterns) {
              if (p.regex.test(file.patch)) {
                findings.push(`Pattern matching "${p.name}" detected in ${file.filename} (commit ${c.sha.slice(0, 7)})`);
              }
            }
          }
        }
      } catch {
        // Skip commit inspection error
      }
    }
  } catch (err: any) {
    logger.warn('Failed inspecting recent commits for secrets', { err: err.message });
  }

  // Calculate Health Score (0 - 100)
  let healthScore = 20; // Base score for having an active repository
  const recommendations: string[] = [];

  if (hasReadme) {
    healthScore += 20;
  } else {
    recommendations.push('Add a README.md file explaining project setup, architecture and usage.');
  }

  if (hasGitignore) {
    healthScore += 20;
  } else {
    recommendations.push('Add a .gitignore file to prevent accidental commits of build artifacts or credentials.');
  }

  if (hasLicense) {
    healthScore += 15;
  } else {
    recommendations.push('Add an open source LICENSE (e.g. MIT, Apache 2.0) to clarify reuse permissions.');
  }

  if (branchProtection?.isProtected) {
    healthScore += 15;
  } else {
    recommendations.push(`Enable branch protection rules on default branch "${defaultBranch}" to enforce review.`);
  }

  if (daysSinceLastActivity < 30) {
    healthScore += 10;
  } else {
    recommendations.push(`No activity in ${daysSinceLastActivity} days. Consider verifying sync schedule.`);
  }

  if (findings.length > 0) {
    healthScore = Math.max(10, healthScore - 30);
    recommendations.unshift(`CRITICAL: Potentially exposed secrets detected in recent commits. Rotate credentials immediately.`);
  }

  return {
    repoFullName,
    healthScore: Math.min(100, Math.max(0, healthScore)),
    hasReadme,
    hasGitignore,
    hasLicense,
    licenseName,
    openIssuesCount,
    daysSinceLastActivity,
    branchProtection,
    secretScanResult: {
      safe: findings.length === 0,
      findings
    },
    scannedScope: `Inspected default branch ('${defaultBranch}'), root configuration files (.gitignore, README, LICENSE), repository metadata, and recent commit diffs. Full-history clone or complete repository tree scan was not performed.`,
    recommendations
  };
}

/**
 * Verify GitHub webhook HMAC-SHA256 signature
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signatureHeader.replace('sha256=', '');
  const computedHash = crypto
    .createHmac('sha256', ENV.GITHUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');

  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
}

/**
 * Process verified incoming GitHub webhook
 */
export async function handleGitHubWebhook(
  deliveryId: string,
  event: string,
  signature: string,
  rawBody: Buffer | string,
  payload: any
): Promise<{ status: string; message: string }> {
  // 1. Signature Verification
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new Error('INVALID_WEBHOOK_SIGNATURE: Webhook signature verification failed');
  }

  // 2. Delivery Deduplication
  if (deliveryId && processedDeliveries.has(deliveryId)) {
    return { status: 'DUPLICATE', message: 'Webhook event already processed' };
  }
  if (deliveryId) {
    processedDeliveries.add(deliveryId);
  }

  const repoFullName = payload?.repository?.full_name;
  const senderLogin = payload?.sender?.login || 'unknown';

  logger.info(`Received GitHub webhook: event=${event}, repo=${repoFullName}, sender=${senderLogin}`);

  // 3. Find connected repository and user
  let userId: Types.ObjectId | undefined;
  if (repoFullName && mongoose.connection.readyState === 1) {
    const repoConn = await RepositoryConnection.findOne({ repoFullName });
    if (repoConn) {
      userId = repoConn.userId;
      // Update lastSyncedAt on push event
      if (event === 'push') {
        repoConn.lastSyncedAt = new Date();
        await repoConn.save();
      }
    }
  }

  // 4. Log immutable audit entry for incoming webhook event
  await logAuditEvent({
    userId: userId?.toString() || '000000000000000000000000',
    component: 'API',
    action: `GITHUB_WEBHOOK_${event.toUpperCase()}`,
    status: 'SUCCESS',
    description: `Processed incoming ${event} webhook for ${repoFullName || 'repository'} from @${senderLogin}`,
    metadata: {
      deliveryId,
      event,
      repoFullName,
      ref: payload?.ref,
      commitCount: payload?.commits?.length || 0
    }
  });

  return { status: 'PROCESSED', message: `Event ${event} recorded successfully` };
}
