import {
  AudioQualitySchema,
  CatalogSearchPageSchema,
  LyricsSchema,
  PlaylistDetailSchema,
  StreamInfoSchema,
  TrackPageSchema,
  TrackSchema,
  type ApiError,
  type ErrorEnvelope,
} from '@siplayer/contracts';
import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { NeteaseProviderError, type ContentProvider } from '../providers';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  type: z.enum(['track', 'album', 'artist', 'playlist']).default('track'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(30),
}).strict();

const idParamsSchema = z.object({ id: z.string().trim().min(1) });
const streamQuerySchema = z.object({ quality: AudioQualitySchema.default('auto') }).strict();

interface ContentRouteOptions {
  provider: ContentProvider;
}

function errorStatus(code: ApiError['code']): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'UPSTREAM_TIMEOUT':
      return 504;
    case 'UPSTREAM_UNAVAILABLE':
      return 502;
    case 'TRACK_UNAVAILABLE':
    case 'QUALITY_UNAVAILABLE':
      return 422;
    case 'VALIDATION_ERROR':
      return 400;
    default:
      return 500;
  }
}

function requestId(request: FastifyRequest): string {
  return String(request.id);
}

function sendError(reply: FastifyReply, request: FastifyRequest, error: ApiError): FastifyReply {
  const envelope: ErrorEnvelope = { error, requestId: requestId(request) };
  return reply.status(errorStatus(error.code)).send(envelope);
}

function normalizeProviderError(error: unknown): ApiError {
  if (error instanceof NeteaseProviderError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    code: 'UPSTREAM_UNAVAILABLE',
    message: 'Music service is temporarily unavailable.',
    retryable: true,
  };
}

export function registerContentRoutes(app: FastifyInstance, options: ContentRouteOptions): void {
  app.get('/v1/search', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, request, {
        code: 'VALIDATION_ERROR',
        message: 'Search query is invalid.',
        retryable: false,
      });
    }
    try {
      const data = parsed.data.type === 'track'
        ? TrackPageSchema.parse(await options.provider.searchTracks(parsed.data.q, parsed.data.page, parsed.data.pageSize))
        : CatalogSearchPageSchema.parse(await options.provider.searchCatalog(parsed.data.q, parsed.data.type, parsed.data.page, parsed.data.pageSize));
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/tracks/:id', async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, request, {
        code: 'VALIDATION_ERROR',
        message: 'Track id is invalid.',
        retryable: false,
      });
    }

    try {
      const data = TrackSchema.parse(await options.provider.getTrack(parsed.data.id));
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/tracks/:id/stream', async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const query = streamQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return sendError(reply, request, {
        code: 'VALIDATION_ERROR',
        message: 'Stream request is invalid.',
        retryable: false,
      });
    }

    try {
      const data = StreamInfoSchema.parse(await options.provider.resolveStream(params.data.id, query.data.quality));
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/tracks/:id/lyrics', async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, request, {
        code: 'VALIDATION_ERROR',
        message: 'Track id is invalid.',
        retryable: false,
      });
    }

    try {
      const data = LyricsSchema.parse(await options.provider.getLyrics(parsed.data.id));
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/playlists/:id', async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, request, {
        code: 'VALIDATION_ERROR',
        message: 'Playlist id is invalid.',
        retryable: false,
      });
    }

    try {
      const data = PlaylistDetailSchema.parse(await options.provider.getPlaylist(parsed.data.id));
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });
}
