import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config.ts';

export interface AdminTokenPayload {
  id: number;
  email: string;
  role: string;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'exp'>, ttlHours = 12): string {
  const fullPayload: AdminTokenPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as AdminTokenPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
  citizen?: CitizenTokenPayload;
}

export interface CitizenTokenPayload {
  id: number;
  email: string;
  role: 'citizen';
  exp: number;
}

export function signCitizenToken(
  payload: Omit<CitizenTokenPayload, 'exp' | 'role'>,
  ttlHours = 24 * 7
): string {
  const fullPayload: CitizenTokenPayload = {
    ...payload,
    role: 'citizen',
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

export function verifyCitizenToken(token: string): CitizenTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    ) as CitizenTokenPayload;
    if (parsed.role !== 'citizen') return null;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in as an administrator.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAdminToken(token);
  if (!payload || payload.role === 'citizen') {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
    return;
  }
  req.admin = payload;
  next();
}

export function requireCitizen(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Please sign in to your citizen account.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyCitizenToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    return;
  }
  req.citizen = payload;
  next();
}

export function getOptionalCitizen(req: Request): CitizenTokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return verifyCitizenToken(token);
}

