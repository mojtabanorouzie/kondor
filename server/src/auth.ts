import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AppConfig {
  jwtSecret: string;
  bcryptRounds: number;
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
}

export interface AccessTokenPayload extends JWTPayload {
  type: 'access';
  email: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  type: 'refresh';
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  userId: string,
  email: string,
  secret: string,
): Promise<string> {
  return new SignJWT({ type: 'access', email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(encodeSecret(secret));
}

export async function signRefreshToken(
  userId: string,
  sessionId: string,
  secret: string,
): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodeSecret(secret));
}

export async function verifyJwt(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret));
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string, rounds: number): Promise<string> {
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Create a session row and return a fresh token pair. */
export async function issueTokens(
  db: Database.Database,
  userId: string,
  email: string,
  secret: string,
): Promise<TokenPair> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  const refreshToken = await signRefreshToken(userId, sessionId, secret);
  db.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(sessionId, userId, hashToken(refreshToken), expiresAt, Date.now());

  const accessToken = await signAccessToken(userId, email, secret);
  return { accessToken, refreshToken };
}

/**
 * Verify the Bearer access JWT in the Authorization header.
 * Returns the user id on success, or sends 401 and returns null.
 */
export async function requireAuth(
  secret: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    await reply.status(401).send({ error: 'Missing or invalid Authorization header' });
    return null;
  }
  const payload = (await verifyJwt(auth.slice(7), secret)) as AccessTokenPayload | null;
  if (!payload || payload.type !== 'access' || !payload.sub) {
    await reply.status(401).send({ error: 'Invalid or expired token' });
    return null;
  }
  return payload.sub;
}
