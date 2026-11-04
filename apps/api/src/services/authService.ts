import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { Account } from '../models/Account.js';
import { encryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';

export function generateAuthToken(user: IUserDocument): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      githubId: user.githubId,
      username: user.username
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function exchangeGitHubCode(code: string): Promise<{ token: string; user: IUserDocument }> {
  // 1. Request access token from GitHub
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: ENV.GITHUB_CLIENT_ID,
      client_secret: ENV.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = (await tokenRes.json()) as any;
  if (!tokenData.access_token) {
    logger.error('GitHub OAuth token exchange failed', { error: tokenData });
    throw new Error(tokenData.error_description || 'Failed to exchange GitHub authorization code');
  }

  const accessToken = tokenData.access_token;
  const scopes = (tokenData.scope || '').split(',').map((s: string) => s.trim());

  // 2. Fetch authenticated user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'StreakForge-App'
    }
  });

  if (!userRes.ok) {
    throw new Error('Failed to retrieve GitHub user profile');
  }

  const ghUser = (await userRes.json()) as any;

  // 3. Fetch user emails if primary is missing/private
  let primaryEmail = ghUser.email;
  if (!primaryEmail) {
    try {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'StreakForge-App'
        }
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as any[];
        const primary = emails.find((e) => e.primary) || emails[0];
        primaryEmail = primary?.email;
      }
    } catch {
      // Ignore failure, will fallback to username@users.noreply.github.com
    }
  }

  if (!primaryEmail) {
    primaryEmail = `${ghUser.login}@users.noreply.github.com`;
  }

  // 4. Upsert User
  let user = await User.findOne({ githubId: ghUser.id.toString() });
  if (!user) {
    user = new User({
      githubId: ghUser.id.toString(),
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      email: primaryEmail,
      avatarUrl: ghUser.avatar_url || '',
      timezone: 'UTC'
    });
  } else {
    user.username = ghUser.login;
    user.name = ghUser.name || user.name;
    user.avatarUrl = ghUser.avatar_url || user.avatarUrl;
  }
  await user.save();

  // 5. Encrypt token and upsert Account
  const encryptedToken = encryptToken(accessToken);
  await Account.findOneAndUpdate(
    { userId: user._id, provider: 'github' },
    {
      providerAccountId: ghUser.id.toString(),
      accessTokenEncrypted: encryptedToken,
      scopes
    },
    { upsert: true, new: true }
  );

  // 6. Record audit event
  await logAuditEvent({
    userId: user._id,
    component: 'API',
    action: 'OAUTH_LOGIN',
    status: 'SUCCESS',
    description: `User @${user.username} successfully authenticated via GitHub OAuth`
  });

  const sessionToken = generateAuthToken(user);
  return { token: sessionToken, user };
}

