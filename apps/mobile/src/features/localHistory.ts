import { File, Paths } from 'expo-file-system';
import { TrackSchema, type Track } from '@siplayer/contracts';

const historyFile = new File(Paths.document, 'siplayer-local-history.json');
const MAX_HISTORY = 50;

export async function loadLocalHistory(): Promise<Track[]> {
  try {
    if (!historyFile.exists) return [];
    const parsed: unknown = JSON.parse(await historyFile.text());
    const result = TrackSchema.array().safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export async function recordLocalTrack(track: Track): Promise<void> {
  const history = await loadLocalHistory();
  const next = [track, ...history.filter((item) => item.id !== track.id)].slice(0, MAX_HISTORY);
  try {
    if (!historyFile.exists) historyFile.create({ overwrite: true });
    historyFile.write(JSON.stringify(next));
  } catch {
    // Local history is a best-effort fallback and never blocks playback.
  }
}
