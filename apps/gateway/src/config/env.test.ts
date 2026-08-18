import { describe, expect, it } from 'vitest';
import { loadConfig } from './env';

describe('gateway config', () => {
  it('uses safe local defaults', () => {
    const config = loadConfig({});

    expect(config.PORT).toBe(8787);
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.NETEASE_API_BASE_URL).toBe('http://127.0.0.1:3000');
  });

  it('rejects an invalid upstream URL', () => {
    expect(() => loadConfig({ NETEASE_API_BASE_URL: 'not-a-url' })).toThrow();
  });
});
