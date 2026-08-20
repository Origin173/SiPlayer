import { describe, expect, it } from 'vitest';
import searchFixture from './fixtures/search.json' with { type: 'json' };
import lyricsFixture from './fixtures/lyrics.json' with { type: 'json' };
import streamFixture from './fixtures/stream.json' with { type: 'json' };
import { mapAlbumDetail, mapArtistAlbumPage, mapArtistDetail, mapCatalogSearchResponse, mapLyrics, mapSearchResponse, mapStream, mapTrack, parseLrc } from './mapper.js';
import { RawAlbumDetailResponseSchema, RawArtistAlbumResponseSchema, RawArtistDetailResponseSchema, RawLyricsResponseSchema, RawPrivilegeSchema, RawSearchResponseSchema, RawSongSchema, RawStreamResponseSchema } from './rawTypes.js';
import type { AudioQuality } from '@siplayer/contracts';

describe('netease mapper', () => {
  it('maps search raw fields into the stable Track contract', () => {
    const raw = RawSearchResponseSchema.parse(searchFixture);
    const page = mapSearchResponse(raw, 1, 30);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: '123456',
      name: 'Quiet Morning',
      artistText: 'Origin',
      playable: true,
    });
    expect(page.items[0]?.album?.artworkUrl).toBe('https://example.com/album.png');
  });

  it('maps catalog search results by requested type', () => {
    const raw = RawSearchResponseSchema.parse({
      code: 200,
      result: {
        albumCount: 1,
        albums: [{ id: 9, name: 'Quiet Album', picUrl: 'https://example.com/album.png', artists: [{ id: 7, name: 'Origin' }] }],
      },
    });
    const page = mapCatalogSearchResponse(raw, 'album', 1, 30);

    expect(page).toMatchObject({ type: 'album', hasMore: false });
    expect(page.items[0]).toMatchObject({ id: '9', name: 'Quiet Album' });
  });

  it('maps album details and preserves track order', () => {
    const raw = RawAlbumDetailResponseSchema.parse({
      code: 200,
      album: { id: 9, name: 'Quiet Album', picUrl: 'https://example.com/album.png', description: 'A calm record', artists: [{ id: 7, name: 'Origin' }] },
      songs: [
        { id: 2, name: 'Second', ar: [{ id: 7, name: 'Origin' }], al: { id: 9, name: 'Quiet Album' } },
        { id: 1, name: 'First', ar: [{ id: 7, name: 'Origin' }], al: { id: 9, name: 'Quiet Album' } },
      ],
      privileges: [{ id: 2, pl: 0, dl: 128, st: 0 }],
    });
    const detail = mapAlbumDetail(raw);

    expect(detail).toMatchObject({ id: '9', description: 'A calm record' });
    expect(detail.tracks.map((track) => track.id)).toEqual(['2', '1']);
    expect(detail.tracks[0]).toMatchObject({ playable: false, availability: { reason: 'PRIVILEGE_REQUIRED' } });
  });

  it('maps flexible artist detail and paged albums responses', () => {
    const artist = mapArtistDetail(RawArtistDetailResponseSchema.parse({ code: 200, data: { artist: { id: 7, name: 'Origin', briefDesc: 'Composer' } } }), '7');
    const albums = mapArtistAlbumPage(RawArtistAlbumResponseSchema.parse({ code: 200, total: 1, hotAlbums: [{ id: 9, name: 'Quiet Album', artists: [{ id: 7, name: 'Origin' }] }] }), 1, 30);

    expect(artist).toMatchObject({ id: '7', name: 'Origin' });
    expect(albums).toMatchObject({ page: 1, hasMore: false });
    expect(albums.items[0]?.id).toBe('9');
  });

  it('parses and merges translated lyrics once at the adapter boundary', () => {
    const raw = RawLyricsResponseSchema.parse(lyricsFixture);
    const lyrics = mapLyrics(raw);

    expect(lyrics.type).toBe('LINE');
    expect(lyrics.lines[0]).toMatchObject({ startMs: 1200, text: 'First line', translation: '第一行' });
    expect(lyrics.lines[0]?.endMs).toBe(4500);
  });

  it('supports multiple timestamps on one lyric line', () => {
    expect(parseLrc('[00:01.00][00:02.00]same')).toEqual([
      { startMs: 1000, text: 'same' },
      { startMs: 2000, text: 'same' },
    ]);
  });

  it('maps a temporary stream URL without exposing upstream fields', () => {
    const raw = RawStreamResponseSchema.parse(streamFixture);
    const stream = mapStream(raw, '123456', 'auto' satisfies AudioQuality);

    expect(stream).toMatchObject({
      trackId: '123456',
      url: 'https://audio.example.com/track-123456.mp3',
      requestedQuality: 'auto',
      actualQuality: 'high',
      bitrate: 320000,
    });
  });

  it('prefers upstream stream quality over bitrate heuristics', () => {
    const raw = RawStreamResponseSchema.parse({
      code: 200,
      data: [{ id: 123456, url: 'https://audio.example.com/track-123456.flac', br: 320000, type: 'flac', level: 'hires', encodeType: 'flac' }],
    });

    expect(mapStream(raw, '123456', 'auto')).toMatchObject({ actualQuality: 'hi_res', bitrate: 320000 });
  });

  it('uses lossless encoding as a conservative fallback when level is absent', () => {
    const raw = RawStreamResponseSchema.parse({
      code: 200,
      data: [{ id: 123456, url: 'https://audio.example.com/track-123456.flac', br: 320000, type: 'flac', encodeType: 'flac' }],
    });

    expect(mapStream(raw, '123456', 'auto')?.actualQuality).toBe('lossless');
  });

  it('does not confuse download permission with playback permission', () => {
    const song = RawSongSchema.parse({
      id: 123,
      name: 'Streamable',
      ar: [{ id: 7, name: 'Origin' }],
      al: { id: 9, name: 'Quiet Album' },
    });

    const track = mapTrack(song, RawPrivilegeSchema.parse({ pl: 128, dl: 0, st: 0 }));

    expect(track).toMatchObject({ playable: true });
    expect(track.availability).toBeUndefined();
  });

  it('marks tracks without playback permission as unavailable', () => {
    const song = RawSongSchema.parse({
      id: 123,
      name: 'Restricted',
      ar: [{ id: 7, name: 'Origin' }],
      al: { id: 9, name: 'Quiet Album' },
    });

    const track = mapTrack(song, RawPrivilegeSchema.parse({ pl: 0, dl: 128, st: 0 }));

    expect(track).toMatchObject({
      playable: false,
      availability: { reason: 'PRIVILEGE_REQUIRED' },
    });
  });

  it('marks removed tracks with the removed reason', () => {
    const song = RawSongSchema.parse({
      id: 123,
      name: 'Removed',
      ar: [{ id: 7, name: 'Origin' }],
      al: { id: 9, name: 'Quiet Album' },
    });

    const track = mapTrack(song, RawPrivilegeSchema.parse({ pl: 128, dl: 128, st: -200 }));

    expect(track).toMatchObject({
      playable: false,
      availability: { reason: 'REMOVED' },
    });
  });
});
