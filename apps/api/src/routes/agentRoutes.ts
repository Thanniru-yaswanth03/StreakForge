import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireAgentAuth, AgentAuthenticatedRequest } from '../middleware/agentAuth.js';
import { validateBody } from '../middleware/validate.js';
import {
  AgentRegisterInputSchema,
  AgentHeartbeatInputSchema
} from '@streakforge/validation';
import { registerLocalAgent, recordAgentHeartbeat } from '../services/agentService.js';
import { LocalAgentInstance } from '../models/LocalAgentInstance.js';

export const agentRouter: Router = Router();

// User registers a new agent
agentRouter.post(
  '/register',
  requireAuth,
  validateBody(AgentRegisterInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const response = await registerLocalAgent(req.userId!, req.body);
      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error) {
      next(error);
    }
  }
);

// Agent sends heartbeat and recent git activities
agentRouter.post(
  '/heartbeat',
  requireAgentAuth,
  validateBody(AgentHeartbeatInputSchema),
  async (req: AgentAuthenticatedRequest, res: Response, next) => {
    try {
      await recordAgentHeartbeat(req.agent!, req.body);
      res.json({
        success: true,
        data: {
          status: req.agent!.status,
          rules: req.agent!.rules,
          acknowledgedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Agent queries configured auto-commit & auto-push rules
agentRouter.get('/rules', requireAgentAuth, async (req: AgentAuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      rules: req.agent!.rules,
      watchedPaths: req.agent!.watchedPaths
    }
  });
});

// User lists their connected local agents
agentRouter.get('/list', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const agents = await LocalAgentInstance.find({
      userId: new Types.ObjectId(req.userId)
    }).sort({ lastHeartbeatAt: -1 });

    const sanitized = agents.map((a) => ({
      id: a._id,
      agentId: a.agentId,
      name: a.name,
      hostname: a.hostname,
      os: a.os,
      agentVersion: a.agentVersion,
      status: a.status,
      lastHeartbeatAt: a.lastHeartbeatAt,
      watchedPaths: a.watchedPaths,
      rules: a.rules
    }));

    res.json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    next(error);
  }
});
