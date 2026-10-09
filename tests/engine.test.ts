import { describe, expect, it } from 'vitest';
import { Match } from '../src/engine/match';
import { createTeams } from '../src/data/teams';
import { anchor, direction, localX } from '../src/engine/tactics';
import { evaluate } from '../src/engine/decisions';
import { distance, Random } from '../src/engine/math';
import type { MatchState, TeamId } from '../src/engine/types';
function finish(m: Match) {
  m.start();
  m.step(27000);
  expect(m.state.phase).toBe('halfTime');
  m.resumeHalf();
  m.step(27000);
  return m.state;
}
function invariant(s: MatchState) {
  expect(s.players).toHaveLength(22);
  const b = s.ball;
  for (const p of s.players) {
    expect(p.pos.x).toBeGreaterThanOrEqual(0);
    expect(p.pos.x).toBeLessThanOrEqual(105);
    expect(p.pos.y).toBeGreaterThanOrEqual(0);
    expect(p.pos.y).toBeLessThanOrEqual(68);
    expect(p.energy).toBeGreaterThanOrEqual(0);
    expect(p.energy).toBeLessThanOrEqual(1);
    expect(Number.isFinite(p.facing)).toBe(true);
  }
  for (const v of [b.pos.x, b.pos.y, b.velocity.x, b.velocity.y])
    expect(Number.isFinite(v)).toBe(true);
  expect(b.pos.x).toBeGreaterThanOrEqual(0);
  expect(b.pos.x).toBeLessThanOrEqual(105);
  expect(b.pos.y).toBeGreaterThanOrEqual(0);
  expect(b.pos.y).toBeLessThanOrEqual(68);
  if (b.owner) {
    expect(b.flight).toBeNull();
    expect(distance(b.pos, s.players.find((p) => p.id === b.owner)!.pos)).toBeLessThan(0.01);
  }
  if (b.flight) expect(b.owner).toBeNull();
  for (const t of s.stats) {
    expect(t.completedPasses).toBeLessThanOrEqual(t.passes);
    expect(t.shotsOnTarget).toBeLessThanOrEqual(t.shots);
  }
}
describe('deterministic match lifecycle', () => {
  it('repeats a complete match including all events and player state', () => {
    const a = finish(new Match(createTeams(), 19)),
      b = finish(new Match(createTeams(), 19));
    expect(a).toEqual(b);
    expect(a.time).toBe(5400);
    expect(a.phase).toBe('finished');
    expect(a.events.at(-1)?.kind).toBe('fullTime');
  }, 20000);
  it('different seeds alter execution, never precompute a score', () => {
    const a = new Match(createTeams(), 1),
      b = new Match(createTeams(), 2);
    expect(a.state.stats.map((t) => t.goals)).toEqual([0, 0]);
    a.start();
    b.start();
    a.step(1500);
    b.step(1500);
    expect(a.state).not.toEqual(b.state);
  });
  it('freezes at halftime, changes ends and applies second-half tactics', () => {
    const a = new Match(createTeams(), 5),
      b = new Match(createTeams(), 5);
    a.start();
    b.start();
    a.step(27000);
    b.step(27000);
    const snap = a.snapshot();
    a.step(100);
    expect(a.state).toEqual(snap);
    a.setTactics(0, { ...a.state.teams[0].tactics, pressing: 100, width: 100, line: 85 });
    a.resumeHalf();
    b.resumeHalf();
    expect(direction(0, a.state.half)).toBe(-1);
    a.step(1200);
    b.step(1200);
    expect(a.state.players.map((p) => p.pos)).not.toEqual(b.state.players.map((p) => p.pos));
  }, 15000);
  it('is independent of batching and does not mutate caller configuration or snapshots', () => {
    const teams = createTeams(),
      copy = structuredClone(teams),
      a = new Match(teams, 4),
      b = new Match(teams, 4);
    a.start();
    b.start();
    a.step(500);
    for (let i = 0; i < 50; i++) b.step(10);
    expect(a.state).toEqual(b.state);
    expect(teams).toEqual(copy);
    const snap = a.snapshot();
    snap.players[0].pos.x = -10;
    expect(a.state.players[0].pos.x).toBeGreaterThanOrEqual(0);
  });
  it('rejects invalid configuration and live tactical edits', () => {
    expect(() => new Match(createTeams(), NaN)).toThrow();
    const teams = createTeams();
    teams[0].players[1].id = teams[0].players[0].id;
    expect(() => new Match(teams)).toThrow();
    const m = new Match(createTeams());
    expect(() => m.setTactics(0, { ...m.state.teams[0].tactics, line: 101 })).toThrow();
    m.start();
    expect(() => m.setTactics(0, m.state.teams[0].tactics)).toThrow();
    expect(() => m.step(Infinity)).toThrow();
  });
});
describe('invariants and event accounting', () => {
  it.each([3, 17, 41])(
    'preserves every tick through a full game (seed %i)',
    (seed) => {
      const m = new Match(createTeams(), seed);
      m.start();
      // Check numerical/ownership invariants every tick, full assertions every 100 ticks.
      for (let i = 0; i < 54000; i++) {
        if (m.state.phase === 'halfTime') m.resumeHalf();
        m.step();
        const s = m.state;
        if (
          s.players.some(
            (p) =>
              !Number.isFinite(p.pos.x + p.pos.y + p.energy) ||
              p.pos.x < 0 ||
              p.pos.x > 105 ||
              p.pos.y < 0 ||
              p.pos.y > 68,
          )
        )
          throw new Error(`Player invariant tick ${s.tick}`);
        if (
          s.ball.owner &&
          (s.ball.flight ||
            distance(s.ball.pos, s.players.find((p) => p.id === s.ball.owner)!.pos) > 0.01)
        )
          throw new Error(`Ownership tick ${s.tick}`);
        if (i % 100 === 0) invariant(s);
      }
      const s = m.state;
      invariant(s);
      for (const id of [0, 1] as TeamId[]) {
        const events = s.events.filter((e) => e.team === id);
        for (const [stat, kind] of [
          ['goals', 'goal'],
          ['shots', 'shot'],
          ['passes', 'pass'],
          ['completedPasses', 'passComplete'],
          ['saves', 'save'],
          ['tackles', 'tackle'],
        ] as const)
          expect(s.stats[id][stat]).toBe(events.filter((e) => e.kind === kind).length);
        expect(s.stats[id].shots).toBeGreaterThan(0);
        expect(s.stats[id].completedPasses).toBeGreaterThan(0);
      }
      const end = m.snapshot();
      m.step(100);
      expect(m.state).toEqual(end);
    },
    20000,
  );
});
describe('causal tactical behaviour', () => {
  it('higher line moves defensive anchors upfield and width spreads them, in both halves', () => {
    for (const half of [1, 2] as const) {
      const m = new Match(createTeams());
      m.state.half = half;
      m.state.possession = 1;
      const p = m.state.players[2];
      m.state.teams[0].tactics.line = 10;
      const low = localX(anchor(m.state, p).x, 0, half);
      m.state.teams[0].tactics.line = 90;
      const high = localX(anchor(m.state, p).x, 0, half);
      expect(high - low).toBeGreaterThan(12);
      const winger = m.state.players[8];
      m.state.teams[0].tactics.width = 10;
      const narrow = Math.abs(anchor(m.state, winger).y - 34);
      m.state.teams[0].tactics.width = 90;
      expect(Math.abs(anchor(m.state, winger).y - 34) - narrow).toBeGreaterThan(8);
    }
  });
  it('high press raises pressure utility and commits more agents at the same state', () => {
    const m = new Match(createTeams());
    m.state.possession = 1;
    m.state.ball.pos = { x: 50, y: 34 };
    m.state.ball.owner = '1-6';
    m.state.players.find((p) => p.id === '1-6')!.pos = { x: 50, y: 34 };
    const count = (pressing: number) => {
      m.state.teams[0].tactics.pressing = pressing;
      return m.state.players
        .filter((p) => p.team === 0 && !p.keeper)
        .filter((p) => evaluate(m.state, p)[0].action === 'press').length;
    };
    expect(count(95)).toBeGreaterThan(count(5));
  });
  it('pressing changes actual movement and increases cumulative press workload over paired games', () => {
    let low = 0,
      high = 0;
    for (const seed of [2, 7, 12])
      for (const pressing of [5, 95]) {
        const teams = createTeams();
        teams[0].tactics.pressing = pressing;
        const m = new Match(teams, seed);
        m.start();
        m.step(6000);
        const work = m.state.players
          .filter((p) => p.team === 0)
          .reduce((v, p) => v + m.state.playerStats[p.id].pressSeconds, 0);
        if (pressing === 5) low += work;
        else high += work;
      }
    expect(high).toBeGreaterThan(low * 2);
  }, 15000);
  it.each(['4-3-3', '4-2-3-1', '4-4-2', '3-5-2'] as const)(
    'supports formation %s without invalid positions',
    (formation) => {
      const teams = createTeams();
      teams[0].tactics.formation = formation;
      const m = new Match(teams);
      m.start();
      m.step(1200);
      invariant(m.state);
    },
  );
  it('attributes affect pass, shot and press decisions', () => {
    const m = new Match(createTeams());
    const p = m.state.players[9];
    p.pos = { x: 85, y: 34 };
    m.state.ball.owner = p.id;
    m.state.ball.pos = { ...p.pos };
    p.attributes.finishing = 10;
    const weak = evaluate(m.state, p).find((c) => c.action === 'shoot')!.utility;
    p.attributes.finishing = 95;
    expect(evaluate(m.state, p).find((c) => c.action === 'shoot')!.utility).toBeGreaterThan(weak);
  });
});
describe('ball physics and restarts (controlled fixtures)', () => {
  function fixture() {
    const m = new Match(createTeams(), 9);
    m.start();
    m.state.restart = null;
    for (const p of m.state.players) {
      p.pos = { x: 50, y: 5 + p.number * 2 };
      p.target = { ...p.pos };
      p.decisionAt = 1e9;
    }
    return m;
  }
  it('detects swept goal crossing and awards only after crossing', () => {
    const m = fixture();
    m.state.ball = {
      pos: { x: 104, y: 34 },
      velocity: { x: 30, y: 0 },
      owner: null,
      lastTouch: '0-9',
      flight: { kind: 'shot', kicker: '0-9', team: 0, age: 1, onTarget: true },
    };
    expect(m.state.stats[0].goals).toBe(0);
    m.step();
    expect(m.state.stats[0].goals).toBe(1);
    expect(m.state.restart?.kind).toBe('kickoff');
    expect(m.state.restart?.team).toBe(1);
  });
  it('awards a throw to the opponent of last touch', () => {
    const m = fixture();
    m.state.ball = {
      pos: { x: 40, y: 0.5 },
      velocity: { x: 0, y: -20 },
      owner: null,
      lastTouch: '0-8',
      flight: null,
    };
    m.step();
    expect(m.state.restart).toMatchObject({ kind: 'throwIn', team: 1 });
    m.step(18);
    expect(m.state.ball.owner).toMatch(/^1-/);
    expect(m.state.events.at(-1)?.kind).toBe('throwIn');
  });
  it('resolves goal kick and corner by last touch', () => {
    for (const lastTouch of ['0-8', '1-2']) {
      const m = fixture();
      m.state.ball = {
        pos: { x: 104, y: 20 },
        velocity: { x: 30, y: 0 },
        owner: null,
        lastTouch,
        flight: null,
      };
      m.step();
      expect(m.state.restart?.kind).toBe(lastTouch === '0-8' ? 'goalKick' : 'corner');
    }
  });
  it('a fast pass cannot tunnel through a receiver', () => {
    const m = fixture();
    const p = m.state.players[6];
    p.pos = { x: 30, y: 34 };
    p.target = { ...p.pos };
    p.attributes.firstTouch = 100;
    m.state.ball = {
      pos: { x: 28, y: 34 },
      velocity: { x: 40, y: 0 },
      owner: null,
      lastTouch: '0-5',
      flight: { kind: 'pass', kicker: '0-5', team: 0, age: 1, intended: p.id },
    };
    m.step();
    expect(m.state.ball.owner).toBe(p.id);
    expect(m.state.events.at(-1)?.kind).toBe('passComplete');
  });
  it('goalkeeper physically intercepts a shot on the swept path', () => {
    const m = fixture();
    const p = m.state.players[11];
    p.pos = { x: 103.2, y: 34 };
    p.target = { ...p.pos };
    p.attributes.reflexes = 100;
    p.attributes.handling = 100;
    m.state.ball = {
      pos: { x: 101, y: 34 },
      velocity: { x: 35, y: 0 },
      owner: null,
      lastTouch: '0-9',
      flight: { kind: 'shot', kicker: '0-9', team: 0, age: 1, onTarget: true },
    };
    m.step();
    expect(m.state.events.some((e) => e.kind === 'save')).toBe(true);
    expect(m.state.ball.owner).toBe(p.id);
    expect(m.state.stats[0].goals).toBe(0);
  });
  it('uses the seeded random stream', () => {
    const a = new Random(1),
      b = new Random(1);
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(
      Array.from({ length: 50 }, () => b.next()),
    );
  });
});
describe('restart and role contracts', () => {
  it('keeps both sides in their own half while setting up kickoff', () => {
    const m = new Match(createTeams());
    m.start();
    for (const p of m.state.players) expect(localX(p.pos.x, p.team, 1)).toBeLessThan(52.5);
  });
  it('updates tactical roles when the formation changes', () => {
    const m = new Match(createTeams());
    expect(m.state.players[8].role).toBe('W');
    m.setTactics(0, { ...m.state.teams[0].tactics, formation: '4-2-3-1' });
    expect(m.state.players[8].role).toBe('AM');
  });
  it('line and width instructions change actual positions after movement', () => {
    const run = (line: number, width: number) => {
      const teams = createTeams();
      teams[0].tactics.line = line;
      teams[0].tactics.width = width;
      const m = new Match(teams, 10);
      m.start();
      m.step(150);
      return m.state.players.filter((p) => p.team === 0).map((p) => ({ ...p.pos }));
    };
    expect(run(10, 10)).not.toEqual(run(90, 90));
  });
});
