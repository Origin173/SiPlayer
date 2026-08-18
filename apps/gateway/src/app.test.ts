import { afterAll, describe, expect, it } from 'vitest';
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
  });

  it('returns readiness without exposing upstream internals', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/ready' });
    const body = response.json<{ data: { status: string; upstream: string } }>();

    expect(response.statusCode).toBe(200);
    expect(body.data.status).toBe('ready');
    expect(body.data.upstream).toBe('configured');
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
