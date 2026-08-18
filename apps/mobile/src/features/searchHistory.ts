import { File, Paths } from 'expo-file-system';

const historyFile = new File(Paths.document, 'siplayer-search-history.json');
const MAX_HISTORY = 20;

export async function loadSearchHistory(): Promise<string[]> {
  try {
    if (!historyFile.exists) return [];
    const parsed: unknown = JSON.parse(await historyFile.text());
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export async function recordSearchKeyword(keyword: string): Promise<string[]> {
  const normalized = keyword.trim();
  if (!normalized) return loadSearchHistory();
  const history = await loadSearchHistory();
  const next = [normalized, ...history.filter((item) => item !== normalized)].slice(0, MAX_HISTORY);
  try {
    if (!historyFile.exists) historyFile.create({ overwrite: true });
    historyFile.write(JSON.stringify(next));
  } catch {
    // Search history is a best-effort local convenience.
  }
  return next;
}
