import { describe, expect, it } from 'vitest';
import { TIP_CLOSED, isTipOpen, tipReducer, type TipEvent } from '../ui/tipState';

const run = (events: TipEvent[]) => events.reduce(tipReducer, TIP_CLOSED);

describe('InfoTip open/closed logic', () => {
  it('starts closed', () => {
    expect(isTipOpen(TIP_CLOSED)).toBe(false);
  });

  it('pointer hover opens and leaving closes', () => {
    expect(isTipOpen(run(['hover-in']))).toBe(true);
    expect(isTipOpen(run(['hover-in', 'hover-out']))).toBe(false);
  });

  it('keyboard focus opens and blur closes', () => {
    expect(isTipOpen(run(['focus']))).toBe(true);
    expect(isTipOpen(run(['focus', 'blur']))).toBe(false);
  });

  it('a tap pins it open and a second tap closes it (touch has no hover)', () => {
    expect(isTipOpen(run(['click']))).toBe(true);
    expect(isTipOpen(run(['click', 'click']))).toBe(false);
  });

  it('a click while hovering dismisses it outright; leaving then re-entering reopens', () => {
    const afterClick = run(['hover-in', 'click']);
    expect(isTipOpen(afterClick)).toBe(false);
    expect(isTipOpen(tipReducer(afterClick, 'hover-in'))).toBe(true);
  });

  it('pinned survives hover-out and blur; a dismissed tip stays dismissed', () => {
    expect(isTipOpen(run(['hover-in', 'click', 'hover-out']))).toBe(false);
    expect(isTipOpen(run(['focus', 'click', 'blur']))).toBe(false);
    expect(isTipOpen(run(['focus', 'click', 'click', 'blur']))).toBe(true);
    expect(isTipOpen(run(['click', 'hover-in', 'hover-out']))).toBe(true);
    expect(isTipOpen(run(['click', 'focus', 'blur']))).toBe(true);
  });

  it('Escape closes everything, even while still hovered or focused', () => {
    expect(run(['hover-in', 'focus', 'click', 'click', 'escape'])).toEqual(TIP_CLOSED);
    expect(run(['click', 'escape'])).toEqual(TIP_CLOSED);
  });

  it('a pointer-down outside unpins but leaves a live hover alone', () => {
    expect(isTipOpen(run(['click', 'outside']))).toBe(false);
    expect(isTipOpen(run(['hover-in', 'click', 'click', 'hover-in', 'outside']))).toBe(true);
  });
});
