import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QrChallengeStore, SessionStore } from './stores';

const user = { id: 'user-1', nickname: 'Origin', avatarUrl: null };

describe('session stores', () => {
  it('stores only an encrypted upstream cookie and resolves a bearer token', () => {
    const store = new SessionStore('a-test-secret-that-is-long-enough', 60_000);
    const created = store.create(user, 'MUSIC_U=upstream-secret');

    expect(created.token).not.toContain('upstream-secret');
    expect(store.get(created.token)).toMatchObject({ user, cookie: 'MUSIC_U=upstream-secret' });
    expect(store.get('invalid-token')).toBeNull();

    store.revoke(created.token);
    expect(store.get(created.token)).toBeNull();
  });

  it('restores encrypted sessions after a gateway restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'siplayer-session-'));
    const path = join(directory, 'sessions.json');
    try {
      const first = new SessionStore('a-test-secret-that-is-long-enough', 60_000, path);
      const created = first.create(user, 'MUSIC_U=upstream-secret');
      const persisted = readFileSync(path, 'utf8');
      const second = new SessionStore('a-test-secret-that-is-long-enough', 60_000, path);

      expect(persisted).not.toContain('upstream-secret');
      expect(second.get(created.token)).toMatchObject({ user, cookie: 'MUSIC_U=upstream-secret' });
      expect(readdirSync(directory).filter((name) => name.endsWith('.tmp'))).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps the in-memory session when persistence is temporarily unavailable', () => {
    const directory = mkdtempSync(join(tmpdir(), 'siplayer-session-'));
    const errors: unknown[] = [];
    try {
      const store = new SessionStore('a-test-secret-that-is-long-enough', 60_000, directory, (error) => errors.push(error));
      const created = store.create(user, 'MUSIC_U=upstream-secret');

      expect(store.get(created.token)).toMatchObject({ user, cookie: 'MUSIC_U=upstream-secret' });
      expect(errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).not.toContain('upstream-secret');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('expires QR challenges without returning the upstream key to callers', () => {
    const store = new QrChallengeStore();
    const challenge = store.create('unikey-secret', new Date(Date.now() + 60_000).toISOString());

    expect(challenge.id).toMatch(/^qr_challenge_/);
    expect(challenge.upstreamKey).toBe('unikey-secret');
    expect(store.get(challenge.id)?.upstreamKey).toBe('unikey-secret');

    store.delete(challenge.id);
    expect(store.get(challenge.id)).toBeNull();
  });
});
