import { Request, Response, NextFunction } from 'express';
import { hashApiKey } from '../utils/crypto.js';
import { LocalAgentInstance, ILocalAgentInstanceDocument } from '../models/LocalAgentInstance.js';

export interface AgentAuthenticatedRequest extends Request {
  agent?: ILocalAgentInstanceDocument;
  userId?: string;
}

export async function requireAgentAuth(
  req: AgentAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey =
    (req.headers['x-streakforge-agent-key'] as string) ||
    (req.headers['x-streakforge-key'] as string);

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AGENT_KEY_REQUIRED',
        message: 'Valid desktop agent API key is required in X-StreakForge-Agent-Key header'
      }
    });
    return;
  }

  try {
    const keyHash = hashApiKey(apiKey);
    const agent = await LocalAgentInstance.findOne({ apiKeyHash: keyHash });

    if (!agent) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AGENT_KEY',
          message: 'The provided agent API key is invalid or has been revoked'
        }
      });
      return;
    }

    req.agent = agent;
    req.userId = agent.userId.toString();
    next();
  } catch (error) {
    next(error);
  }
}

