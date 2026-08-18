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

  it('returns readiness without exposing upstream internals', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/ready' });
    const body = response.json<{ data: { status: string; upstream: string } }>();

    expect(response.statusCode).toBe(200);
    expect(body.data.status).toBe('ready');
    expect(body.data.upstream).toBe('configured');
  });

  it('normalizes unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    const body = response.json<{ error: { code: string }; requestId: string }>();

    expect(response.statusCode).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.requestId).toMatch(/^req_/);
  });
});
