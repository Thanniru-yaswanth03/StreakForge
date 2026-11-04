import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { LocalAgentInstance, ILocalAgentInstanceDocument } from '../models/LocalAgentInstance.js';
import { generateAgentApiKey, hashApiKey } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { recordDailyActivity } from './streakService.js';
import type {
  AgentRegisterInput,
  AgentRegisterResponse,
  AgentHeartbeatInput
} from '@streakforge/shared-types';

export async function registerLocalAgent(
  userId: string,
  input: AgentRegisterInput
): Promise<AgentRegisterResponse> {
  const agentId = crypto.randomUUID();
  const rawApiKey = generateAgentApiKey();
  const apiKeyHash = hashApiKey(rawApiKey);

  const agent = new LocalAgentInstance({
    userId: new Types.ObjectId(userId),
    agentId,
    name: input.name,
    hostname: input.hostname,
    os: input.os,
    agentVersion: input.agentVersion,
    apiKeyHash,
    status: 'ONLINE',
    lastHeartbeatAt: new Date(),
    watchedPaths: [],
    rules: {
      idleAutoCommitMinutes: 15,
      autoPushOnCommit: false,
      allowedBranches: ['main', 'master', 'dev']
    }
  });

  await agent.save();

  await logAuditEvent({
    userId,
    component: 'AGENT',
    action: 'AGENT_REGISTERED',
    status: 'SUCCESS',
    description: `Registered new local agent "${input.name}" on host ${input.hostname}`,
    metadata: { agentId, hostname: input.hostname, os: input.os }
  });

  return {
    agentId,
    apiKey: rawApiKey,
    name: agent.name
  };
}

export async function recordAgentHeartbeat(
  agent: ILocalAgentInstanceDocument,
  input: AgentHeartbeatInput
): Promise<void> {
  agent.status = input.status;
  agent.watchedPaths = input.watchedPaths;
  agent.lastHeartbeatAt = new Date();

  // Process any genuine local commit activities reported by the desktop agent
  if (input.recentActivities && input.recentActivities.length > 0) {
    for (const act of input.recentActivities) {
      await recordDailyActivity(
        agent.userId,
        'GIT_COMMIT',
        undefined,
        new Date(act.timestamp)
      );

      await logAuditEvent({
        userId: agent.userId,
        component: 'AGENT',
        action: 'LOCAL_GIT_COMMIT',
        status: 'SUCCESS',
        description: `Agent "${agent.name}" detected commit ${act.commitSha.slice(0, 7)}: "${act.commitMessage}"`,
        metadata: {
          commitSha: act.commitSha,
          repoPath: act.repoPath,
          filesChanged: act.filesChanged,
          hostname: agent.hostname
        }
      });
    }
  }

  await agent.save();
}

