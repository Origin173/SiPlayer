import { describe, expect, it } from 'vitest';
import { getOverlayAwareListPadding, MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from './overlayMetrics';

describe('overlay layout metrics', () => {
  it('reserves the tab bar, mini player, gap, and safe area', () => {
    expect(getOverlayAwareListPadding(24)).toBe(TAB_BAR_HEIGHT + MINI_PLAYER_HEIGHT + MINI_PLAYER_GAP + 24);
  });
});
