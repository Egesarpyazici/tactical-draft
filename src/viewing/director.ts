import { Match, type MatchCheckpoint } from '../engine/match';
import type { SingleTacticalCommand } from '../engine/types';
import { observe, type Observation } from './analysis';
import { highlightReason, type ViewMode } from './highlights';
/** Bounded speculative simulation; the displayed checkpoint is the intervention authority. */
export class MatchDirector {
  mode: ViewMode = 'key';
  speed = 1;
  observations: Observation[] = [];
  interventions: { tick: number; teams: number[] }[] = [];
  regains: { tick: number; team: number; x: number }[] = [];
  private step() {
    const before = this.engine.state.events.length;
    this.engine.step();
    const s = this.engine.state;
    if (s.tick % 10 === 0) this.observations.push(...observe(s));
    for (const e of s.events.slice(before))
      if (['tackle', 'interception'].includes(e.kind) && e.team !== undefined) {
        const x = (e.team === 0) === (s.half === 1) ? s.ball.pos.x : 105 - s.ball.pos.x;
        this.regains.push({ tick: s.tick, team: e.team, x });
      }
  }
  current: MatchCheckpoint;
  status: 'idle' | 'searching' | 'clip' | 'live' = 'idle';
  transition = 0;
  private ring: MatchCheckpoint[] = [];
  private clip: MatchCheckpoint[] = [];
  private end = -1;
  private startTick = 0;
  private cooldown = -1;
  private goalHold = 0;
  private elapsed = 0;
  private clipTime = 0;
  constructor(public engine: Match) {
    this.current = engine.checkpoint();
  }
  get state() {
    return this.current.state;
  }
  get bufferedFrames() {
    return this.ring.length + this.clip.length;
  }
  start() {
    if (this.state.phase === 'ready') this.engine.start();
    else if (this.state.phase === 'halfTime') this.engine.resumeHalf();
    else this.engine.resume();
    this.current = this.engine.checkpoint();
  }
  pause() {
    // Includes RNG, flight, decisions, statistics and command/event cursors.
    this.engine = Match.restore(this.current);
    this.engine.pause();
    this.observations = this.observations.filter((s) => s.tick <= this.state.tick);
    this.regains = this.regains.filter((s) => s.tick <= this.state.tick);
    this.current = this.engine.checkpoint();
    this.clear();
  }
  private clear() {
    this.ring = [];
    this.clip = [];
    this.end = -1;
    this.elapsed = 0;
    this.cooldown = this.state.tick;
    this.status = 'idle';
    this.goalHold = 0;
  }
  setMode(mode: ViewMode) {
    const playing = this.state.phase === 'playing';
    this.pause();
    this.mode = mode;
    if (playing) this.start();
  }
  apply(commands: SingleTacticalCommand[]) {
    if (this.state.phase === 'playing') throw new Error('Pause before applying a draft');
    this.engine.command({ kind: 'batch', commands });
    if (commands.length)
      this.interventions.push({
        tick: this.state.tick,
        teams: [...new Set(commands.map((c) => c.team))],
      });
    this.current = this.engine.checkpoint();
    this.clear();
  }
  /** Tick budget yields control to the browser. Wall time changes scheduling only. */
  advance(seconds: number, tickBudget = 80) {
    if (this.state.phase !== 'playing') return;
    if (this.goalHold > 0) {
      this.goalHold = Math.max(0, this.goalHold - seconds);
      return;
    }
    if (this.mode === 'full' || this.mode === 'quick') {
      this.elapsed += Math.max(0, seconds) * 12 * this.speed;
      const ticks =
        this.mode === 'quick' ? tickBudget : Math.min(tickBudget, Math.floor(this.elapsed / 0.1));
      let consumed = 0;
      const goals = this.state.stats[0].goals + this.state.stats[1].goals;
      for (; consumed < ticks && this.engine.state.phase === 'playing';) {
        this.step();
        consumed++;
        if (
          this.mode === 'full' &&
          this.engine.state.stats[0].goals + this.engine.state.stats[1].goals > goals
        ) {
          this.goalHold = 0.9;
          break;
        }
      }
      if (this.mode === 'full') this.elapsed -= consumed * 0.1;
      this.current = this.engine.checkpoint();
      this.status = this.mode === 'quick' ? 'searching' : 'live';
      return;
    }
    if (this.clip.length) {
      this.status = 'clip';
      this.clipTime += Math.max(0, seconds) * 4 * this.speed * 10;
      while (this.clip.length && this.clip[0].state.tick <= this.clipTime) {
        const goals = this.state.stats[0].goals + this.state.stats[1].goals;
        this.current = this.clip.shift()!;
        if (this.state.stats[0].goals + this.state.stats[1].goals > goals) {
          this.goalHold = 0.9;
          this.clipTime = this.state.tick;
          break;
        }
      }
      if (!this.clip.length) {
        this.ring = [];
        this.end = -1;
        this.cooldown = this.state.tick + 150;
      }
      return;
    }
    this.status = 'searching';
    for (let i = 0; i < tickBudget && this.engine.state.phase === 'playing'; i++) {
      const count = this.engine.state.events.length;
      this.step();
      const s = this.engine.state;
      const events = s.events.slice(count);
      const reason = highlightReason(s, events, this.mode);
      if (
        reason &&
        (this.end >= 0 ||
          s.tick >= this.cooldown ||
          events.some((e) => e.kind === 'goal' || e.kind === 'save'))
      ) {
        if (this.end < 0) this.startTick = s.tick;
        this.end = Math.min(this.startTick + 160, s.tick + 50);
      }
      if (s.tick % 2 === 0 || s.phase !== 'playing' || events.length)
        this.ring.push(this.engine.checkpoint());
      if (this.end < 0) {
        // Retain at least eight simulated seconds before an as-yet unknown event.
        while (this.ring.length > 1 && this.ring[1].state.tick < s.tick - 80)
          this.current = this.ring.shift()!;
      }
      if ((this.end >= 0 && s.tick >= this.end) || s.phase !== 'playing') {
        this.clip = this.ring.filter((f) => f.state.tick > this.current.state.tick);
        this.ring = [];
        this.clipTime = this.current.state.tick;
        this.transition++;
        if (!this.clip.length) this.current = this.engine.checkpoint();
        break;
      }
    }
  }
}
