export interface QueueRowActionInput {
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
}

export interface QueueRowActionState {
  showMoveControls: boolean;
  showRemove: boolean;
}

export function getQueueRowActionState(input: QueueRowActionInput): QueueRowActionState {
  return {
    showMoveControls: input.canMoveUp || input.canMoveDown,
    showRemove: input.canRemove,
  };
}
