export interface CachedResponse {
  payload: string;
  statusCode: number;
  contentType?: string;
}

interface CacheEntry extends CachedResponse {
  expiresAt: number;
}

export class ResponseCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): CachedResponse | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return {
      payload: entry.payload,
      statusCode: entry.statusCode,
      contentType: entry.contentType,
    };
  }

  set(key: string, response: CachedResponse): void {
    if (this.ttlMs <= 0 || this.maxEntries <= 0) return;
    if (this.entries.has(key)) this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (typeof oldestKey !== 'string') break;
      this.entries.delete(oldestKey);
    }
    this.entries.set(key, { ...response, expiresAt: this.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
