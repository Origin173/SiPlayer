import { describe, expect, it } from 'vitest';
import { NeteaseApiClient } from './client';

function clientWithPayload(payload: unknown): NeteaseApiClient {
  return new NeteaseApiClient({
    baseUrl: 'http://upstream.test',
    fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }),
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
});
