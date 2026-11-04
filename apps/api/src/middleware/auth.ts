import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { isTokenRevoked } from '../services/authService.js';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  userId?: string;
  token?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required'
      }
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (isTokenRevoked(token)) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_REVOKED',
        message: 'Session token has been revoked'
      }
    });
    return;
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found or disabled'
        }
      });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired session token'
      }
    });
  }
}

