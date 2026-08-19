import { describe, expect, it } from 'vitest';
import { getQueueRowActionState } from './queueRowActions';

describe('queue row actions', () => {
  it('keeps remove visible when a row also has reorder controls', () => {
    expect(getQueueRowActionState({ canMoveUp: true, canMoveDown: true, canRemove: true })).toEqual({
      showMoveControls: true,
      showRemove: true,
    });
  });

  it('shows only the available action groups', () => {
    expect(getQueueRowActionState({ canMoveUp: false, canMoveDown: false, canRemove: true })).toEqual({
      showMoveControls: false,
      showRemove: true,
    });
  });
});
