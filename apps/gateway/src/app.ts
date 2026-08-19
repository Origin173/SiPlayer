import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest, type FastifyServerOptions } from 'fastify';
import {
  type ErrorEnvelope,
  HealthResponseSchema,
  ReadyResponseSchema,
} from '@siplayer/contracts';
import { randomUUID } from 'node:crypto';
import { loadConfig, type GatewayConfig } from './config/env';
import { QrChallengeStore, SessionStore } from './auth/stores';
import { NeteaseProvider, type AuthProvider, type ContentProvider } from './providers';
import { registerAuthRoutes } from './routes/auth';
import { registerContentRoutes } from './routes/content';
import { GatewayMetrics } from './observability/metrics';
import { ResponseCache, type CachedResponse } from './cache/responseCache';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  provider?: ContentProvider;
  authProvider?: AuthProvider;
  readinessProbe?: () => Promise<boolean>;
  metrics?: GatewayMetrics;
  responseCache?: ResponseCache;
}

function requestId(value: string | number): string {
  return String(value);
}

const cacheablePathPatterns = [
  /^\/v1\/search$/,
  /^\/v1\/tracks\/[^/]+$/,
  /^\/v1\/tracks\/[^/]+\/lyrics$/,
  /^\/v1\/albums\/[^/]+$/,
  /^\/v1\/artists\/[^/]+$/,
  /^\/v1\/artists\/[^/]+\/top-tracks$/,
  /^\/v1\/artists\/[^/]+\/albums$/,
  /^\/v1\/playlists\/[^/]+$/,
];

function responseCacheKey(request: FastifyRequest): string | undefined {
  if (request.method !== 'GET') return undefined;
  const path = request.url.split('?')[0] ?? request.url;
  if (!cacheablePathPatterns.some((pattern) => pattern.test(path))) return undefined;
  return `${request.method}:${request.url}`;
}

