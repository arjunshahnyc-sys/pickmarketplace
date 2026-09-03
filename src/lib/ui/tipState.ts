// Open/closed logic for InfoTip, kept pure so it is unit-tested in node.
//
// A tip is open while the pointer hovers its trigger, while the trigger has
// keyboard focus, or while it has been pinned by a click or tap. Hover and
// focus come and go on their own; pinning is the touch path (no hover) and
// the "keep it open while I read" path on desktop. Click toggles: it pins
// a closed tip and dismisses an open one outright, so the same tap that
// opened it can close it. Escape closes everything; a pointer-down outside
// unpins but leaves hover and focus to their own events.

export interface TipState {
  hovered: boolean;
  focused: boolean;
  pinned: boolean;
}

export type TipEvent =
  | 'hover-in'
  | 'hover-out'
  | 'focus'
  | 'blur'
  | 'click'
  | 'escape'
  | 'outside';

export const TIP_CLOSED: TipState = { hovered: false, focused: false, pinned: false };

export function isTipOpen(s: TipState): boolean {
  return s.hovered || s.focused || s.pinned;
}

export function tipReducer(s: TipState, e: TipEvent): TipState {
  switch (e) {
    case 'hover-in':
      return { ...s, hovered: true };
    case 'hover-out':
      return { ...s, hovered: false };
    case 'focus':
      return { ...s, focused: true };
    case 'blur':
      return { ...s, focused: false };
    case 'click':
      return isTipOpen(s) ? TIP_CLOSED : { ...s, pinned: true };
    case 'escape':
      return TIP_CLOSED;
    case 'outside':
      return { ...s, pinned: false };
  }
}
