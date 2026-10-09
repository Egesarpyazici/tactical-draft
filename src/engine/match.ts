import type { Ball, MatchState, Player, Restart, Tactics, Team, TeamId, Vec } from './types';
import { DT, FIELD, Random, clamp, distance, inside, segmentDistance } from './math';
import { anchor, direction, localX, roleFor, validateTactics } from './tactics';
import { evaluate } from './decisions';
import { emptyPlayerStats, emptyTeamStats, record } from './stats';
const other = (id: TeamId) => (1 - id) as TeamId;
export class Match {
  readonly state: MatchState;
  private random: Random;
  constructor(teams: [Team, Team], seed = 2026) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
      throw new Error('Seed must be uint32');
    const ids = new Set<string>();
    teams.forEach((t, i) => {
      validateTactics(t.tactics);
      if (
        t.id !== i ||
        t.players.length !== 11 ||
        t.players.filter((p) => p.keeper).length !== 1 ||
        !t.players[0].keeper
      )
        throw new Error('Teams need 11 players, goalkeeper in slot 0');
      for (const p of t.players) {
        if (ids.has(p.id)) throw new Error('Duplicate player id');
        ids.add(p.id);
        for (const v of Object.values(p.attributes))
          if (!Number.isFinite(v) || v < 0 || v > 100) throw new Error('Attributes must be 0–100');
      }
    });
    this.random = new Random(seed);
    const copy = structuredClone(teams);
    const players = copy.flatMap((t) =>
      t.players.map((p, slot) => ({
        ...p,
        role: roleFor(t.tactics.formation, slot),
        team: t.id,
        pos: { x: 52.5, y: 34 },
        velocity: { x: 0, y: 0 },
        facing: 0,
        energy: 1,
        target: { x: 52.5, y: 34 },
        action: 'shape' as const,
        choices: [],
        decisionAt: 0,
        possessionSince: 0,
        challengeAt: 0,
      })),
    );
    this.state = {
      seed,
      tick: 0,
      time: 0,
      half: 1,
      phase: 'ready',
      teams: copy,
      players,
      ball: {
        pos: { x: 52.5, y: 34 },
        velocity: { x: 0, y: 0 },
        owner: null,
        lastTouch: null,
        flight: null,
      },
      events: [],
      stats: [emptyTeamStats(), emptyTeamStats()],
      playerStats: Object.fromEntries(players.map((p) => [p.id, emptyPlayerStats()])),
      restart: null,
      possession: 0,
      possessionChangedAt: 0,
    };
    this.resetShape();
  }
  start() {
    if (this.state.phase !== 'ready') return;
    this.state.phase = 'playing';
    this.queueRestart('kickoff', 0, { x: 52.5, y: 34 });
  }
  resumeHalf() {
    if (this.state.phase !== 'halfTime') return;
    const s = this.state;
    s.half = 2;
    s.phase = 'playing';
    for (const p of s.players) p.energy = clamp(p.energy + 0.08);
    this.queueRestart('kickoff', 1, { x: 52.5, y: 34 });
  }
  setTactics(team: TeamId, t: Tactics) {
    if (team !== 0 && team !== 1) throw new Error('Unknown team');
    if (!['ready', 'halfTime'].includes(this.state.phase))
      throw new Error('Tactics can change before match or at half time');
    validateTactics(t);
    this.state.teams[team].tactics = { ...t };
    this.state.players
      .filter((p) => p.team === team)
      .forEach((p, i) => (p.role = roleFor(t.formation, i)));
    record(this.state, { kind: 'tactics', team });
    for (const p of this.state.players) p.decisionAt = 0;
    if (this.state.phase === 'ready') this.resetShape();
  }
  snapshot(): MatchState {
    return structuredClone(this.state);
  }
  step(count = 1) {
    if (!Number.isInteger(count) || count < 0 || count > 54000)
      throw new Error('Invalid step count');
    for (let i = 0; i < count && this.state.phase === 'playing'; i++) this.tick();
  }
  private resetShape(kickoff = false) {
    for (const p of this.state.players) {
      p.pos = anchor(this.state, p);
      if (kickoff) {
        const x = Math.min(localX(p.pos.x, p.team, this.state.half), 46);
        p.pos.x = localX(x, p.team, this.state.half);
      }
      p.target = { ...p.pos };
      p.velocity = { x: 0, y: 0 };
      p.decisionAt = 0;
    }
  }
  private queueRestart(kind: Restart['kind'], team: TeamId, pos: Vec) {
    const s = this.state;
    s.restart = { kind, team, pos: { ...pos }, ticks: kind === 'kickoff' ? 25 : 18 };
    s.ball = {
      pos: { ...pos },
      owner: null,
      lastTouch: s.ball.lastTouch,
      flight: null,
      velocity: { x: 0, y: 0 },
    };
    s.possession = team;
    s.possessionChangedAt = s.time;
    if (kind === 'kickoff') this.resetShape(true);
  }
  private takeRestart() {
    const s = this.state,
      r = s.restart!;
    let taker = s.players
      .filter((p) => p.team === r.team && !p.keeper)
      .sort((a, b) => distance(a.pos, r.pos) - distance(b.pos, r.pos))[0];
    if (r.kind === 'goalKick') taker = s.players.find((p) => p.team === r.team && p.keeper)!;
    taker.pos = inside(r.pos);
    taker.velocity = { x: 0, y: 0 };
    for (const p of s.players)
      if (p.team !== r.team && distance(p.pos, taker.pos) < 4)
        p.pos = inside({ x: p.pos.x - direction(r.team, s.half) * 5, y: p.pos.y + 5 });
    this.giveBall(taker);
    record(s, { kind: r.kind, team: r.team, player: taker.id });
    s.restart = null;
  }
  private giveBall(p: Player) {
    const s = this.state;
    if (s.possession !== p.team) {
      s.possession = p.team;
      s.possessionChangedAt = s.time;
    }
    s.ball = {
      pos: { ...p.pos },
      velocity: { x: 0, y: 0 },
      owner: p.id,
      lastTouch: p.id,
      flight: null,
    };
    p.possessionSince = s.time;
    p.decisionAt = 0;
  }
  private tick() {
    const s = this.state;
    s.tick++;
    s.time = s.tick * DT;
    if (s.restart) {
      s.restart.ticks--;
      if (s.restart.ticks <= 0) this.takeRestart();
    } else {
      s.stats[s.possession].possessionTicks++;
      // Evaluate all agents against the same pre-movement positions (no in-loop movement bias).
      for (const p of s.players)
        if (s.tick >= p.decisionAt || (p.keeper && s.ball.flight?.kind === 'shot')) {
          p.choices = evaluate(s, p);
          p.action = p.choices[0].action;
          p.target = p.choices[0].target;
          p.decisionAt = s.tick + 5;
        }
      for (const p of s.players) this.move(p);
      const owner = s.players.find((p) => p.id === s.ball.owner);
      if (owner) {
        s.ball.pos = { ...owner.pos };
        this.challenge(owner);
        if (
          s.ball.owner === owner.id &&
          s.time - owner.possessionSince > 0.65 + (100 - s.teams[owner.team].tactics.tempo) * 0.018
        )
          this.execute(owner);
      } else this.moveBall();
    }
    if (s.tick === 27000) {
      s.phase = 'halfTime';
      s.restart = null;
      record(s, { kind: 'halfTime' });
    }
    if (s.tick === 54000) {
      s.phase = 'finished';
      s.restart = null;
      record(s, { kind: 'fullTime' });
    }
  }
  private move(p: Player) {
    const s = this.state;
    // A kick target is not a running destination: plant before passing/shooting.
    const planting = s.ball.owner === p.id && (p.action === 'pass' || p.action === 'shoot');
    const dx = planting ? 0 : p.target.x - p.pos.x,
      dy = planting ? 0 : p.target.y - p.pos.y,
      d = Math.hypot(dx, dy);
    const effort =
      p.action === 'press' || p.action === 'run' || p.action === 'recover' || p.keeper ? 1 : 0.68;
    const speed =
      (4.0 + p.attributes.pace * 0.035) *
      (0.65 + p.energy * 0.35) *
      effort *
      (s.ball.owner === p.id ? 0.82 : 1);
    const desired = {
      x: d > 0.05 ? (dx / d) * Math.min(speed, d / DT) : 0,
      y: d > 0.05 ? (dy / d) * Math.min(speed, d / DT) : 0,
    };
    const accel = (2 + p.attributes.acceleration * 0.045) * DT;
    const vx = desired.x - p.velocity.x,
      vy = desired.y - p.velocity.y,
      v = Math.hypot(vx, vy);
    if (v > accel) {
      p.velocity.x += (vx / v) * accel;
      p.velocity.y += (vy / v) * accel;
    } else p.velocity = desired;
    const next = inside({ x: p.pos.x + p.velocity.x * DT, y: p.pos.y + p.velocity.y * DT });
    const travelled = distance(p.pos, next);
    p.pos = next;
    if (travelled > 0.001) p.facing = Math.atan2(p.velocity.y, p.velocity.x);
    s.playerStats[p.id].distance += travelled;
    if (p.action === 'press') s.playerStats[p.id].pressSeconds += DT;
    const drain =
      travelled *
      (0.000014 + (100 - p.attributes.stamina) * 0.00000022) *
      (p.action === 'press' ? 2.2 : 1);
    p.energy = clamp(p.energy - drain + (travelled < 0.07 ? 0.000012 : 0), 0.25, 1);
  }
  private challenge(owner: Player) {
    const s = this.state;
    const challengers = s.players
      .filter(
        (p) =>
          p.team !== owner.team &&
          distance(p.pos, owner.pos) < (p.keeper ? 2.6 : 1.6) &&
          s.tick >= p.challengeAt,
      )
      .sort((a, b) => distance(a.pos, owner.pos) - distance(b.pos, owner.pos));
    for (const p of challengers) {
      p.challengeAt = s.tick + 12;
      const win = p.keeper
        ? clamp(0.35 + (p.attributes.reflexes + p.attributes.handling) * 0.002, 0.35, 0.85)
        : clamp(
            0.28 +
              (p.attributes.tackling +
                p.attributes.aggression -
                owner.attributes.dribbling -
                owner.attributes.composure) *
                0.003,
            0.08,
            0.65,
          );
      if (this.random.next() < win) {
        record(s, { kind: 'tackle', team: p.team, player: p.id, target: owner.id });
        this.giveBall(p);
        return;
      }
    }
  }
  private execute(p: Player) {
    const c = p.choices[0];
    if (!c || c.action === 'dribble' || !['pass', 'shoot'].includes(c.action)) return;
    const s = this.state,
      shot = c.action === 'shoot';
    const pressure = clamp(
      (5 -
        Math.min(
          ...s.players.filter((q) => q.team !== p.team).map((q) => distance(q.pos, p.pos)),
        )) /
        5,
    );
    let target = { ...c.target };
    // Choice targets are clamped to the pitch; shots must cross the goal line.
    if (shot) {
      target.x = direction(p.team, s.half) === 1 ? 106 : -1;
      target.y =
        34 +
        this.random.signed() *
          (2.2 +
            (100 - p.attributes.finishing) * 0.1 +
            pressure * (100 - p.attributes.composure) * 0.04);
    } else {
      const error = (100 - p.attributes.passing + 100 - p.attributes.technique) / 200;
      target.x += this.random.signed() * error * 4;
      target.y += this.random.signed() * error * 4;
    }
    const dx = target.x - p.pos.x,
      dy = target.y - p.pos.y,
      d = Math.hypot(dx, dy) || 1;
    const speed = shot ? 22 + p.attributes.shotPower * 0.12 : 12 + p.attributes.passing * 0.06;
    const goalX = direction(p.team, s.half) === 1 ? 105 : 0;
    const crossingY = p.pos.y + ((goalX - p.pos.x) * dy) / dx;
    const onTarget = shot && Math.abs(crossingY - 34) <= FIELD.goalHalf;
    s.ball = {
      pos: { ...p.pos },
      velocity: { x: (dx / d) * speed, y: (dy / d) * speed },
      owner: null,
      lastTouch: p.id,
      flight: {
        kind: shot ? 'shot' : 'pass',
        kicker: p.id,
        team: p.team,
        age: 0,
        intended: c.receiver,
        onTarget,
      },
    };
    record(s, {
      kind: shot ? 'shot' : 'pass',
      team: p.team,
      player: p.id,
      target: c.receiver,
      onTarget: shot ? onTarget : undefined,
    });
    p.decisionAt = 0;
  }
  private moveBall() {
    const s = this.state,
      b = s.ball,
      old = { ...b.pos },
      next = { x: b.pos.x + b.velocity.x * DT, y: b.pos.y + b.velocity.y * DT };
    if (b.flight) b.flight.age += DT;
    // Earliest pitch-boundary intersection wins, including diagonal corner crossings.
    const hits: { t: number; axis: 'x' | 'y'; value: number }[] = [];
    for (const [axis, max] of [
      ['x', 105],
      ['y', 68],
    ] as const)
      if (next[axis] < 0 || next[axis] > max) {
        const value = next[axis] < 0 ? 0 : max;
        hits.push({ t: (value - old[axis]) / (next[axis] - old[axis]), axis, value });
      }
    hits.sort((a, b) => a.t - b.t);
    const hit = hits[0];
    const end = hit
      ? { x: old.x + (next.x - old.x) * hit.t, y: old.y + (next.y - old.y) * hit.t }
      : next;
    // Swept segment collision avoids tunnelling through players at high ball speed.
    const candidates = s.players
      .filter((p) => !(p.id === b.lastTouch && (b.flight?.age ?? 1) < 0.55))
      .filter(
        (p) =>
          segmentDistance(p.pos, old, end) < (p.keeper ? 1.0 + p.attributes.reach * 0.009 : 0.8),
      )
      .sort((a, c) => distance(a.pos, old) - distance(c.pos, old));
    for (const p of candidates) {
      if (b.flight?.kind === 'shot') {
        if (p.team === b.flight.team) continue;
        if (s.tick < p.challengeAt) continue;
        p.challengeAt = s.tick + 6;
        const prob = p.keeper
          ? clamp(
              0.52 + p.attributes.reflexes * 0.005 - segmentDistance(p.pos, old, end) * 0.055,
              0.15,
              0.97,
            )
          : 0.32;
        if (this.random.next() > prob) continue;
        record(s, { kind: p.keeper ? 'save' : 'block', team: p.team, player: p.id });
        if (p.keeper && this.random.next() > p.attributes.handling / 100) {
          b.pos = { ...p.pos };
          b.velocity = { x: -b.velocity.x * 0.35, y: this.random.signed() * 7 };
          b.flight = null;
          b.lastTouch = p.id;
          return;
        }
        this.giveBall(p);
        return;
      }
      if (s.tick < p.challengeAt) continue;
      const speed = Math.hypot(b.velocity.x, b.velocity.y);
      if (
        this.random.next() >
        clamp(0.7 + p.attributes.firstTouch * 0.003 - speed * 0.008, 0.35, 0.98)
      ) {
        record(s, { kind: 'miscontrol', team: p.team, player: p.id });
        b.pos = { ...p.pos };
        b.velocity = {
          x: b.velocity.x * 0.45 + this.random.signed() * 2,
          y: b.velocity.y * 0.45 + this.random.signed() * 2,
        };
        b.lastTouch = p.id;
        b.flight = null;
        p.challengeAt = s.tick + 6;
        return;
      }
      if (b.flight?.kind === 'pass') {
        if (p.team === b.flight.team && p.id !== b.flight.kicker)
          record(s, { kind: 'passComplete', team: p.team, player: b.flight.kicker, target: p.id });
        else if (p.team !== b.flight.team)
          record(s, { kind: 'interception', team: p.team, player: p.id });
      }
      this.giveBall(p);
      return;
    }
    b.pos = end;
    if (hit) {
      this.boundary(b, hit.axis, hit.value);
      return;
    }
    const friction = b.flight?.kind === 'shot' ? 0.996 : 0.981;
    b.velocity.x *= friction;
    b.velocity.y *= friction;
  }
  private boundary(b: Ball, axis: 'x' | 'y', value: number) {
    const s = this.state,
      last = s.players.find((p) => p.id === b.lastTouch),
      lastTeam = last?.team ?? s.possession;
    if (axis === 'y') {
      this.queueRestart('throwIn', other(lastTeam), {
        x: clamp(b.pos.x, 1, 104),
        y: value === 0 ? 0.5 : 67.5,
      });
      return;
    }
    const attacking = s.teams.find((t) => (direction(t.id, s.half) === 1 ? 105 : 0) === value)!.id;
    if (Math.abs(b.pos.y - 34) <= FIELD.goalHalf) {
      record(s, {
        kind: 'goal',
        team: attacking,
        player: last?.team === attacking ? last.id : undefined,
        detail: last?.team !== attacking ? 'Kendi kalesine' : undefined,
      });
      this.queueRestart('kickoff', other(attacking), { x: 52.5, y: 34 });
      return;
    }
    if (lastTeam !== attacking)
      this.queueRestart('corner', attacking, {
        x: value === 0 ? 0.5 : 104.5,
        y: b.pos.y < 34 ? 0.5 : 67.5,
      });
    else this.queueRestart('goalKick', other(attacking), { x: value === 0 ? 5.5 : 99.5, y: 34 });
  }
}
