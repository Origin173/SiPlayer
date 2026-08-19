import { describe, expect, it } from 'vitest';
import { NeteaseApiClient } from './client.js';

function clientWithPayload(payload: unknown): NeteaseApiClient {
  return new NeteaseApiClient({
    baseUrl: 'http://upstream.test',
    fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }),
  });
}

function clientWithStatus(status: number): NeteaseApiClient {
  return new NeteaseApiClient({
    baseUrl: 'http://upstream.test',
    fetchImpl: async () => new Response('{}', { status }),
  });
}

describe('NeteaseApiClient', () => {
  it('maps an upstream non-success code to a normalized provider error', async () => {
    await expect(clientWithPayload({ code: -1 }).get('/search', {}, (payload) => payload)).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });

  it('allows documented QR state codes for polling', async () => {
    const result = await clientWithPayload({ code: 801 }).get('/login/qr/check', {}, (payload) => payload, undefined, [800, 801, 802, 803]);
    expect(result).toEqual({ code: 801 });
  });

  it('maps an authenticated upstream 301 response to session expiry', async () => {
    await expect(clientWithPayload({ code: 301, message: '需要登录' }).get('/user/playlist', {}, (payload) => payload, 'MUSIC_U=expired'))
      .rejects.toMatchObject({ code: 'AUTH_EXPIRED', retryable: false });
  });

  it('does not treat a public upstream 301 response as a session expiry', async () => {
    await expect(clientWithPayload({ code: 301, message: '需要登录' }).get('/search', {}, (payload) => payload))
      .rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryable: true });
  });

  it('maps an upstream 429 response to the contract rate-limit error', async () => {
    await expect(clientWithStatus(429).get('/search', {}, (payload) => payload))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', retryable: true, status: 429 });
  });

  it('reports upstream duration and outcome without including query values', async () => {
    const events: Array<{ path: string; statusCode?: number; outcome: string }> = [];
    const client = new NeteaseApiClient({
      baseUrl: 'http://upstream.test',
      fetchImpl: async () => new Response(JSON.stringify({ code: 200 }), { status: 200 }),
      onRequestComplete: (metric) => events.push(metric),
    });

    await client.get('/search', { keywords: 'private query' }, (payload) => payload);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ path: '/search', statusCode: 200, outcome: 'success' });
    expect(events[0]?.path).not.toContain('private query');
  });
});
