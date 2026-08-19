import { describe, expect, it } from 'vitest';
import { chunkArray, orderByIds } from './batching';

describe('netease request batching', () => {
  it('splits large id lists into bounded batches', () => {
    expect(chunkArray(['1', '2', '3', '4', '5'], 2)).toEqual([['1', '2'], ['3', '4'], ['5']]);
  });

  it('restores upstream items to the requested id order', () => {
    expect(orderByIds(['3', '1', '2'], [{ id: '1' }, { id: '2' }, { id: '3' }])).toEqual([
      { id: '3' },
      { id: '1' },
      { id: '2' },
    ]);
  });
});
