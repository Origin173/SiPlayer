import { describe, expect, it } from 'vitest';
import { dedupeByTrackId } from './searchResults';

describe('dedupeByTrackId', () => {
  it('keeps the first item for duplicate ids across pages', () => {
    const items = [
      { id: '123', name: 'first' },
      { id: '456', name: 'second' },
      { id: '123', name: 'duplicate' },
    ];

    expect(dedupeByTrackId(items)).toEqual([
      { id: '123', name: 'first' },
      { id: '456', name: 'second' },
    ]);
  });
});
