import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Octokit } from '@octokit/rest';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  ConnectRepositoryInputSchema,
  UpdateRepositoryInputSchema,
  CreateGitHubRepoInputSchema,
  TestRepoAccessInputSchema
} from '@streakforge/validation';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { Account } from '../models/Account.js';
import { decryptToken } from '../utils/crypto.js';
import { logAuditEvent } from '../services/auditService.js';
import { invalidateGitHubActivityCache } from '../services/githubService.js';

export const repoRouter: Router = Router();

repoRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawConnected = await RepositoryConnection.find({
      userId: new Types.ObjectId(req.userId)
    }).sort({ createdAt: -1 });

    const connected = rawConnected.map((r) => {
      const obj = r.toObject();
      return {
        ...obj,
        id: r._id.toString(),
        _id: r._id.toString()
      };
    });

    // Fetch user's repositories from GitHub via Octokit with full metadata
    let githubAvailable: any[] = [];
    const account = await Account.findOne({
      userId: new Types.ObjectId(req.userId),
      provider: 'github'
    });

    if (account?.accessTokenEncrypted) {
      try {
        const rawToken = decryptToken(account.accessTokenEncrypted);
        const octokit = new Octokit({ auth: rawToken });
        const ghRepos = await octokit.rest.repos.listForAuthenticatedUser({
          sort: 'updated',
          per_page: 100,
          affiliation: 'owner,collaborator,organization_member'
        });

        githubAvailable = ghRepos.data.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description || '',
          isPrivate: r.private,
          visibility: r.visibility || (r.private ? 'private' : 'public'),
          primaryLanguage: r.language || 'Unknown',
          defaultBranch: r.default_branch,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          cloneUrl: r.clone_url,
          htmlUrl: r.html_url,
          permissions: {
            admin: Boolean(r.permissions?.admin),
            push: Boolean(r.permissions?.push),
            pull: Boolean(r.permissions?.pull ?? true)
          }
        }));
      } catch {
        // If GitHub API call fails (rate limit or offline), continue with connected repos
      }
    }

    res.json({
      success: true,
      data: {
        connected,
        githubAvailable
      }
    });
  } catch (error) {
    next(error);
  }
});

