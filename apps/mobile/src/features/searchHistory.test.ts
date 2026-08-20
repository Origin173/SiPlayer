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

import { loadSearchHistory, recordSearchKeyword } from './searchHistory';

describe('search history writes', () => {
  beforeEach(() => {
    mockFile.content = null;
  });

  it('serializes concurrent records so neither keyword is overwritten', async () => {
    await Promise.all([recordSearchKeyword('a'), recordSearchKeyword('b')]);

    expect(await loadSearchHistory()).toEqual(['b', 'a']);
  });
});
