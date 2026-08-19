import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
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

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  provider?: ContentProvider;
  authProvider?: AuthProvider;
}

function requestId(value: string | number): string {
  return String(value);
}

export function buildApp(
  config: GatewayConfig = loadConfig(),
  options: BuildAppOptions = {},
): FastifyInstance {
  const app = Fastify({
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
      .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .header('Access-Control-Max-Age', '600');
    if (request.method === 'OPTIONS') return reply.status(204).send();
  });

  const rateBuckets = new Map<string, { startedAt: number; count: number }>();
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
      const response: ErrorEnvelope = {
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.', retryable: true },
        requestId: requestId(request.id),
      };
      return reply.status(429).send(response);
    }
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

  const readyHandler = async (request: { id: string | number }) => {
    const response = {
      data: {
        status: 'ready' as const,
        upstream: config.NETEASE_API_BASE_URL ? ('configured' as const) : ('unavailable' as const),
      },
      requestId: requestId(request.id),
    };

    return ReadyResponseSchema.parse(response);
  };

  app.get('/v1/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/v1/ready', readyHandler);
  app.get('/ready', readyHandler);

  const provider = options.provider ?? new NeteaseProvider({ baseUrl: config.NETEASE_API_BASE_URL });
  registerContentRoutes(app, { provider });
  registerAuthRoutes(app, {
    provider: options.authProvider ?? (provider as unknown as AuthProvider),
    sessions: new SessionStore(config.SESSION_ENCRYPTION_KEY, config.SESSION_TTL_MS, config.SESSION_STORE_PATH),
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
