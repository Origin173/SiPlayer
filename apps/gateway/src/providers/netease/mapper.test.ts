import { describe, expect, it } from 'vitest';
import searchFixture from './fixtures/search.json';
import lyricsFixture from './fixtures/lyrics.json';
import { mapLyrics, mapSearchResponse, parseLrc } from './mapper';
import { RawLyricsResponseSchema, RawSearchResponseSchema } from './rawTypes';

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
});
