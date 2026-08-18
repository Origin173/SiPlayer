import { z } from 'zod';

export const RequestIdSchema = z.string().min(1);

export const ArtistSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type ArtistSummary = z.infer<typeof ArtistSummarySchema>;

export const AlbumSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  artworkUrl: z.string().url().nullable().optional(),
  artists: z.array(ArtistSummarySchema),
  publishDate: z.string().nullable().optional(),
});
export type AlbumSummary = z.infer<typeof AlbumSummarySchema>;

export const AvailabilityReasonSchema = z.enum([
  'AVAILABLE',
  'AUTH_REQUIRED',
  'PRIVILEGE_REQUIRED',
  'REGION_RESTRICTED',
  'REMOVED',
  'UNKNOWN',
]);
export type AvailabilityReason = z.infer<typeof AvailabilityReasonSchema>;

export const TrackSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  artists: z.array(ArtistSummarySchema),
  artistText: z.string(),
  album: AlbumSummarySchema.nullable().optional(),
  artworkUrl: z.string().url().nullable().optional(),
  durationMs: z.number().int().nonnegative().nullable().optional(),
  playable: z.boolean(),
  availability: z
    .object({
      reason: AvailabilityReasonSchema,
      message: z.string().optional(),
    })
    .optional(),
  liked: z.boolean().optional(),
});
export type Track = z.infer<typeof TrackSchema>;

export const PlaylistSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  artworkUrl: z.string().url().nullable().optional(),
  creator: z
    .object({
      id: z.string().min(1),
      name: z.string(),
      avatarUrl: z.string().url().nullable().optional(),
    })
    .nullable()
    .optional(),
  trackCount: z.number().int().nonnegative().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type PlaylistSummary = z.infer<typeof PlaylistSummarySchema>;

export const PlaylistCollectionsSchema = z.object({
  created: z.array(PlaylistSummarySchema),
  subscribed: z.array(PlaylistSummarySchema),
});
export type PlaylistCollections = z.infer<typeof PlaylistCollectionsSchema>;

export const LikeResultSchema = z.object({ liked: z.boolean() });
export type LikeResult = z.infer<typeof LikeResultSchema>;

export const OkDataSchema = z.object({ ok: z.literal(true) });
export type OkData = z.infer<typeof OkDataSchema>;

export const PlaylistDetailSchema = PlaylistSummarySchema.extend({
  tracks: z.array(TrackSchema),
  subscribed: z.boolean().optional(),
  createdByCurrentUser: z.boolean().optional(),
});
export type PlaylistDetail = z.infer<typeof PlaylistDetailSchema>;

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  nickname: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  signature: z.string().nullable().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const LyricWordSchema = z.object({
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  text: z.string(),
});

export const LyricLineSchema = z.object({
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative().nullable().optional(),
  text: z.string(),
  translation: z.string().nullable().optional(),
  words: z.array(LyricWordSchema).optional(),
});
export type LyricLine = z.infer<typeof LyricLineSchema>;

export const LyricsSchema = z.object({
  type: z.enum(['LINE', 'WORD', 'NONE']),
  lines: z.array(LyricLineSchema),
  raw: z
    .object({
      lrc: z.string().nullable().optional(),
      translatedLrc: z.string().nullable().optional(),
    })
    .optional(),
});
export type Lyrics = z.infer<typeof LyricsSchema>;

export const AudioQualitySchema = z.enum([
  'auto',
  'standard',
  'high',
  'lossless',
  'hi_res',
]);
export type AudioQuality = z.infer<typeof AudioQualitySchema>;

export const StreamInfoSchema = z.object({
  trackId: z.string().min(1),
  url: z.string().url(),
  requestedQuality: AudioQualitySchema,
  actualQuality: AudioQualitySchema,
  mimeType: z.string().nullable().optional(),
  bitrate: z.number().int().positive().nullable().optional(),
  sizeBytes: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});
export type StreamInfo = z.infer<typeof StreamInfoSchema>;

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTH_REQUIRED',
  'AUTH_EXPIRED',
  'QR_EXPIRED',
  'NOT_FOUND',
  'TRACK_UNAVAILABLE',
  'QUALITY_UNAVAILABLE',
  'UPSTREAM_TIMEOUT',
  'UPSTREAM_UNAVAILABLE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthDataSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
});
export type HealthData = z.infer<typeof HealthDataSchema>;

export const ReadyDataSchema = z.object({
  status: z.literal('ready'),
  upstream: z.enum(['available', 'configured', 'unavailable']),
});
export type ReadyData = z.infer<typeof ReadyDataSchema>;

export const SearchTypeSchema = z.enum(['track', 'album', 'artist', 'playlist']);
export type SearchType = z.infer<typeof SearchTypeSchema>;

export const TrackPageSchema = z.object({
  items: z.array(TrackSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean(),
});
export type TrackPage = z.infer<typeof TrackPageSchema>;

export const QrStartDataSchema = z.object({
  challengeId: z.string().min(1),
  qrImageDataUrl: z.string().startsWith('data:image/'),
  expiresAt: z.string().datetime(),
});
export type QrStartData = z.infer<typeof QrStartDataSchema>;

export const QrStatusSchema = z.enum([
  'WAITING_SCAN',
  'WAITING_CONFIRM',
  'AUTHORIZED',
  'EXPIRED',
]);

export const QrStatusDataSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('WAITING_SCAN') }),
  z.object({ status: z.literal('WAITING_CONFIRM') }),
  z.object({
    status: z.literal('AUTHORIZED'),
    sessionToken: z.string().min(1),
    user: UserProfileSchema,
  }),
  z.object({ status: z.literal('EXPIRED') }),
]);
export type QrStatusData = z.infer<typeof QrStatusDataSchema>;

export const SuccessEnvelopeSchema = z.object({
  data: z.unknown(),
  requestId: RequestIdSchema,
});
export type SuccessEnvelope<T> = { data: T; requestId: string };

export const ErrorEnvelopeSchema = z.object({
  error: ApiErrorSchema,
  requestId: RequestIdSchema,
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export const HealthResponseSchema = z.object({
  data: HealthDataSchema,
  requestId: RequestIdSchema,
});
export const ReadyResponseSchema = z.object({
  data: ReadyDataSchema,
  requestId: RequestIdSchema,
});
