import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Octokit } from '@octokit/rest';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  ConnectRepositoryInputSchema,
  UpdateRepositoryInputSchema
} from '@streakforge/validation';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { Account } from '../models/Account.js';
import { decryptToken } from '../utils/crypto.js';
import { logAuditEvent } from '../services/auditService.js';

export const repoRouter: Router = Router();

repoRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const connected = await RepositoryConnection.find({
      userId: new Types.ObjectId(req.userId)
    }).sort({ createdAt: -1 });

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
      const {
        repoFullName,
        githubRepoId,
        description,
        primaryLanguage,
        cloneUrl,
        defaultBranch = 'main',
        isTargetForLeetCode = true,
        solutionPathPattern = 'solutions/{difficulty}/{id}-{slug}',
        autoCommitEnabled = false,
        category = 'LeetCode Solutions',
        permissions = { admin: false, push: true, pull: true },
        syncPolicy
      } = req.body;

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

      res.status(201).json({
        success: true,
        data: connection
      });
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
      const repoId = String(req.params.id);
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
        { _id: new Types.ObjectId(repoId), userId: new Types.ObjectId(req.userId) },
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

      res.json({
        success: true,
        data: connection
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
      const repoId = String(req.params.id);
      const connection = await RepositoryConnection.findOneAndDelete({
        _id: new Types.ObjectId(repoId),
        userId: new Types.ObjectId(req.userId)
      });

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

      res.json({
        success: true,
        data: { message: `Disconnected repository ${connection.repoFullName}` }
      });
    } catch (error) {
      next(error);
    }
  }
);
