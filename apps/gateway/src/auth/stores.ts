import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { UserProfile } from '@siplayer/contracts';

export interface SessionPrincipal {
  user: UserProfile;
  cookie: string;
  expiresAt: string;
}

interface StoredSession {
  user: UserProfile;
  encryptedCookie: string;
  expiresAtMs: number;
}

export interface QrChallenge {
  id: string;
  upstreamKey: string;
  expiresAt: string;
}

function encryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function encryptCookie(cookie: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(cookie, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptCookie(value: string, key: Buffer): string | null {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export class SessionStore {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly key: Buffer;
  private readonly ttlMs: number;
  private readonly persistencePath?: string;

  constructor(secret: string, ttlMs: number, persistencePath?: string) {
    this.key = encryptionKey(secret);
    this.ttlMs = ttlMs;
    this.persistencePath = persistencePath;
    this.load();
  }

  private load(): void {
    if (!this.persistencePath) return;
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.persistencePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const value = item as Partial<StoredSession> & { tokenHash?: unknown };
        if (typeof value.tokenHash !== 'string' || typeof value.encryptedCookie !== 'string' || typeof value.expiresAtMs !== 'number' || !value.user) continue;
        this.sessions.set(value.tokenHash, {
          user: value.user,
          encryptedCookie: value.encryptedCookie,
          expiresAtMs: value.expiresAtMs,
        });
      }
      this.pruneExpired(false);
    } catch {
      // A missing or corrupt session file must not prevent the gateway from booting.
    }
  }

  private persist(): void {
    if (!this.persistencePath) return;
    try {
      mkdirSync(dirname(this.persistencePath), { recursive: true });
      const entries = [...this.sessions.entries()].map(([tokenHash, session]) => ({ tokenHash, ...session }));
      writeFileSync(this.persistencePath, JSON.stringify(entries), { encoding: 'utf8', mode: 0o600 });
    } catch {
      // Session persistence is best effort; the in-memory store remains authoritative for this process.
    }
  }

  private pruneExpired(shouldPersist = true): void {
    const now = Date.now();
    let changed = false;
    for (const [tokenHash, session] of this.sessions) {
      if (session.expiresAtMs <= now) {
        this.sessions.delete(tokenHash);
        changed = true;
      }
    }
    if (changed && shouldPersist) this.persist();
  }

  create(user: UserProfile, cookie: string): { token: string; expiresAt: string } {
    this.pruneExpired();
    const token = randomBytes(32).toString('base64url');
    const expiresAtMs = Date.now() + this.ttlMs;
    this.sessions.set(hashToken(token), {
      user,
      encryptedCookie: encryptCookie(cookie, this.key),
      expiresAtMs,
    });
    this.persist();
    return { token, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  get(token: string): SessionPrincipal | null {
    this.pruneExpired();
    const tokenHash = hashToken(token);
    const stored = this.sessions.get(tokenHash);
    if (!stored) return null;
    if (stored.expiresAtMs <= Date.now()) {
      this.sessions.delete(tokenHash);
      this.persist();
      return null;
    }
    const cookie = decryptCookie(stored.encryptedCookie, this.key);
    if (!cookie) {
      this.sessions.delete(tokenHash);
      this.persist();
      return null;
    }
    return {
      user: stored.user,
      cookie,
      expiresAt: new Date(stored.expiresAtMs).toISOString(),
    };
  }

  revoke(token: string): void {
    this.sessions.delete(hashToken(token));
    this.persist();
  }

  size(): number {
    return this.sessions.size;
  }
}

export class QrChallengeStore {
  private readonly challenges = new Map<string, QrChallenge>();

  create(upstreamKey: string, expiresAt: string): QrChallenge {
    const challenge = { id: `qr_challenge_${randomUUID()}`, upstreamKey, expiresAt };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  get(id: string): QrChallenge | null {
    const challenge = this.challenges.get(id);
    if (!challenge) return null;
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      this.challenges.delete(id);
      return null;
    }
    return challenge;
  }

  delete(id: string): void {
    this.challenges.delete(id);
  }
}
