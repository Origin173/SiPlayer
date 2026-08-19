import { describe, expect, it } from 'vitest';
import { GatewayMetrics } from './metrics';

describe('GatewayMetrics', () => {
  it('aggregates request and upstream durations without retaining request data', () => {
    const metrics = new GatewayMetrics();
    metrics.recordRequest({ method: 'GET', route: '/v1/search', statusCode: 200, durationMs: 12 });
    metrics.recordRequest({ method: 'GET', route: '/v1/search', statusCode: 502, durationMs: 20 });
    metrics.recordUpstream({ path: '/search', statusCode: 200, durationMs: 9, outcome: 'success' });
    metrics.recordUpstream({ path: '/search', statusCode: 503, durationMs: 31, outcome: 'error' });
    metrics.recordError('UPSTREAM_UNAVAILABLE');

    expect(metrics.snapshot()).toEqual({
      requests: {
        'GET /v1/search': { count: 2, errorCount: 1, totalDurationMs: 32, maxDurationMs: 20 },
      },
      upstream: {
        '/search': { count: 2, errorCount: 1, totalDurationMs: 40, maxDurationMs: 31 },
      },
      errors: { UPSTREAM_UNAVAILABLE: 1 },
      rateLimited: 0,
    });
  });

  it('counts rate-limit events separately from error codes', () => {
    const metrics = new GatewayMetrics();
    metrics.recordRateLimit();
    metrics.recordRateLimit();
    metrics.recordError('RATE_LIMITED');

    expect(metrics.snapshot().rateLimited).toBe(2);
    expect(metrics.snapshot().errors.RATE_LIMITED).toBe(1);
  });
});
