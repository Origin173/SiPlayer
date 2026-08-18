import { z } from 'zod';
import { RawPlaylistSchema, RawSongSchema } from './rawTypes';

const NumericIdSchema = z.union([z.string(), z.number()]).transform(String);

export const RawQrKeyResponseSchema = z.object({
  code: z.number().optional(),
  data: z.object({ unikey: z.string().min(1) }),
}).passthrough();
export type RawQrKeyResponse = z.infer<typeof RawQrKeyResponseSchema>;

export const RawQrCreateResponseSchema = z.object({
  code: z.number().optional(),
  data: z.object({
    qrimg: z.string().optional(),
    qrurl: z.string().optional(),
  }),
}).passthrough();
export type RawQrCreateResponse = z.infer<typeof RawQrCreateResponseSchema>;

export const RawQrCheckResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  cookie: z.string().optional(),
}).passthrough();
export type RawQrCheckResponse = z.infer<typeof RawQrCheckResponseSchema>;

export const RawLoginStatusResponseSchema = z.object({
  code: z.number().optional(),
  profile: z.object({
    userId: NumericIdSchema,
    nickname: z.string().default(''),
    avatarUrl: z.string().nullable().optional(),
    signature: z.string().nullable().optional(),
  }).nullable().optional(),
  account: z.object({ id: NumericIdSchema }).nullable().optional(),
}).passthrough();
export type RawLoginStatusResponse = z.infer<typeof RawLoginStatusResponseSchema>;

export const RawUserPlaylistResponseSchema = z.object({
  code: z.number().optional(),
  playlist: z.array(RawPlaylistSchema).default([]),
}).passthrough();
export type RawUserPlaylistResponse = z.infer<typeof RawUserPlaylistResponseSchema>;

export const RawRecentTracksResponseSchema = z.object({
  code: z.number().optional(),
  allData: z.array(z.object({ song: RawSongSchema }).passthrough()).default([]),
}).passthrough();
export type RawRecentTracksResponse = z.infer<typeof RawRecentTracksResponseSchema>;

export const RawLikeResponseSchema = z.object({ code: z.number().optional() }).passthrough();
export type RawLikeResponse = z.infer<typeof RawLikeResponseSchema>;
