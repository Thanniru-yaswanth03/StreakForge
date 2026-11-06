import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { CatalogService } from '../services/catalogService.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';

export const catalogRouter: Router = Router();

/**
 * Preview proposed README update
 */
catalogRouter.get('/preview', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    let repo = (req.query.repo as string || '').trim();
    if (!repo) {
      const target = await RepositoryConnection.findOne({
        userId: req.userId!,
        isTargetForLeetCode: true
      }).lean();
      repo = target?.repoFullName || 'Thanniru-yaswanth03/LeetCodeHustle';
    }

    const preview = await CatalogService.previewCatalog(req.userId!, repo);
    res.json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
});

/**
 * Sync Catalog to GitHub README
 */
catalogRouter.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    let repo = (req.body.repo as string || '').trim();
    if (!repo) {
      const target = await RepositoryConnection.findOne({
        userId: req.userId!,
        isTargetForLeetCode: true
      }).lean();
      repo = target?.repoFullName || 'Thanniru-yaswanth03/LeetCodeHustle';
    }

    const result = await CatalogService.applyCatalogToGitHub(req.userId!, repo);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * Rollback README to previous snapshot
 */
catalogRouter.post('/rollback', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    let repo = (req.body.repo as string || '').trim();
    if (!repo) {
      const target = await RepositoryConnection.findOne({
        userId: req.userId!,
        isTargetForLeetCode: true
      }).lean();
      repo = target?.repoFullName || 'Thanniru-yaswanth03/LeetCodeHustle';
    }

    const result = await CatalogService.rollbackCatalog(req.userId!, repo);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

