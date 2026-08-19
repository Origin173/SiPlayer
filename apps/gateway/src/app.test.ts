import { afterAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config/env';

const app = buildApp(loadConfig({ NODE_ENV: 'test' }), { logger: false });

afterAll(async () => {
  await app.close();
});

describe('gateway foundation routes', () => {
  it('returns the stable health envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health' });
    const body = response.json<{ data: { status: string }; requestId: string }>();

    expect(response.statusCode).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(body.requestId).toMatch(/^req_/);
  });

  it('supports browser preflight for the web client', async () => {
    const response = await app.inject({ method: 'OPTIONS', url: '/v1/search' });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
    expect(response.headers['access-control-allow-methods']).toContain('DELETE');
  });

  it('restricts CORS to configured origins', async () => {
    const restricted = buildApp(loadConfig({ NODE_ENV: 'test', ALLOWED_ORIGINS: 'https://player.example.com' }), { logger: false });
    const allowed = await restricted.inject({ method: 'OPTIONS', url: '/v1/search', headers: { origin: 'https://player.example.com' } });
    const denied = await restricted.inject({ method: 'OPTIONS', url: '/v1/search', headers: { origin: 'https://evil.example.com' } });
    await restricted.close();

    expect(allowed.headers['access-control-allow-origin']).toBe('https://player.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns readiness without exposing upstream internals', async () => {
    const readyApp = buildApp(loadConfig({ NODE_ENV: 'test' }), { logger: false, readinessProbe: async () => true });
    const response = await readyApp.inject({ method: 'GET', url: '/v1/ready' });
    const body = response.json<{ data: { status: string; upstream: string } }>();
    await readyApp.close();

    expect(response.statusCode).toBe(200);
    expect(body.data.status).toBe('ready');
    expect(body.data.upstream).toBe('available');
  });

  it('reports an unavailable upstream with a non-ready status', async () => {
    const unavailableApp = buildApp(loadConfig({ NODE_ENV: 'test' }), { logger: false, readinessProbe: async () => false });
    const response = await unavailableApp.inject({ method: 'GET', url: '/v1/ready' });
    const body = response.json<{ data: { status: string; upstream: string } }>();
    await unavailableApp.close();

    expect(response.statusCode).toBe(503);
    expect(body.data.status).toBe('ready');
    expect(body.data.upstream).toBe('unavailable');
  });

  it('does not treat an upstream HTTP error as ready', async () => {
    const fetchBefore = globalThis.fetch;
    vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }));
    const unavailableApp = buildApp(loadConfig({ NODE_ENV: 'test' }), { logger: false });

    try {
      const response = await unavailableApp.inject({ method: 'GET', url: '/v1/ready' });
      expect(response.statusCode).toBe(503);
      expect(response.json<{ data: { upstream: string } }>().data.upstream).toBe('unavailable');
    } finally {
      await unavailableApp.close();
      vi.stubGlobal('fetch', fetchBefore);
    }
  });

  it('rate limits non-health requests while keeping health available', async () => {
    const limited = buildApp(loadConfig({ NODE_ENV: 'test', RATE_LIMIT_MAX_REQUESTS: '1' }), { logger: false });
    const health = await limited.inject({ method: 'GET', url: '/v1/health' });
    const first = await limited.inject({ method: 'GET', url: '/v1/does-not-exist' });
    const second = await limited.inject({ method: 'GET', url: '/v1/does-not-exist' });
    await limited.close();

    expect(health.statusCode).toBe(200);
    expect(first.statusCode).toBe(404);
    expect(second.statusCode).toBe(429);
    expect(second.json<{ error: { code: string } }>().error.code).toBe('RATE_LIMITED');
  });

  it('normalizes unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    const body = response.json<{ error: { code: string }; requestId: string }>();

    expect(response.statusCode).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.requestId).toMatch(/^req_/);
  });
});