async function probeUpstream(baseUrl: string, timeoutMs = 2_000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildApp(
  config: GatewayConfig = loadConfig(),
  options: BuildAppOptions = {},
): FastifyInstance {
  const app = Fastify({
    trustProxy: config.TRUST_PROXY,
    logger:
      options.logger ?? {
        level: 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.token',
            '*.password',
            '*.cookie',
          ],
          censor: '[REDACTED]',
        },
      },
    genReqId: () => `req_${randomUUID()}`,
  });
  const metrics = options.metrics ?? new GatewayMetrics();
  const responseCache = options.responseCache ?? new ResponseCache(config.RESPONSE_CACHE_TTL_MS, config.RESPONSE_CACHE_MAX_ENTRIES);
  const requestStartTimes = new WeakMap<FastifyRequest, number>();
  const cacheHits = new WeakSet<FastifyRequest>();

  app.addHook('onRequest', async (request) => {
    requestStartTimes.set(request, Date.now());
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    if (reply.statusCode < 400 || typeof payload !== 'string') return payload;
    try {
      const body = JSON.parse(payload) as { error?: { code?: unknown } };
      if (typeof body.error?.code === 'string') metrics.recordError(body.error.code);
    } catch {
      // Non-JSON error payloads are still covered by request status metrics.
    }
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    const durationMs = Math.max(0, Date.now() - (requestStartTimes.get(request) ?? Date.now()));
    const route = request.routeOptions.url ?? request.url.split('?')[0] ?? request.url;
    metrics.recordRequest({ method: request.method, route, statusCode: reply.statusCode, durationMs });
    request.log.info({
      requestId: requestId(request.id),
      method: request.method,
      route,
      statusCode: reply.statusCode,
      durationMs,
    }, 'request completed');
  });

  const allowedOrigins = config.ALLOWED_ORIGINS === '*'
    ? null
    : new Set(config.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean));
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (!allowedOrigins) {
      reply.header('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.has(origin)) {
      reply.header('Access-Control-Allow-Origin', origin).header('Vary', 'Origin');
    }
    reply
      .header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      .header('Access-Control-Max-Age', '600');
    if (request.method === 'OPTIONS') return reply.status(204).send();
  });

  const rateBuckets = new Map<string, { startedAt: number; count: number }>();
  const rateBucketCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= config.RATE_LIMIT_WINDOW_MS) rateBuckets.delete(key);
    }
  }, config.RATE_LIMIT_WINDOW_MS);
  rateBucketCleanup.unref?.();
  app.addHook('onClose', async () => clearInterval(rateBucketCleanup));

  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (path === '/health' || path === '/v1/health' || path === '/ready' || path === '/v1/ready') return;
    const now = Date.now();
    const key = request.ip;
    const current = rateBuckets.get(key);
    const bucket = !current || now - current.startedAt >= config.RATE_LIMIT_WINDOW_MS
      ? { startedAt: now, count: 0 }
      : current;
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > config.RATE_LIMIT_MAX_REQUESTS) {
      metrics.recordRateLimit();
      const response: ErrorEnvelope = {
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.', retryable: true },
        requestId: requestId(request.id),
      };
      return reply.status(429).send(response);
    }
  });

  app.addHook('onRequest', async (request, reply) => {
    const key = responseCacheKey(request);
    if (!key) return;
    const cached = responseCache.get(key);
    if (!cached) return;
    cacheHits.add(request);
    if (cached.contentType) reply.header('content-type', cached.contentType);
    return reply.status(cached.statusCode).send(cached.payload);
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (cacheHits.has(request) || reply.statusCode !== 200 || typeof payload !== 'string') return payload;
    const key = responseCacheKey(request);
    if (!key) return payload;
    const contentType = reply.getHeader('content-type');
    const cached: CachedResponse = {
      payload,
      statusCode: reply.statusCode,
      ...(typeof contentType === 'string' ? { contentType } : {}),
    };
    responseCache.set(key, cached);
    return payload;
  });

  const healthHandler = async (request: { id: string | number }) => {
    const response = {
      data: {
        status: 'ok' as const,
        version: config.API_VERSION,
      },
      requestId: requestId(request.id),
    };

    return HealthResponseSchema.parse(response);
  };

  const readinessProbe = options.readinessProbe ?? (() => probeUpstream(config.NETEASE_API_BASE_URL));
  const readyHandler = async (request: { id: string | number }, reply: FastifyReply) => {
    const upstreamAvailable = await readinessProbe().catch(() => false);
    const response = {
      data: {
        status: 'ready' as const,
        upstream: upstreamAvailable ? ('available' as const) : ('unavailable' as const),
      },
      requestId: requestId(request.id),
    };

    const parsed = ReadyResponseSchema.parse(response);
    return upstreamAvailable ? parsed : reply.status(503).send(parsed);
  };

  app.get('/v1/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/v1/ready', readyHandler);
  app.get('/ready', readyHandler);

  const provider = options.provider ?? new NeteaseProvider({
    baseUrl: config.NETEASE_API_BASE_URL,
    onRequestComplete: (metric) => {
      metrics.recordUpstream(metric);
      app.log.info({ ...metric, upstreamDurationMs: metric.durationMs }, 'upstream request completed');
    },
  });
  const sessions = new SessionStore(
    config.SESSION_ENCRYPTION_KEY,
    config.SESSION_TTL_MS,
    config.SESSION_STORE_PATH,
    (error) => app.log.warn({ err: error }, 'session persistence failed'),
  );
  registerContentRoutes(app, { provider });
  registerAuthRoutes(app, {
    provider: options.authProvider ?? (provider as unknown as AuthProvider),
    sessions,
    challenges: new QrChallengeStore(),
  });

  app.setNotFoundHandler(async (request, reply) => {
    const response: ErrorEnvelope = {
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
        retryable: false,
      },
      requestId: requestId(request.id),
    };

    return reply.status(404).send(response);
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error, requestId: requestId(request.id) }, 'request failed');

    const response: ErrorEnvelope = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The gateway could not complete the request.',
        retryable: true,
      },
      requestId: requestId(request.id),
    };

    return reply.status(500).send(response);
  });

  return app;
}
