export const TAB_BAR_HEIGHT = 62;
export const MINI_PLAYER_HEIGHT = 64;
export const MINI_PLAYER_GAP = 8;

export function getOverlayAwareListPadding(safeAreaBottom: number): number {
  return TAB_BAR_HEIGHT + MINI_PLAYER_HEIGHT + MINI_PLAYER_GAP + safeAreaBottom;
}
