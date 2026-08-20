import type { Track } from '@siplayer/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFile = vi.hoisted(() => ({
  content: null as string | null,
}));

vi.mock('expo-file-system', () => ({
  File: class MockFile {
    get exists(): boolean {
      return mockFile.content !== null;
    }

    create(): void {
      mockFile.content = '';
    }

    async text(): Promise<string> {
      return mockFile.content ?? '';
    }

    write(value: string): void {
      mockFile.content = value;
    }
  },
  Paths: { document: 'document' },
}));

import { loadLocalHistory, recordLocalTrack } from './localHistory';

const track = (id: string): Track => ({
  id,
  name: `Track ${id}`,
  artists: [{ id: `artist-${id}`, name: 'Origin' }],
  artistText: 'Origin',
  album: null,
  artworkUrl: null,
  durationMs: 180_000,
  playable: true,
});

describe('local playback history writes', () => {
  beforeEach(() => {
    mockFile.content = null;
  });

  it('serializes concurrent records so neither track is overwritten', async () => {
    await Promise.all([recordLocalTrack(track('a')), recordLocalTrack(track('b'))]);

    expect((await loadLocalHistory()).map((item) => item.id)).toEqual(['b', 'a']);
  });
});
