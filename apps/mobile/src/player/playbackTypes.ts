import type { Track } from '@siplayer/contracts';

export type PlaybackState =
  | 'idle'
  | 'resolving'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'unavailable'
  | 'error';

export type PlaybackMode = 'sequential' | 'repeat_all' | 'repeat_one' | 'shuffle';

export interface QueueItem {
  trackId: string;
  title: string;
  artistText: string;
  albumTitle?: string | null;
  artworkUrl?: string | null;
  durationMs?: number | null;
}

export interface PlayContext {
  queue?: QueueItem[];
  startIndex?: number;
}

export function queueItemFromTrack(track: Track): QueueItem {
  return {
    trackId: track.id,
    title: track.name,
    artistText: track.artistText,
    albumTitle: track.album?.name ?? null,
    artworkUrl: track.artworkUrl,
    durationMs: track.durationMs,
  };
}