repoRouter.post(
  '/connect',
  requireAuth,
  validateBody(ConnectRepositoryInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      let {
        repoFullName,
        githubRepoId,
        description,
        primaryLanguage,
        cloneUrl,
        defaultBranch = 'main',
        isPrivate = false,
        isTargetForLeetCode = true,
        solutionPathPattern = 'solutions/{difficulty}/{id}-{slug}',
        autoCommitEnabled = false,
        category = 'LeetCode Solutions',
        permissions = { admin: false, push: true, pull: true },
        syncPolicy
      } = req.body;

      // Verify genuine GitHub repository ownership/permissions and branch existence when GitHub account is linked
      const account = await Account.findOne({
        userId: new Types.ObjectId(req.userId),
        provider: 'github'
      });

      if (account?.accessTokenEncrypted && process.env.NODE_ENV !== 'test') {
        const rawToken = decryptToken(account.accessTokenEncrypted);
        if (rawToken && rawToken !== 'gho_dummy_token_for_local_development_mode') {
          const [owner, repo] = repoFullName.split('/');
          if (!owner || !repo) {
            res.status(400).json({
              success: false,
              error: { code: 'INVALID_REPO_NAME', message: 'Repository name must be in owner/repo format.' }
            });
            return;
          }

          const octokit = new Octokit({ auth: rawToken });
          let repoData: any;
          try {
            const repoRes = await octokit.rest.repos.get({ owner, repo });
            repoData = repoRes.data;
          } catch (ghErr: any) {
            const status = ghErr?.status === 404 ? 404 : ghErr?.status === 401 ? 401 : 400;
            res.status(status).json({
              success: false,
              error: {
                code: status === 401 ? 'GITHUB_TOKEN_INVALID' : 'GITHUB_REPO_INACCESSIBLE',
                message:
                  status === 401
                    ? 'Your GitHub access token is invalid or revoked. Please reconnect GitHub.'
                    : `Unable to access GitHub repository "${repoFullName}": ${ghErr?.message || 'Not found or permission denied'}`
              }
            });
            return;
          }

          if (repoData.permissions && !repoData.permissions.push && !repoData.permissions.admin) {
            res.status(403).json({
              success: false,
              error: {
                code: 'GITHUB_PUSH_PERMISSION_DENIED',
                message: `Your GitHub account lacks write/push permissions for "${repoFullName}".`
              }
            });
            return;
          }

          const targetBranch = defaultBranch || repoData.default_branch || 'main';
          try {
            await octokit.rest.repos.getBranch({ owner, repo, branch: targetBranch });
          } catch (branchErr: any) {
            // Check whether repo is simply empty/uninitialized (0 branches)
            const branchesList = await octokit.rest.repos.listBranches({ owner, repo, per_page: 5 });
            if (branchesList.data.length > 0) {
              res.status(400).json({
                success: false,
                error: {
                  code: 'GITHUB_BRANCH_NOT_FOUND',
                  message: `Branch "${targetBranch}" does not exist in repository "${repoFullName}".`
                }
              });
              return;
            }
          }

          githubRepoId = repoData.id;
          defaultBranch = targetBranch;
          isPrivate = Boolean(repoData.private);
          description = description ?? (repoData.description || undefined);
          primaryLanguage = primaryLanguage ?? (repoData.language || undefined);
          cloneUrl = cloneUrl ?? repoData.clone_url;
          permissions = repoData.permissions || permissions;
        }
      }

      if (!githubRepoId || githubRepoId <= 0) {
        // Deterministic positive numeric identifier for local/test connections without remote GitHub lookup
        let hash = 0;
        for (let i = 0; i < repoFullName.length; i += 1) {
          hash = (hash * 31 + repoFullName.charCodeAt(i)) % 2147483647;
        }
        githubRepoId = Math.max(1, Math.abs(hash));
      }

      // If designating as primary target for LeetCode, unset previous targets
      if (isTargetForLeetCode) {
        await RepositoryConnection.updateMany(
          { userId: new Types.ObjectId(req.userId) },
          { isTargetForLeetCode: false }
        );
      }

      const connection = await RepositoryConnection.findOneAndUpdate(
        { userId: new Types.ObjectId(req.userId), repoFullName },
        {
          githubRepoId,
          description,
          primaryLanguage,
          cloneUrl,
          defaultBranch,
          isPrivate,
          isTargetForLeetCode,
          solutionPathPattern,
          autoCommitEnabled,
          category,
          permissions,
          syncPolicy: syncPolicy || {
            autoCommit: autoCommitEnabled,
            autoPush: autoCommitEnabled,
            branch: defaultBranch,
            pathPattern: solutionPathPattern,
            intervalMinutes: 15
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'REPOSITORY_CONNECTED',
        status: 'SUCCESS',
        description: `Connected repository ${repoFullName} (category: ${category})`
      });
      invalidateGitHubActivityCache(req.userId!);

      res.status(201).json({
        success: true,
        data: connection
      });
    } catch (error) {
      next(error);
    }
  }
);

