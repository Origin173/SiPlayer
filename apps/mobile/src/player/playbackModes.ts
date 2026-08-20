import type { PlaybackMode } from './playbackTypes';

export interface ShuffleState {
  order: number[];
  cursor: number;
  history: number[];
  historyCursor: number;
}

function shuffledIndexes(indexes: number[], random: () => number): number[] {
  const result = [...indexes];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.min(Math.max(Math.floor(random() * (index + 1)), 0), index);
    [result[index], result[randomIndex]] = [result[randomIndex]!, result[index]!];
  }
  return result;
}

export function createShuffleState(length: number, currentIndex: number, random = Math.random): ShuffleState {
  const indexes = Array.from({ length: Math.max(length, 0) }, (_, index) => index);
  const order = shuffledIndexes(indexes.filter((index) => index !== currentIndex), random);
  const history = currentIndex >= 0 && currentIndex < length ? [currentIndex] : [];
  return {
    order,
    cursor: -1,
    history,
    historyCursor: history.length - 1,
  };
}

export function nextShuffleIndex(
  state: ShuffleState,
  currentIndex: number,
  length: number,
  random = Math.random,
): { index: number | null; state: ShuffleState } {
  if (length <= 0 || currentIndex < 0 || currentIndex >= length) return { index: null, state };

  let history = [...state.history];
  let historyCursor = state.historyCursor;
  if (history[historyCursor] !== currentIndex) {
    history = history.slice(0, Math.max(historyCursor + 1, 0));
    if (history.at(-1) !== currentIndex) history = [...history, currentIndex];
    historyCursor = history.length - 1;
  }

  const replayIndex = history[historyCursor + 1];
  if (replayIndex != null) {
    const replayCursor = state.order.lastIndexOf(replayIndex);
    return {
      index: replayIndex,
      state: {
        ...state,
        cursor: replayCursor >= 0 ? replayCursor : state.cursor,
        history,
        historyCursor: historyCursor + 1,
      },
    };
  }

  let order = state.order;
  let cursor = state.cursor;
  if (cursor + 1 >= order.length) {
    order = createShuffleState(length, currentIndex, random).order;
    cursor = -1;
  }

  const index = order[cursor + 1] ?? null;
  if (index == null) return { index: null, state: { order, cursor, history, historyCursor } };

  history.push(index);
  historyCursor += 1;
  return { index, state: { order, cursor: cursor + 1, history, historyCursor } };
}

export function previousShuffleIndex(state: ShuffleState, currentIndex: number): { index: number; state: ShuffleState } {
  let history = [...state.history];
  let historyCursor = state.historyCursor;
  if (history[historyCursor] !== currentIndex) {
    history = history.slice(0, Math.max(historyCursor + 1, 0));
    if (history.at(-1) !== currentIndex) history = [...history, currentIndex];
    historyCursor = history.length - 1;
  }
  if (historyCursor <= 0) return { index: currentIndex, state: { ...state, history, historyCursor } };

  historyCursor -= 1;
  const index = history[historyCursor] ?? currentIndex;
  const cursor = state.order.lastIndexOf(index);
  return { index, state: { ...state, cursor, history, historyCursor } };
}

export function nextQueueIndex(mode: PlaybackMode, currentIndex: number, length: number, randomValue = Math.random()): number | null {
  if (length <= 0 || currentIndex < 0 || currentIndex >= length) return null;
  if (mode === 'repeat_one') return currentIndex;
  if (mode === 'repeat_all') return (currentIndex + 1) % length;
  if (mode === 'shuffle') {
    if (length === 1) return currentIndex;
    const candidates = Array.from({ length }, (_, index) => index).filter((index) => index !== currentIndex);
    return candidates[Math.min(Math.floor(randomValue * candidates.length), candidates.length - 1)] ?? null;
  }
  return currentIndex + 1 < length ? currentIndex + 1 : null;
}
