import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import {
  type ErrorEnvelope,
  HealthResponseSchema,
  ReadyResponseSchema,
} from '@siplayer/contracts';
import { randomUUID } from 'node:crypto';
import { loadConfig, type GatewayConfig } from './config/env';
import { NeteaseProvider, type ContentProvider } from './providers';
import { registerContentRoutes } from './routes/content';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  provider?: ContentProvider;
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

  registerContentRoutes(app, {
    provider: options.provider ?? new NeteaseProvider({ baseUrl: config.NETEASE_API_BASE_URL }),
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