repoRouter.post(
  '/create',
  requireAuth,
  validateBody(CreateGitHubRepoInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const account = await Account.findOne({
        userId: new Types.ObjectId(req.userId),
        provider: 'github'
      });

      if (!account?.accessTokenEncrypted) {
        res.status(401).json({
          success: false,
          error: {
            code: 'GITHUB_NOT_CONNECTED',
            message: 'Connect your GitHub account before creating a repository.'
          }
        });
        return;
      }

      const {
        name,
        description,
        isPrivate = false,
        autoInit = true,
        isTargetForLeetCode = true,
        solutionPathPattern = 'solutions/{difficulty}/{id}-{slug}',
        autoCommitEnabled = true
      } = req.body;

      const rawToken = decryptToken(account.accessTokenEncrypted);
      const octokit = new Octokit({ auth: rawToken });

      let created: any;
      try {
        const ghRes = await octokit.rest.repos.createForAuthenticatedUser({
          name,
          description,
          private: isPrivate,
          auto_init: autoInit
        });
        created = ghRes.data;
      } catch (ghErr: any) {
        const status = ghErr?.status === 401 ? 401 : ghErr?.status === 422 ? 422 : 400;
        res.status(status).json({
          success: false,
          error: {
            code: status === 401 ? 'GITHUB_TOKEN_INVALID' : 'GITHUB_REPO_CREATE_FAILED',
            message: ghErr?.message || `Failed to create GitHub repository "${name}".`
          }
        });
        return;
      }

      if (isTargetForLeetCode) {
        await RepositoryConnection.updateMany(
          { userId: new Types.ObjectId(req.userId) },
          { isTargetForLeetCode: false }
        );
      }

      const defaultBranch = created.default_branch || 'main';
      const connection = await RepositoryConnection.create({
        userId: new Types.ObjectId(req.userId),
        githubRepoId: created.id,
        repoFullName: created.full_name,
        description: created.description || description,
        primaryLanguage: created.language || undefined,
        cloneUrl: created.clone_url,
        defaultBranch,
        isPrivate: Boolean(created.private),
        isTargetForLeetCode,
        solutionPathPattern,
        autoCommitEnabled,
        category: 'LeetCode Solutions',
        permissions: { admin: true, push: true, pull: true },
        syncPolicy: {
          autoCommit: autoCommitEnabled,
          autoPush: autoCommitEnabled,
          branch: defaultBranch,
          pathPattern: solutionPathPattern,
          intervalMinutes: 15
        }
      });

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'REPOSITORY_CREATED',
        status: 'SUCCESS',
        description: `Created GitHub repository ${created.full_name} and connected it as LeetCode target=${isTargetForLeetCode}`
      });
      invalidateGitHubActivityCache(req.userId!);

      res.status(201).json({
        success: true,
        data: {
          ...connection.toObject(),
          id: connection._id.toString(),
          _id: connection._id.toString(),
          htmlUrl: created.html_url
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

repoRouter.get(
  '/branches',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const repoFullName = String(req.query.repoFullName || '').trim();
      const [owner, repo] = repoFullName.split('/');
      if (!owner || !repo) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REPO_NAME', message: 'Query parameter repoFullName (owner/repo) is required.' }
        });
        return;
      }

      const account = await Account.findOne({
        userId: new Types.ObjectId(req.userId),
        provider: 'github'
      });
      if (!account?.accessTokenEncrypted) {
        res.status(401).json({
          success: false,
          error: { code: 'GITHUB_NOT_CONNECTED', message: 'GitHub account not connected.' }
        });
        return;
      }

      const rawToken = decryptToken(account.accessTokenEncrypted);
      const octokit = new Octokit({ auth: rawToken });
      const [repoRes, branchesRes] = await Promise.all([
        octokit.rest.repos.get({ owner, repo }),
        octokit.rest.repos.listBranches({ owner, repo, per_page: 50 })
      ]);

      const branches = branchesRes.data.map((b) => ({
        name: b.name,
        protected: Boolean(b.protected),
        sha: b.commit.sha
      }));

      res.json({
        success: true,
        data: {
          repoFullName,
          defaultBranch: repoRes.data.default_branch || 'main',
          isEmptyRepo: branches.length === 0,
          branches
        }
      });
    } catch (ghErr: any) {
      if (ghErr?.status === 404 || ghErr?.status === 401) {
        res.status(ghErr.status).json({
          success: false,
          error: {
            code: ghErr.status === 401 ? 'GITHUB_TOKEN_INVALID' : 'GITHUB_REPO_NOT_FOUND',
            message: ghErr.message || 'Unable to inspect repository branches.'
          }
        });
        return;
      }
      next(ghErr);
    }
  }
);

