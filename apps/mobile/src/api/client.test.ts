import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './clientCore';
import { setSessionExpiredListener } from '../auth/sessionEvents';

function successResponse(data: unknown = { ok: true }): Response {
  return new Response(JSON.stringify({ data, requestId: 'req_test' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(status = 503): Response {
  return new Response(JSON.stringify({
    error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Music service is temporarily unavailable.', retryable: true },
    requestId: 'req_test',
  }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ApiClient', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('retries a retryable GET once after a gateway 5xx response', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(errorResponse())
      .mockResolvedValueOnce(successResponse());
    const client = new ApiClient({ baseUrl: 'http://gateway.test', fetchImpl });

    await expect(client.request('/v1/search')).resolves.toMatchObject({ data: { ok: true } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry mutations', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(errorResponse());
    const client = new ApiClient({ baseUrl: 'http://gateway.test', fetchImpl });

    await expect(client.request('/v1/auth/logout', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('turns the client timeout into a retryable timeout error', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const client = new ApiClient({ baseUrl: 'http://gateway.test', fetchImpl, timeoutMs: 50 });
    const request = client.request('/v1/health');
    const assertion = expect(request).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT', retryable: true });

    await vi.advanceTimersByTimeAsync(110);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propagates caller cancellation without retrying', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const client = new ApiClient({ baseUrl: 'http://gateway.test', fetchImpl });
    const request = client.request('/v1/search', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('notifies the auth boundary when a session-bearing request expires', async () => {
    const onExpired = vi.fn();
    const removeListener = setSessionExpiredListener(onExpired);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'AUTH_EXPIRED', message: 'Your login session has expired.', retryable: false },
      requestId: 'req_test',
    }), { status: 401, headers: { 'content-type': 'application/json' } }));
    const client = new ApiClient({ baseUrl: 'http://gateway.test', fetchImpl, getToken: async () => 'project-token' });

    await expect(client.request('/v1/me/playlists')).rejects.toMatchObject({ code: 'AUTH_EXPIRED' });
    expect(onExpired).toHaveBeenCalledTimes(1);
    removeListener();
  });
});
