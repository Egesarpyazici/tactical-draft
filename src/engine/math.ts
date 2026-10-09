import type { Vec } from './types';
export const FIELD = { width: 105, height: 68, goalHalf: 3.66 };
export const DT = 0.1;
export const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const inside = (v: Vec): Vec => ({ x: clamp(v.x, 0.4, 104.6), y: clamp(v.y, 0.4, 67.6) });
export function segmentDistance(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
/** All stochastic execution passes through this seeded stream. No wall clock dependency. */
export class Random {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  signed() {
    return this.next() * 2 - 1;
  }
}
