import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Octokit } from '@octokit/rest';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ConnectRepositoryInputSchema } from '@streakforge/validation';
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

    // Fetch user's repositories from GitHub via Octokit
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
          per_page: 50
        });

        githubAvailable = ghRepos.data.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          defaultBranch: r.default_branch,
          htmlUrl: r.html_url
        }));
      } catch {
        // If GitHub API call fails, continue with connected repos
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
        defaultBranch = 'main',
        isTargetForLeetCode = true,
        solutionPathPattern = 'solutions/{difficulty}/{id}-{slug}',
        autoCommitEnabled = false
      } = req.body;

      // If designating as target, unset previous targets
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
          defaultBranch,
          isTargetForLeetCode,
          solutionPathPattern,
          autoCommitEnabled
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'REPOSITORY_CONNECTED',
        status: 'SUCCESS',
        description: `Connected repository ${repoFullName} as ${isTargetForLeetCode ? 'primary LeetCode target' : 'monitored repository'}`
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
