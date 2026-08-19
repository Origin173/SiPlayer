import { describe, expect, it } from 'vitest';
import { ResponseCache } from './responseCache.js';

describe('ResponseCache', () => {
  it('expires entries after the configured TTL', () => {
    let now = 100;
    const cache = new ResponseCache(50, 4, () => now);
    cache.set('search:a', { payload: '{"data":1}', statusCode: 200, contentType: 'application/json' });

    expect(cache.get('search:a')?.payload).toBe('{"data":1}');
    now = 150;
    expect(cache.get('search:a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry when the capacity is reached', () => {
    const cache = new ResponseCache(1_000, 2);
    cache.set('a', { payload: 'a', statusCode: 200 });
    cache.set('b', { payload: 'b', statusCode: 200 });
    cache.set('c', { payload: 'c', statusCode: 200 });

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')?.payload).toBe('b');
    expect(cache.get('c')?.payload).toBe('c');
  });
});
