import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultSessionStorePath, loadConfig } from './env.js';

describe('gateway config', () => {
  it('uses safe local defaults', () => {
    const config = loadConfig({});

    expect(config.PORT).toBe(8787);
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.NETEASE_API_BASE_URL).toBe('http://127.0.0.1:3000');
    expect(config.TRUST_PROXY).toBe(false);
    expect(config.SESSION_STORE_PATH).toBe(defaultSessionStorePath());
  });

  it('keeps the Windows default on D drive and uses the OS temp directory elsewhere', () => {
    expect(defaultSessionStorePath('win32')).toBe('D:\\tmp\\siplayer\\gateway-sessions.json');
    expect(defaultSessionStorePath('linux')).toBe(join(tmpdir(), 'siplayer', 'gateway-sessions.json'));
  });

  it('rejects an invalid upstream URL', () => {
    expect(() => loadConfig({ NETEASE_API_BASE_URL: 'not-a-url' })).toThrow();
  });

  it('requires explicit secrets and origins in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/Production requires/);
    expect(loadConfig({
      NODE_ENV: 'production',
      SESSION_ENCRYPTION_KEY: 'production-secret-that-is-long-enough',
      ALLOWED_ORIGINS: 'https://player.example.com',
      SESSION_STORE_PATH: '/var/lib/siplayer/sessions.json',
    }).ALLOWED_ORIGINS).toBe('https://player.example.com');
  });

  it('requires an explicit session store path in production', () => {
    expect(() => loadConfig({
      NODE_ENV: 'production',
      SESSION_ENCRYPTION_KEY: 'production-secret-that-is-long-enough',
      ALLOWED_ORIGINS: 'https://player.example.com',
    })).toThrow(/SESSION_STORE_PATH/);
  });

  it('requires an explicit boolean value for trusted proxy mode', () => {
    expect(loadConfig({ TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(true);
    expect(() => loadConfig({ TRUST_PROXY: 'yes' })).toThrow();
  });

  it('allows disabling the response cache', () => {
    const config = loadConfig({ NODE_ENV: 'test', RESPONSE_CACHE_TTL_MS: '0', RESPONSE_CACHE_MAX_ENTRIES: '0' });
    expect(config.RESPONSE_CACHE_TTL_MS).toBe(0);
    expect(config.RESPONSE_CACHE_MAX_ENTRIES).toBe(0);
  });
});
