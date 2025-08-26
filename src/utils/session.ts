import { Response } from 'express';
import { randomUUID } from 'crypto';
import { queryOne } from '../db/pool';
import { config } from '../config';

export interface User {
  id: string;
  phone_e164: string;
  password_hash: Buffer;
  failed_login_count: number;
  locked_until: Date | null;
  created_at: Date;
  password_updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function createSession(userId: string): Promise<Session> {
  const sessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.session.ttlDays * 24 * 60 * 60 * 1000);

  const session = await queryOne<Session>(
    `INSERT INTO sessions (id, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sessionId, userId, now, expiresAt]
  );

  if (!session) {
    throw new Error('Failed to create session');
  }

  return session;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await queryOne(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId]
  );
}

export function setSessionCookie(res: Response, sessionId: string): void {
  const maxAge = config.session.ttlDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  res.cookie(config.session.cookieName, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}