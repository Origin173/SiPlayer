import {
  LikeResultSchema,
  OkDataSchema,
  PlaylistCollectionsSchema,
  QrStartDataSchema,
  QrStatusDataSchema,
  TrackPageSchema,
  TrackSchema,
  UserProfileSchema,
} from '@siplayer/contracts';
import type {
  ApiError,
  ErrorEnvelope,
  LikeResult,
  OkData,
  PlaylistCollections,
  QrStartData,
  QrStatusData,
  Track,
  UserProfile,
} from '@siplayer/contracts';
import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { NeteaseProviderError, type AuthProvider } from '../providers/index.js';
import type { QrChallengeStore, SessionPrincipal, SessionStore } from '../auth/stores.js';

const challengeParamsSchema = z.object({ challengeId: z.string().trim().min(1) });
const trackParamsSchema = z.object({ id: z.string().trim().min(1) });

interface AuthRouteOptions {
  provider: AuthProvider;
  sessions: SessionStore;
  challenges: QrChallengeStore;
}

function requestId(request: FastifyRequest): string {
  return String(request.id);
}

function errorStatus(code: ApiError['code']): number {
  switch (code) {
    case 'AUTH_REQUIRED':
    case 'AUTH_EXPIRED':
      return 401;
    case 'QR_EXPIRED':
      return 410;
    case 'NOT_FOUND':
      return 404;
    case 'UPSTREAM_TIMEOUT':
      return 504;
    case 'UPSTREAM_UNAVAILABLE':
      return 502;
    case 'RATE_LIMITED':
      return 429;
    case 'VALIDATION_ERROR':
      return 400;
    default:
      return 500;
  }
}

function sendError(reply: FastifyReply, request: FastifyRequest, error: ApiError): FastifyReply {
  const envelope: ErrorEnvelope = { error, requestId: requestId(request) };
  return reply.status(errorStatus(error.code)).send(envelope);
}

function normalizeProviderError(error: unknown): ApiError {
  if (error instanceof NeteaseProviderError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  return { code: 'UPSTREAM_UNAVAILABLE', message: 'Music service is temporarily unavailable.', retryable: true };
}

function getSession(request: FastifyRequest, sessions: SessionStore): { token: string; session: SessionPrincipal } | ApiError {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return { code: 'AUTH_REQUIRED', message: 'Login is required for this request.', retryable: false };
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) return { code: 'AUTH_REQUIRED', message: 'Login is required for this request.', retryable: false };
  const session = sessions.get(token);
  if (!session) return { code: 'AUTH_EXPIRED', message: 'Your login session has expired.', retryable: false };
  return { token, session };
}

function isApiError(value: { token: string; session: SessionPrincipal } | ApiError): value is ApiError {
  return 'code' in value;
}

export function registerAuthRoutes(app: FastifyInstance, options: AuthRouteOptions): void {
  app.post('/v1/auth/qr/start', async (request, reply) => {
    try {
      const qr = await options.provider.startQr();
      const challenge = options.challenges.create(qr.upstreamKey, qr.expiresAt);
      const data: QrStartData = QrStartDataSchema.parse({
        challengeId: challenge.id,
        qrImageDataUrl: qr.qrImageDataUrl,
        expiresAt: qr.expiresAt,
      });
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/auth/qr/:challengeId', async (request, reply) => {
    const parsed = challengeParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, request, { code: 'VALIDATION_ERROR', message: 'QR challenge id is invalid.', retryable: false });
    }
    const challenge = options.challenges.get(parsed.data.challengeId);
    if (!challenge) {
      const data: QrStatusData = QrStatusDataSchema.parse({ status: 'EXPIRED' });
      return { data, requestId: requestId(request) };
    }

    try {
      const status = await options.provider.checkQr(challenge.upstreamKey);
      if (status.status === 'AUTHORIZED') {
        if (!status.cookie) return sendError(reply, request, { code: 'UPSTREAM_UNAVAILABLE', message: 'Login completed without a session.', retryable: true });
        const user = UserProfileSchema.parse(await options.provider.getCurrentUser(status.cookie));
        const session = options.sessions.create(user, status.cookie);
        options.challenges.delete(challenge.id);
        const data: QrStatusData = QrStatusDataSchema.parse({ status: 'AUTHORIZED', sessionToken: session.token, user });
        return { data, requestId: requestId(request) };
      }
      if (status.status === 'EXPIRED') options.challenges.delete(challenge.id);
      const data: QrStatusData = QrStatusDataSchema.parse({ status: status.status });
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/auth/me', async (request, reply) => {
    const auth = getSession(request, options.sessions);
    if (isApiError(auth)) return sendError(reply, request, auth);
    try {
      const data: UserProfile = UserProfileSchema.parse(auth.session.user);
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.post('/v1/auth/logout', async (request, reply) => {
    const auth = getSession(request, options.sessions);
    if (isApiError(auth)) return sendError(reply, request, auth);
    options.sessions.revoke(auth.token);
    const data: OkData = OkDataSchema.parse({ ok: true });
    return { data, requestId: requestId(request) };
  });

  app.get('/v1/me/playlists', async (request, reply) => {
    const auth = getSession(request, options.sessions);
    if (isApiError(auth)) return sendError(reply, request, auth);
    try {
      const data: PlaylistCollections = PlaylistCollectionsSchema.parse(await options.provider.getUserPlaylists(auth.session.user.id, auth.session.cookie));
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/me/liked-tracks', async (request, reply) => {
    const auth = getSession(request, options.sessions);
    if (isApiError(auth)) return sendError(reply, request, auth);
    try {
      const items: Track[] = TrackSchema.array().parse(await options.provider.getLikedTracks(auth.session.user.id, auth.session.cookie));
      const data = TrackPageSchema.parse({ items, page: 1, pageSize: items.length || 1, hasMore: false });
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  app.get('/v1/me/recent-tracks', async (request, reply) => {
    const auth = getSession(request, options.sessions);
    if (isApiError(auth)) return sendError(reply, request, auth);
    try {
      const items: Track[] = TrackSchema.array().parse(await options.provider.getRecentTracks(auth.session.user.id, auth.session.cookie));
      const data = TrackPageSchema.parse({ items, page: 1, pageSize: items.length || 1, hasMore: false });
      return { data, requestId: requestId(request) };
    } catch (error) {
      return sendError(reply, request, normalizeProviderError(error));
    }
  });

  for (const [method, liked] of [['PUT', true], ['DELETE', false] ] as const) {
    app.route({
      method,
      url: '/v1/tracks/:id/like',
      handler: async (request, reply) => {
        const auth = getSession(request, options.sessions);
        if (isApiError(auth)) return sendError(reply, request, auth);
        const parsed = trackParamsSchema.safeParse(request.params);
        if (!parsed.success) return sendError(reply, request, { code: 'VALIDATION_ERROR', message: 'Track id is invalid.', retryable: false });
        try {
          const result = await options.provider.setTrackLiked(parsed.data.id, liked, auth.session.cookie);
          const data: LikeResult = LikeResultSchema.parse({ liked: result });
          return { data, requestId: requestId(request) };
        } catch (error) {
          return sendError(reply, request, normalizeProviderError(error));
        }
      },
    });
  }
}
