import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import type { AuditComponent, AuditStatus } from '@streakforge/shared-types';
import { logger } from '../utils/logger.js';

export interface CreateAuditLogParams {
  userId: string | Types.ObjectId;
  component: AuditComponent;
  action: string;
  status: AuditStatus;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    await AuditLog.create({
      userId: new Types.ObjectId(params.userId.toString()),
      component: params.component,
      action: params.action,
      status: params.status,
      description: params.description,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date()
    });

    logger.info(`[AUDIT] ${params.component}:${params.action} - ${params.status}`, {
      userId: params.userId.toString(),
      description: params.description
    });
  } catch (error) {
    logger.error('Failed to write audit log entry', { error, params });
  }
}

