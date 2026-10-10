/** RAF timestamps can precede effect setup in the same frame. Never rewind playback. */
export function advancePlayback(progress: number, previous: number, now: number, duration: number) {
  return Math.max(0, Math.min(1, progress + Math.max(0, now - previous) / duration));
}
