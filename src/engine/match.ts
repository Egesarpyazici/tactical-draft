import type {
  Ball,
  MatchState,
  Player,
  Restart,
  Tactics,
  Team,
  TeamId,
  Vec,
  TacticalCommand,
} from './types';
import { DT, FIELD, Random, clamp, distance, inside, segmentDistance } from './math';
import { anchor, direction, localX, roleFor, validateTactics } from './tactics';
import { evaluate } from './decisions';
import { defaultAssignment, ROLES, validateRole } from './roles';
import { organize, separatedTarget } from './organization';
import { passOption, pressure, shotOpportunity } from './opportunities';
import { emptyPlayerStats, emptyTeamStats, record } from './stats';
const other = (id: TeamId) => (1 - id) as TeamId;
export type MatchCheckpoint = { state: MatchState; random: number };
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
        slot,
        ...defaultAssignment(roleFor(t.tactics.formation, slot)),
        control: 1,
        regainAt: 0,
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
      initialTeams: structuredClone(copy),
      players,
      ball: {
        pos: { x: 52.5, y: 34 },
        velocity: { x: 0, y: 0 },
        owner: null,
        lastTouch: null,
        flight: null,
      },
      events: [],
      commands: [],
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
  pause() {
    if (this.state.phase === 'playing') this.state.phase = 'paused';
  }
  resume() {
    if (this.state.phase === 'paused') this.state.phase = 'playing';
  }
  setTactics(team: TeamId, t: Tactics) {
    this.command({ kind: 'tactics', team, tactics: t });
  }
  command(command: TacticalCommand) {
    const s = this.state,
      c = structuredClone(command);
    if (!['ready', 'halfTime', 'paused'].includes(s.phase))
      throw new Error('Pause the match to change tactics');
    if (c.kind === 'batch') {
      if (!c.commands.length) return;
      const candidate = Match.restore(this.checkpoint());
      for (const item of c.commands) candidate.command(item);
      candidate.state.commands = candidate.state.commands.slice(0, s.commands.length);
      candidate.state.events = candidate.state.events.slice(0, s.events.length);
      candidate.state.commands.push({ tick: s.tick, sequence: s.commands.length, command: c });
      record(candidate.state, { kind: 'tactics', command: c, detail: 'Taktik planı uygulandı' });
      Object.assign(s, candidate.state);
      return;
    }
    if (c.team !== 0 && c.team !== 1) throw new Error('Unknown team');
    if (c.kind === 'tactics') {
      validateTactics(c.tactics);
      s.teams[c.team].tactics = { ...c.tactics };
      for (const p of s.players.filter((p) => p.team === c.team)) {
        p.role = roleFor(c.tactics.formation, p.slot);
        if (!ROLES[p.roleId].positions.includes(p.role))
          Object.assign(p, defaultAssignment(p.role));
      }
    } else if (c.kind === 'assignment') {
      const p = s.players.find((p) => p.team === c.team && p.id === c.player);
      if (
        !p ||
        !Number.isInteger(c.slot) ||
        c.slot < 0 ||
        c.slot > 10 ||
        p.keeper !== (c.slot === 0)
      )
        throw new Error('Invalid position assignment');
      const position = roleFor(s.teams[c.team].tactics.formation, c.slot);
      validateRole(position, c.roleId, c.duty);
      const displaced = s.players.find((q) => q.team === c.team && q.slot === c.slot)!;
      if (displaced !== p) {
        displaced.slot = p.slot;
        displaced.role = roleFor(s.teams[c.team].tactics.formation, displaced.slot);
        if (!ROLES[displaced.roleId].positions.includes(displaced.role))
          Object.assign(displaced, defaultAssignment(displaced.role));
      }
      Object.assign(p, { slot: c.slot, role: position, roleId: c.roleId, duty: c.duty });
    } else throw new Error('Unknown tactical command');
    s.commands.push({ tick: s.tick, sequence: s.commands.length, command: c });
    record(s, { kind: 'tactics', team: c.team, command: c });
    for (const p of s.players) p.decisionAt = 0;
    if (s.phase === 'ready') this.resetShape();
  }
  /** Internal checkpoint: histories are append-only; clone their arrays, not every past event. */
  checkpoint(): MatchCheckpoint {
    const { events, commands, ...dynamic } = this.state;
    return {
      state: { ...structuredClone(dynamic), events: events.slice(), commands: commands.slice() },
      random: this.random.checkpoint(),
    };
  }
  static restore(checkpoint: MatchCheckpoint): Match {
    const match = new Match(checkpoint.state.initialTeams, checkpoint.state.seed);
    const { events, commands, ...dynamic } = checkpoint.state;
    Object.assign(match.state, structuredClone(dynamic), {
      events: events.slice(),
      commands: commands.slice(),
    });
    match.random.restore(checkpoint.random);
    return match;
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
    s.restart = {
      kind,
      team,
      pos: { ...pos },
      ticks: kind === 'kickoff' ? 65 : kind === 'throwIn' ? 75 : 100,
    };
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
      if (!s.restart)
        record(s, {
          kind: 'turnover',
          team: s.possession,
          player: s.players.find((q) => q.id === s.ball.lastTouch && q.team === s.possession)?.id,
        });
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
    p.control = clamp(0.45 + p.attributes.firstTouch * 0.005, 0, 1);
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
      const needsPlan = s.players.some(
        (p) => s.tick >= p.decisionAt || (p.keeper && s.ball.flight?.kind === 'shot'),
      );
      const plans = needsPlan ? [organize(s, 0), organize(s, 1)] : [];
      // Evaluate all agents against the same pre-movement positions (no in-loop movement bias).
      for (const p of s.players)
        if (s.tick >= p.decisionAt || (p.keeper && s.ball.flight?.kind === 'shot')) {
          p.choices = evaluate(s, p, plans[p.team]);
          p.action = p.choices[0].action;
          p.target = p.choices[0].target;
          p.decisionAt = s.tick + 5;
        }
      for (const p of s.players) this.move(p);
      const owner = s.players.find((p) => p.id === s.ball.owner);
      if (owner) {
        s.ball.pos = { ...owner.pos };
        owner.control = clamp(owner.control + DT * (0.4 + owner.attributes.firstTouch * 0.005));
        this.challenge(owner);
        if (
          s.ball.owner === owner.id &&
          s.time - owner.possessionSince > 1.2 + (100 - s.teams[owner.team].tactics.tempo) * 0.045
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
    const movementTarget = separatedTarget(s, p, p.target);
    const dx = planting ? 0 : movementTarget.x - p.pos.x,
      dy = planting ? 0 : movementTarget.y - p.pos.y,
      d = Math.hypot(dx, dy);
    const effort =
      p.action === 'press' || p.action === 'run' || p.action === 'recover' || p.keeper ? 1 : 0.5;
    const speed =
      (4.0 + p.attributes.pace * 0.035) *
      (0.65 + p.energy * 0.35) *
      effort *
      (s.ball.owner === p.id ? 0.82 : 1);
    const desired = {
      x: d > 0.05 ? (dx / d) * Math.min(speed, d * 1.8) : 0,
      y: d > 0.05 ? (dy / d) * Math.min(speed, d * 1.8) : 0,
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
    const actualSpeed = travelled / DT;
    const drain =
      travelled * (0.000018 + (100 - p.attributes.stamina) * 0.00000024) +
      DT * Math.max(0, actualSpeed - 3) ** 2 * 0.000018 +
      (p.action === 'press' ? DT * 0.00013 : 0);
    p.energy = clamp(p.energy - drain + (actualSpeed < 0.5 ? DT * 0.000014 : 0), 0.15, 1);
  }
  private challenge(owner: Player) {
    const s = this.state;
    if (s.time - owner.possessionSince < 0.7) return;
    const challengers = s.players
      .filter(
        (p) =>
          p.team !== owner.team &&
          s.tick >= p.challengeAt &&
          s.tick >= p.regainAt &&
          distance(p.pos, owner.pos) < (p.keeper ? 2.2 : 1.65),
      )
      .sort((a, b) => distance(a.pos, owner.pos) - distance(b.pos, owner.pos));
    for (const p of challengers) {
      const dx = p.pos.x - owner.pos.x,
        dy = p.pos.y - owner.pos.y,
        d = Math.hypot(dx, dy) || 1;
      const approach = (Math.cos(owner.facing) * dx + Math.sin(owner.facing) * dy) / d;
      const relativeSpeed = Math.hypot(
        p.velocity.x - owner.velocity.x,
        p.velocity.y - owner.velocity.y,
      );
      const timing = clamp(1 - relativeSpeed / 12, 0.15, 1);
      const exposed = 1 - owner.control;
      const hazard =
        (0.05 + p.attributes.aggression * 0.001 + exposed * 0.4) *
        timing *
        (approach < -0.4 ? 0.4 : 1);
      if (this.random.next() > hazard * DT) continue;
      p.challengeAt = s.tick + 28;
      record(s, { kind: 'tackleAttempt', team: p.team, player: p.id, target: owner.id });
      const skill = p.keeper
        ? (p.attributes.reflexes + p.attributes.handling) / 2
        : p.attributes.tackling;
      const win = clamp(
        0.42 +
          (skill - owner.attributes.dribbling) * 0.006 +
          exposed * 0.3 +
          approach * 0.08 +
          timing * 0.12,
        0.08,
        0.88,
      );
      if (this.random.next() < win) {
        owner.regainAt = s.tick + 22;
        owner.challengeAt = s.tick + 22;
        record(s, { kind: 'tackle', team: p.team, player: p.id, target: owner.id });
        this.giveBall(p);
        p.control = 0.55;
        return;
      }
    }
  }
  private execute(p: Player) {
    const c = p.choices[0];
    if (!c || c.action === 'dribble' || !['pass', 'shoot'].includes(c.action)) return;
    const s = this.state,
      shot = c.action === 'shoot';
    const stress = pressure(s, p),
      chance = shot ? shotOpportunity(s, p) : null;
    const receiver = s.players.find((q) => q.id === c.receiver);
    const option = !shot && receiver ? passOption(s, p, receiver) : null;
    let target = option ? { ...option.target } : { ...c.target };
    if (shot) {
      target.x = direction(p.team, s.half) === 1 ? 106 : -1;
      const keeper = chance!.keeper;
      // Aim away from goalkeeper, then apply angular execution error, increasing with range/pressure.
      const side =
        Math.abs(keeper.pos.y - 34) > 0.5 ? Math.sign(34 - keeper.pos.y) : p.number % 2 ? 1 : -1;
      const aim = 34 + side * 2.3;
      const angularError =
        0.045 +
        (100 - p.attributes.finishing) * 0.002 +
        stress * (100 - p.attributes.composure) * 0.0015;
      target.y = aim + this.random.normal() * angularError * chance!.distance;
    } else if (option) {
      const angle = Math.atan2(target.y - p.pos.y, target.x - p.pos.x);
      const error =
        (0.003 + (200 - p.attributes.passing - p.attributes.technique) * 0.00016) *
        (1 + option.difficulty + stress);
      const theta = angle + this.random.signed() * error;
      const length =
        distance(p.pos, target) * (1 + this.random.signed() * 0.018 * (1 + option.difficulty));
      target = { x: p.pos.x + Math.cos(theta) * length, y: p.pos.y + Math.sin(theta) * length };
    }
    const dx = target.x - p.pos.x,
      dy = target.y - p.pos.y,
      d = Math.hypot(dx, dy) || 1;
    const speed = shot ? 19 + p.attributes.shotPower * 0.13 : (option?.speed ?? 16);
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
        eventId: s.events.length,
        kicker: p.id,
        team: p.team,
        age: 0,
        intended: c.receiver,
        destination: target,
        difficulty: option?.difficulty,
        xg: chance?.xg,
        onTarget,
      },
    };
    record(s, {
      kind: shot ? 'shot' : 'pass',
      team: p.team,
      player: p.id,
      target: c.receiver,
      onTarget: shot ? onTarget : undefined,
      distance: option?.distance ?? chance?.distance,
      difficulty: option?.difficulty,
      xg: chance?.xg,
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
          segmentDistance(p.pos, old, end) < (p.keeper ? 1.0 + p.attributes.reach * 0.014 : 0.9),
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
          : clamp(0.35 + p.attributes.awareness * 0.004, 0, 0.8);
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
        clamp(
          0.83 +
            p.attributes.firstTouch * 0.0017 -
            Math.max(0, speed - 18) * 0.01 -
            pressure(s, p) * 0.1 -
            (b.flight?.difficulty ?? 0.2) * 0.045,
          0.45,
          0.985,
        )
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
          record(s, {
            kind: 'passComplete',
            team: p.team,
            player: b.flight.kicker,
            target: p.id,
            relatedEvent: b.flight.eventId,
          });
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
    const friction = b.flight?.kind === 'shot' ? 0.997 : 0.992;
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
