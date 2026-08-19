import { z } from 'zod';

const NumericIdSchema = z.union([z.string(), z.number()]).transform(String);

export const RawArtistSchema = z.object({
  id: NumericIdSchema,
  name: z.string().nullable().optional(),
  picUrl: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
}).passthrough();
export type RawArtist = z.infer<typeof RawArtistSchema>;

export const RawAlbumSchema = z.object({
  id: NumericIdSchema,
  name: z.string().nullable().optional(),
  picUrl: z.string().nullable().optional(),
  pic_str: z.string().nullable().optional(),
  publishTime: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  artists: z.array(RawArtistSchema).optional(),
  artist: RawArtistSchema.nullable().optional(),
}).passthrough();
export type RawAlbum = z.infer<typeof RawAlbumSchema>;

export const RawSearchPlaylistSchema = z.object({
  id: NumericIdSchema,
  name: z.string().default(''),
  coverImgUrl: z.string().nullable().optional(),
  picUrl: z.string().nullable().optional(),
  creator: z.object({
    userId: NumericIdSchema,
    nickname: z.string().default(''),
    avatarUrl: z.string().nullable().optional(),
  }).nullable().optional(),
  trackCount: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
}).passthrough();
export type RawSearchPlaylist = z.infer<typeof RawSearchPlaylistSchema>;

export const RawPrivilegeSchema = z.object({
  id: NumericIdSchema.optional(),
  pl: z.number().nullable().optional(),
  dl: z.number().nullable().optional(),
  st: z.number().nullable().optional(),
  subp: z.number().nullable().optional(),
  cp: z.number().nullable().optional(),
}).passthrough();
export type RawPrivilege = z.infer<typeof RawPrivilegeSchema>;

export const RawSongSchema = z.object({
  id: NumericIdSchema,
  name: z.string().default(''),
  ar: z.array(RawArtistSchema).default([]),
  artists: z.array(RawArtistSchema).optional(),
  al: RawAlbumSchema.nullable().optional(),
  album: RawAlbumSchema.nullable().optional(),
  dt: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  fee: z.number().nullable().optional(),
  privilege: RawPrivilegeSchema.optional(),
}).passthrough();
export type RawSong = z.infer<typeof RawSongSchema>;

export const RawSearchResponseSchema = z.object({
  code: z.number().optional(),
  result: z.object({
    songCount: z.number().nullable().optional(),
    songs: z.array(RawSongSchema).default([]),
    albums: z.array(RawAlbumSchema).default([]),
    artists: z.array(RawArtistSchema).default([]),
    playlists: z.array(RawSearchPlaylistSchema).default([]),
    albumCount: z.number().nullable().optional(),
    artistCount: z.number().nullable().optional(),
    playlistCount: z.number().nullable().optional(),
    more: z.boolean().optional(),
  }).optional(),
}).passthrough();
export type RawSearchResponse = z.infer<typeof RawSearchResponseSchema>;

export const RawTrackDetailResponseSchema = z.object({
  code: z.number().optional(),
  songs: z.array(RawSongSchema).default([]),
  privileges: z.array(RawPrivilegeSchema).default([]),
}).passthrough();
export type RawTrackDetailResponse = z.infer<typeof RawTrackDetailResponseSchema>;

export const RawAlbumDetailResponseSchema = z.object({
  code: z.number().optional(),
  album: RawAlbumSchema,
  songs: z.array(RawSongSchema).default([]),
}).passthrough();
export type RawAlbumDetailResponse = z.infer<typeof RawAlbumDetailResponseSchema>;

export const RawArtistDetailResponseSchema = z.object({
  code: z.number().optional(),
  artist: RawArtistSchema.optional(),
  data: z.unknown().optional(),
  briefDesc: z.string().nullable().optional(),
  desc: z.string().nullable().optional(),
}).passthrough();
export type RawArtistDetailResponse = z.infer<typeof RawArtistDetailResponseSchema>;

export const RawArtistAlbumResponseSchema = z.object({
  code: z.number().optional(),
  artist: RawArtistSchema.optional(),
  hotAlbums: z.array(RawAlbumSchema).default([]),
  albums: z.array(RawAlbumSchema).default([]),
  albumCount: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  more: z.boolean().optional(),
}).passthrough();
export type RawArtistAlbumResponse = z.infer<typeof RawArtistAlbumResponseSchema>;

export const RawLyricPartSchema = z.object({
  lyric: z.string().nullable().optional(),
}).passthrough();

export const RawLyricsResponseSchema = z.object({
  code: z.number().optional(),
  lrc: RawLyricPartSchema.optional(),
  tlyric: RawLyricPartSchema.optional(),
  yrc: RawLyricPartSchema.optional(),
}).passthrough();
export type RawLyricsResponse = z.infer<typeof RawLyricsResponseSchema>;

export const RawPlaylistSchema = z.object({
  id: NumericIdSchema,
  name: z.string().default(''),
  coverImgUrl: z.string().nullable().optional(),
  picUrl: z.string().nullable().optional(),
  creator: z.object({
    userId: NumericIdSchema,
    nickname: z.string().default(''),
    avatarUrl: z.string().nullable().optional(),
  }).nullable().optional(),
  trackCount: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  subscribed: z.boolean().optional(),
  trackIds: z.array(z.object({ id: NumericIdSchema }).passthrough()).default([]),
  tracks: z.array(RawSongSchema).default([]),
}).passthrough();
export type RawPlaylist = z.infer<typeof RawPlaylistSchema>;

export const RawPlaylistDetailResponseSchema = z.object({
  code: z.number().optional(),
  playlist: RawPlaylistSchema,
}).passthrough();
export type RawPlaylistDetailResponse = z.infer<typeof RawPlaylistDetailResponseSchema>;

export const RawPlaylistTracksResponseSchema = z.object({
  code: z.number().optional(),
  songs: z.array(RawSongSchema).default([]),
}).passthrough();
export type RawPlaylistTracksResponse = z.infer<typeof RawPlaylistTracksResponseSchema>;

export const RawStreamItemSchema = z.object({
  id: NumericIdSchema,
  url: z.string().nullable().optional(),
  br: z.number().nullable().optional(),
  size: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  expi: z.number().nullable().optional(),
  code: z.number().nullable().optional(),
}).passthrough();
export type RawStreamItem = z.infer<typeof RawStreamItemSchema>;

export const RawStreamResponseSchema = z.object({
  code: z.number().optional(),
  data: z.array(RawStreamItemSchema).default([]),
}).passthrough();
export type RawStreamResponse = z.infer<typeof RawStreamResponseSchema>;