repoRouter.post(
  '/test-access',
  requireAuth,
  validateBody(TestRepoAccessInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { repoFullName, branch } = req.body;
      const [owner, repo] = repoFullName.split('/');

      const account = await Account.findOne({
        userId: new Types.ObjectId(req.userId),
        provider: 'github'
      });
      if (!account?.accessTokenEncrypted) {
        res.status(401).json({
          success: false,
          error: { code: 'GITHUB_NOT_CONNECTED', message: 'GitHub account is not connected.' }
        });
        return;
      }

      const rawToken = decryptToken(account.accessTokenEncrypted);
      const octokit = new Octokit({ auth: rawToken });

      try {
        const repoRes = await octokit.rest.repos.get({ owner, repo });
        const repoData = repoRes.data;
        const targetBranch = branch || repoData.default_branch || 'main';
        const branchesRes = await octokit.rest.repos.listBranches({ owner, repo, per_page: 30 });
        const isEmptyRepo = branchesRes.data.length === 0;
        const branchExists = isEmptyRepo || branchesRes.data.some((b) => b.name === targetBranch);
        const canPush = Boolean(repoData.permissions?.push || repoData.permissions?.admin);

        res.json({
          success: true,
          data: {
            repoFullName,
            branch: targetBranch,
            accessible: true,
            canPush,
            isPrivate: Boolean(repoData.private),
            defaultBranch: repoData.default_branch || 'main',
            isEmptyRepo,
            branchExists,
            permissions: {
              admin: Boolean(repoData.permissions?.admin),
              push: Boolean(repoData.permissions?.push),
              pull: Boolean(repoData.permissions?.pull ?? true)
            },
            message: !canPush
              ? 'Read-only access: your token does not have push permission to this repository.'
              : !branchExists
                ? `Repository reachable, but branch "${targetBranch}" does not exist.`
                : isEmptyRepo
                  ? 'Repository accessible with write permission (empty repo will be initialized on first push).'
                  : `Verified push access to "${repoFullName}" (${targetBranch}).`
          }
        });
      } catch (ghErr: any) {
        res.json({
          success: true,
          data: {
            repoFullName,
            branch: branch || 'main',
            accessible: false,
            canPush: false,
            isPrivate: false,
            defaultBranch: 'main',
            isEmptyRepo: false,
            branchExists: false,
            permissions: { admin: false, push: false, pull: false },
            message:
              ghErr?.status === 401
                ? 'GitHub token expired or revoked.'
                : ghErr?.status === 404
                  ? `Repository "${repoFullName}" not found or private without repo scope.`
                  : ghErr?.message || 'Unable to verify repository access.'
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

repoRouter.patch(
  '/:id',
  requireAuth,
  validateBody(UpdateRepositoryInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const repoParam = decodeURIComponent(String(req.params.id));
      const repoFilter = Types.ObjectId.isValid(repoParam)
        ? { _id: new Types.ObjectId(repoParam), userId: new Types.ObjectId(req.userId) }
        : { repoFullName: repoParam, userId: new Types.ObjectId(req.userId) };

      const {
        category,
        defaultBranch,
        isTargetForLeetCode,
        solutionPathPattern,
        autoCommitEnabled,
        syncPolicy
      } = req.body;

      if (isTargetForLeetCode) {
        await RepositoryConnection.updateMany(
          { userId: new Types.ObjectId(req.userId) },
          { isTargetForLeetCode: false }
        );
      }

      const updateData: Record<string, any> = {};
      if (category !== undefined) updateData.category = category;
      if (defaultBranch !== undefined) updateData.defaultBranch = defaultBranch;
      if (isTargetForLeetCode !== undefined) updateData.isTargetForLeetCode = isTargetForLeetCode;
      if (solutionPathPattern !== undefined) updateData.solutionPathPattern = solutionPathPattern;
      if (autoCommitEnabled !== undefined) updateData.autoCommitEnabled = autoCommitEnabled;
      if (syncPolicy !== undefined) updateData.syncPolicy = syncPolicy;

      const connection = await RepositoryConnection.findOneAndUpdate(
        repoFilter,
        { $set: updateData },
        { new: true }
      );

      if (!connection) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Repository connection not found' }
        });
        return;
      }

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'REPOSITORY_POLICY_UPDATED',
        status: 'SUCCESS',
        description: `Updated configuration and synchronization policy for ${connection.repoFullName}`
      });
      invalidateGitHubActivityCache(req.userId!);

      res.json({
        success: true,
        data: {
          ...connection.toObject(),
          id: connection._id.toString(),
          _id: connection._id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

repoRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const repoParam = decodeURIComponent(String(req.params.id));
      const repoFilter = Types.ObjectId.isValid(repoParam)
        ? { _id: new Types.ObjectId(repoParam), userId: new Types.ObjectId(req.userId) }
        : { repoFullName: repoParam, userId: new Types.ObjectId(req.userId) };

      const connection = await RepositoryConnection.findOneAndDelete(repoFilter);

      if (!connection) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Repository connection not found' }
        });
        return;
      }

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'REPOSITORY_DISCONNECTED',
        status: 'WARNING',
        description: `Disconnected repository ${connection.repoFullName}`
      });
      invalidateGitHubActivityCache(req.userId!);

      res.json({
        success: true,
        data: { message: `Disconnected repository ${connection.repoFullName}` }
      });
    } catch (error) {
      next(error);
    }
  }
);
