import { describe, expect, it } from 'vitest';
import { ArcadeMatch, replayArcade } from '../src/arcade/engine/match';
import { practiceChance, resolveShot } from '../src/arcade/engine/shot';
import { STRATEGIES } from '../src/arcade/engine/model';
import type { ShotInput, Side, Strategy } from '../src/arcade/engine/types';
const input: ShotInput = { aim: 0.9, height: 0.2, power: 0.8, timing: 0.5 };
function finish(
  seed = 1,
  home: Strategy = 'high_press',
  away: Strategy = 'compact_counter',
  threshold = 0.3,
  manualInput: ShotInput = input,
) {
  const m = new ArcadeMatch(seed, { chanceThreshold: threshold });
  m.tactic(0, home);
  m.tactic(1, away);
  while (m.state.phase !== 'finished') {
    if (m.state.phase === 'lastResort') {
      m.enterManager(0);
      m.enterManager(1);
    }
    if (m.state.phase === 'manual') m.shoot(m.state.pending!.team, manualInput);
    else {
      m.continue();
      m.advance();
    }
  }
  return m;
}
describe('arcade checkpoints and fair manager opportunities', () => {
  it('repeats all events, command inputs, players and scores and replays input log', () => {
    const a = finish(),
      b = finish();
    expect(a.snapshot()).toEqual(b.snapshot());
    const replay = replayArcade(a.state.seed, a.state.options, a.state.commands, a.state.sequence);
    expect(replay.snapshot()).toEqual(a.snapshot());
  });
  it.each([1, 17, 41])(
    'preserves 11 players, one keeper, legal coordinates and exact event counts seed %i',
    (seed) => {
      const m = new ArcadeMatch(seed);
      let halves = 0,
        unlocks = 0;
      while (m.state.phase !== 'finished') {
        if (m.state.phase === 'halftime') {
          expect(m.state.time).toBe(2700);
          halves++;
        }
        if (m.state.phase === 'lastResort') {
          expect(m.state.time).toBe(4200);
          unlocks++;
          m.enterManager(0);
          m.enterManager(1);
        }
        if (m.state.phase === 'manual') {
          const c = m.state.pending!;
          expect(c.quality).toBeGreaterThanOrEqual(0.3);
          expect(c.practice).toBe(false);
          expect(c.position.x).toBeGreaterThanOrEqual(76);
          m.shoot(c.team, input);
        } else {
          m.continue();
          m.advance();
        }
        for (const t of m.state.teams) {
          expect(t.players).toHaveLength(11);
          expect(t.players.filter((p) => p.profile === 'GK')).toHaveLength(1);
          expect(new Set(t.players.map((p) => p.id)).size).toBe(11);
          expect(t.players.every((p) => p.energy >= 0.2 && p.energy <= 1)).toBe(true);
        }
        for (const p of m.state.last?.motions ?? [])
          for (const pos of [p.from, p.to]) {
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.x).toBeLessThanOrEqual(105);
            expect(pos.y).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeLessThanOrEqual(68);
          }
      }
      expect(halves).toBe(1);
      expect(unlocks).toBe(1);
      expect(m.state.time).toBe(5400);
      for (const team of [0, 1] as Side[]) {
        const st = m.state.stats[team];
        expect(st.goals).toBe(
          m.state.events.filter((e) => e.team === team && e.kind === 'goal').length,
        );
        expect(st.shots).toBe(
          m.state.events.filter((e) => e.team === team && e.kind === 'shot').length,
        );
        expect(st.saves).toBe(
          m.state.events.filter((e) => e.team === team && e.kind === 'save').length,
        );
        expect(st.managerShots).toBeLessThanOrEqual(1);
        expect(st.passes).toBeGreaterThanOrEqual(st.completed);
      }
    },
  );
  it('never skips halftime, unlock or manual windows even in fast stepping', () => {
    const m = new ArcadeMatch(1);
    m.continue();
    while (String(m.state.phase) === 'playing') m.advance();
    expect(m.state.phase).toBe('halftime');
    const half = m.snapshot();
    expect(() => m.advance()).toThrow();
    expect(m.snapshot()).toEqual(half);
    m.continue();
    while (String(m.state.phase) === 'playing') m.advance();
    expect(m.state.phase).toBe('lastResort');
    expect(() => m.advance()).toThrow();
    m.enterManager(0);
    m.enterManager(1);
    m.continue();
    while (String(m.state.phase) === 'playing') m.advance();
    expect(m.state.phase).toBe('manual');
    const visible = m.snapshot();
    expect(() => m.advance()).toThrow();
    expect(m.snapshot()).toEqual(visible);
  });
  it('rejects early entry, keeper substitution, duplicate entry and the wrong shot owner atomically', () => {
    const m = new ArcadeMatch(1);
    expect(() => m.enterManager(0)).toThrow();
    m.continue();
    while (m.state.phase !== 'lastResort') {
      m.continue();
      m.advance();
    }
    expect(m.canEnter(0)).toBe(true);
    expect(m.canEnter(1)).toBe(true);
    const saved = m.snapshot();
    expect(() => m.enterManager(0, '0-0')).toThrow();
    expect(m.snapshot()).toEqual(saved);
    m.enterManager(0);
    m.enterManager(1);
    expect(() => m.enterManager(0)).toThrow();
    expect(() => m.enterManager(1)).toThrow();
    m.continue();
    while (String(m.state.phase) === 'playing') m.advance();
    const pending = m.snapshot();
    expect(() => m.shoot((1 - m.state.pending!.team) as Side, input)).toThrow();
    expect(m.snapshot()).toEqual(pending);
    m.shoot(m.state.pending!.team, input);
    expect(() => m.shoot(0, input)).toThrow();
  });
  it('can legitimately fail to produce any manager shot with an unreachable quality threshold', () => {
    const m = finish(1, 'high_press', 'compact_counter', 1);
    expect(m.state.teams.every((t) => t.used && !t.shotUsed)).toBe(true);
    expect(m.state.stats.map((s) => s.managerShots)).toEqual([0, 0]);
  });
  it('both sides earn real opportunities in seed 1 with explicit miss inputs, without practice injection', () => {
    const m = finish(1, 'high_press', 'compact_counter', 0.3, {
      aim: 1.3,
      height: 1.3,
      power: 1,
      timing: 0.5,
    });
    expect(m.state.stats.map((s) => s.managerShots)).toEqual([1, 1]);
    for (const team of [0, 1]) {
      const c = m.state.events.filter(
        (e) => e.team === team && e.player === `manager-${team}` && e.kind === 'chance',
      );
      expect(c.some((e) => (e.quality ?? 0) >= 0.3)).toBe(true);
    }
  });
  it('tactic changes affect subsequent sequences and are recorded at the actual boundary', () => {
    const a = new ArcadeMatch(20),
      b = new ArcadeMatch(20);
    a.continue();
    b.continue();
    a.advance();
    b.advance();
    const before = a.snapshot();
    a.tactic(0, 'possession');
    expect(a.state.time).toBe(before.time);
    expect(a.state.last).toEqual(before.last);
    for (let i = 0; i < 12; i++) {
      a.advance();
      b.advance();
    }
    expect(a.state.events).not.toEqual(b.state.events);
    expect(a.state.stats).not.toEqual(b.state.stats);
  });
});
describe('physical manual shot', () => {
  it('identical controls and situation have identical physics for either side', () => {
    expect(resolveShot(practiceChance(10, 0), input)).toEqual(
      resolveShot(practiceChance(10, 1), input),
    );
  });
  it('uses target, height, speed and timing without a goal lottery', () => {
    const c = practiceChance(1),
      r = resolveShot(c, input);
    expect(resolveShot(c, input)).toEqual(r);
    expect(resolveShot(c, { ...input, aim: -0.9 }).target.y).not.toBe(r.target.y);
    expect(resolveShot(c, { ...input, height: 1.3, power: 1 }).outcome).toBe('over');
    expect(resolveShot(c, { ...input, aim: 1.3, timing: 0.9 }).outcome).toBe('wide');
    expect(resolveShot(c, { ...input, power: 0.3 }).velocity).toBeLessThan(r.velocity);
    expect(resolveShot(c, { ...input, timing: 0.9 }).timingError).toBeGreaterThan(r.timingError);
    expect(r.path.at(-1)!.x).toBe(r.target.x);
    expect(r.path.at(-1)!.t).toBeCloseTo(r.flightTime);
  });
  it('timing rewards skill across 100 same-seed attempts; high power and corners are not unbeatable', () => {
    const counts = (change: Partial<ShotInput>) =>
      Array.from(
        { length: 100 },
        (_, n) => resolveShot(practiceChance(n + 1), { ...input, ...change }).outcome,
      );
    const good = counts({}),
      early = counts({ timing: 0.1 }),
      max = counts({ power: 1 });
    expect(good.filter((x) => x === 'goal').length).toBeGreaterThan(
      early.filter((x) => x === 'goal').length,
    );
    expect(good).toContain('goal');
    expect(good).toContain('save');
    expect(good).toContain('wide');
    expect(max.filter((x) => x === 'goal').length).toBeLessThan(
      good.filter((x) => x === 'goal').length,
    );
  });
  it('keeper reaction/position and defender pressure change execution and interception', () => {
    const c = practiceChance(13),
      r = resolveShot(c, input);
    const slow = resolveShot({ ...c, keeper: { ...c.keeper, reflexes: 10 } }, input);
    expect(slow.reaction).toBeGreaterThan(r.reaction);
    expect(resolveShot({ ...c, keeper: { ...c.keeper, y: 37 } }, input).keeperY).not.toBe(
      r.keeperY,
    );
    expect(resolveShot({ ...c, pressure: 0.9 }, input).target).not.toEqual(
      resolveShot({ ...c, pressure: 0.1 }, input).target,
    );
  });
  it.each([{ power: NaN }, { aim: 2 }, { height: -1 }, { timing: 1.1 }, { power: 0.1 }])(
    'rejects invalid input %j',
    (bad) => {
      expect(() => resolveShot(practiceChance(1), { ...input, ...bad })).toThrow();
    },
  );
});
it('measures tactical tradeoffs over repeated seeds without a universal winner claim', () => {
  const plans = Object.keys(STRATEGIES) as Strategy[],
    rows = plans.flatMap((home) =>
      plans.flatMap((away) =>
        Array.from({ length: 12 }, (_, i) => ({ home, away, m: finish(i + 1, home, away) })),
      ),
    );
  const high = rows.filter((r) => r.home === 'high_press'),
    low = rows.filter((r) => r.home === 'compact_counter'),
    pos = rows.filter((r) => r.home === 'possession');
  const avg = (rs: typeof rows, f: (m: ArcadeMatch) => number) =>
    rs.reduce((n, r) => n + f(r.m), 0) / rs.length;
  expect(avg(high, (m) => m.state.stats[0].pressWins)).toBeGreaterThan(
    avg(low, (m) => m.state.stats[0].pressWins),
  );
  expect(
    avg(high, (m) => m.state.teams[0].players.reduce((n, p) => n + p.energy, 0) / 11),
  ).toBeLessThan(avg(low, (m) => m.state.teams[0].players.reduce((n, p) => n + p.energy, 0) / 11));
  expect(avg(pos, (m) => m.state.stats[0].completed / m.state.stats[0].passes)).toBeGreaterThan(
    avg(low, (m) => m.state.stats[0].completed / m.state.stats[0].passes),
  );
  expect(
    avg(
      high,
      (m) => m.state.stats[0].recoveryX.reduce((n, x) => n + x, 0) / m.state.stats[0].recoveries,
    ),
  ).toBeGreaterThan(
    avg(
      low,
      (m) => m.state.stats[0].recoveryX.reduce((n, x) => n + x, 0) / m.state.stats[0].recoveries,
    ),
  );
  for (const plan of plans)
    expect(
      rows.some((r) => r.home === plan && r.m.state.stats[0].goals < r.m.state.stats[1].goals),
    ).toBe(true);
  expect(avg(pos, (m) => m.state.stats[0].quality / m.state.stats[0].chances)).not.toBeCloseTo(
    avg(low, (m) => m.state.stats[0].quality / m.state.stats[0].chances),
    3,
  );
});
