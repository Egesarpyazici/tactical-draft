import { expect, it } from 'vitest';
import { advancePlayback } from '../src/arcade/ui/playback';
it('handles a first RAF timestamp earlier than effect setup without a negative path index', () => {
  expect(advancePlayback(0, 101.5, 100, 4000)).toBe(0);
  expect(advancePlayback(0.4, 101.5, 100, 4000)).toBe(0.4);
  expect(advancePlayback(0.4, 100, 500, 4000)).toBe(0.5);
  expect(advancePlayback(0.9, 100, 1100, 4000)).toBe(1);
});
