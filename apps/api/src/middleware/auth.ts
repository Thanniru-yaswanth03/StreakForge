import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { isTokenRevokedAsync } from '../services/authService.js';

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

  let payload: { userId: string; jti?: string };
  try {
    payload = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; jti?: string };
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token'
      }
    });
    return;
  }

  if (await isTokenRevokedAsync(token)) {
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

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; jti?: string };
    if (!(await isTokenRevokedAsync(token))) {
      const user = await User.findById(payload.userId);
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id.toString();
        req.token = token;
      }
    }
  } catch {
    // Permissive for unauthenticated guests
  }
  next();
}


