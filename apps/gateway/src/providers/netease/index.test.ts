import { describe, expect, it, vi } from 'vitest';
import type { AudioQuality } from '@siplayer/contracts';
import { NeteaseProvider } from './index.js';

describe('NeteaseProvider stream quality mapping', () => {
  it.each([
    ['standard', 'standard'],
    ['high', 'exhigh'],
    ['lossless', 'lossless'],
    ['hi_res', 'hires'],
  ] as const)('maps %s to the api-enhanced level %s', async (quality: AudioQuality, expectedLevel: string) => {
    let requestedUrl: URL | undefined;
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      requestedUrl = new URL(String(input));
      return new Response(JSON.stringify({
        code: 200,
        data: [{ id: 'track-1', url: 'https://audio.example.com/track.mp3', br: 320_000 }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const provider = new NeteaseProvider({ baseUrl: 'https://upstream.example', fetchImpl });

    await provider.resolveStream('track-1', quality);

    expect(requestedUrl?.pathname).toBe('/song/url/v1');
    expect(requestedUrl?.searchParams.get('level')).toBe(expectedLevel);
  });
});
