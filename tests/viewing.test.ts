import { expect, it } from 'vitest';
import { Match } from '../src/engine/match';
import { createTeams } from '../src/data/teams';
import { MatchDirector } from '../src/viewing/director';
import { TacticalDraft } from '../src/viewing/draft';
import { replayMatch } from '../src/engine/replay';
import { highlightReason, type ViewMode } from '../src/viewing/highlights';
import { summarize } from '../src/viewing/analysis';

it('checkpoints include RNG and preserve independent in-flight futures', () => {
  const m = new Match(createTeams(), 17);
  m.start();
  m.step(1537);
  const saved = m.checkpoint(),
    restored = Match.restore(saved);
  m.step(300);
  restored.step(300);
  expect(restored.snapshot()).toEqual(m.snapshot());
  expect(saved.state.tick).toBe(1537);
});
it('draft edits are isolated, coalesced, atomic, replayable and announced once', () => {
  const m = new Match(createTeams());
  m.start();
  m.step(100);
  m.pause();
  const d = new TacticalDraft(m.checkpoint());
  for (let pressing = 10; pressing <= 90; pressing += 10)
    d.edit({ kind: 'tactics', team: 0, tactics: { ...m.state.teams[0].tactics, pressing } });
  d.edit({
    kind: 'assignment',
    team: 0,
    player: '0-9',
    slot: 9,
    roleId: 'falseNine',
    duty: 'support',
  });
  expect(d.commands).toHaveLength(2);
  expect(m.state.commands).toHaveLength(0);
  const before = m.snapshot();
  expect(() =>
    m.command({
      kind: 'batch',
      commands: [
        d.commands[0],
        {
          kind: 'assignment',
          team: 0,
          player: 'missing',
          slot: 9,
          roleId: 'falseNine',
          duty: 'support',
        },
      ],
    }),
  ).toThrow();
  expect(m.snapshot()).toEqual(before);
  m.command({ kind: 'batch', commands: d.commands });
  expect(m.state.commands).toHaveLength(1);
  expect(m.state.events.filter((e) => e.kind === 'tactics')).toHaveLength(1);
  expect(m.state.players.map((p) => p.pos)).toEqual(before.players.map((p) => p.pos));
  m.resume();
  m.step(200);
  expect(replayMatch(m.state.initialTeams, m.state.seed, m.state.commands, 300).snapshot()).toEqual(
    m.snapshot(),
  );
});
it('an intervention during a clip invalidates unseen future and resumes the visible state', () => {
  const d = new MatchDirector(new Match(createTeams(), 2026));
  d.start();
  for (let i = 0; i < 3000 && d.status !== 'clip'; i++) d.advance(0.1, 80);
  expect(d.status).toBe('clip');
  expect(d.engine.state.tick).toBeGreaterThan(d.state.tick);
  const visible = d.current;
  d.pause();
  expect(d.bufferedFrames).toBe(0);
  expect(d.observations.every((row) => row.tick <= visible.state.tick)).toBe(true);
  expect(d.regains.every((row) => row.tick <= visible.state.tick)).toBe(true);
  expect(d.engine.state.tick).toBe(visible.state.tick);
  expect(d.state.players).toEqual(visible.state.players);
  expect(d.state.events.every((e) => e.tick <= d.state.tick)).toBe(true);
  const commands = [
    {
      kind: 'tactics' as const,
      team: 0 as const,
      tactics: { ...d.state.teams[0].tactics, pressing: 95, width: 90 },
    },
  ];
  d.apply(commands);
  d.setMode('quick');
  d.start();
  d.advance(1, 100);
  const reference = Match.restore(visible);
  reference.pause();
  reference.command({ kind: 'batch', commands });
  reference.resume();
  reference.step(100);
  expect(d.state).toEqual(reference.snapshot());
  const unchanged = Match.restore(visible);
  unchanged.step(100);
  expect(d.state.players.map((p) => p.target)).not.toEqual(
    unchanged.state.players.map((p) => p.target),
  );
});
it('all modes preserve the same full match, commands, boundaries and synchronized snapshots', async () => {
  const states = [];
  for (const mode of ['key', 'extended', 'full', 'quick'] as ViewMode[]) {
    const d = new MatchDirector(new Match(createTeams(), 41));
    d.mode = mode;
    d.speed = 4;
    d.start();
    let half = false,
      iterations = 0,
      previous = 0;
    while (d.state.phase !== 'finished' && iterations++ < 30000) {
      if (d.state.phase === 'halfTime') {
        expect(d.state.tick).toBe(27000);
        expect(half).toBe(false);
        half = true;
        d.apply([
          { kind: 'tactics', team: 0, tactics: { ...d.state.teams[0].tactics, pressing: 80 } },
        ]);
        d.start();
      }
      d.advance(10, 200);
      expect(d.state.tick).toBeGreaterThanOrEqual(previous);
      previous = d.state.tick;
      expect(d.state.time).toBeCloseTo(d.state.tick * 0.1, 6);
      expect(d.state.events.at(-1)?.tick ?? 0).toBeLessThanOrEqual(d.state.tick);
      expect(d.state.stats[0].goals).toBe(
        d.state.events.filter((e) => e.kind === 'goal' && e.team === 0).length,
      );
      expect(d.bufferedFrames).toBeLessThan(400);
    }
    expect(half).toBe(true);
    expect(d.state.phase).toBe('finished');
    expect(d.state.tick).toBe(54000);
    states.push(d.state);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(summarize(d.observations, 0, 0, 54000).seconds).toBeGreaterThan(1000);
  }
  for (const state of states.slice(1)) expect(state).toEqual(states[0]);
}, 180000);
it('selectors use observed saves, chances and attacking organization, not invented goals', () => {
  const m = new Match(createTeams());
  const s = m.state;
  expect(highlightReason(s, [], 'key')).toBeNull();
  for (const kind of ['goal', 'save', 'shot'] as const)
    expect(highlightReason(s, [{ id: 0, tick: 0, time: 0, kind, xg: 0.3 }], 'key')).toBeTruthy();
  s.ball.pos.x = 90;
  s.possessionChangedAt = 62;
  s.time = 63;
  s.tick = 630;
  expect(highlightReason(s, [], 'extended')).toBe('Hızlı hücum');
});

it('even a goal at a clip boundary is displayed and held without advancing the visible clock', () => {
  const m = new Match(createTeams());
  m.start();
  m.state.restart = null;
  for (const p of m.state.players) {
    p.pos = { x: 20, y: 10 };
    p.target = { ...p.pos };
    p.decisionAt = 1e9;
  }
  m.state.ball = {
    pos: { x: 104.99, y: 34 },
    velocity: { x: 20, y: 0 },
    owner: null,
    lastTouch: '0-9',
    flight: { kind: 'shot', kicker: '0-9', team: 0, age: 0, onTarget: true },
  };
  const d = new MatchDirector(m);
  d.advance(10, 100);
  d.advance(10, 100);
  expect(d.state.stats[0].goals).toBe(1);
  expect(d.status).toBe('clip');
  const tick = d.state.tick;
  d.advance(0.4, 100);
  expect(d.state.tick).toBe(tick);
  d.pause();
  expect(d.engine.state.tick).toBe(tick);
  expect(d.state.stats[0].goals).toBe(1);
});

it('draft position swaps retain displaced players when the same player moves twice', () => {
  const m = new Match(createTeams());
  const draft = new TacticalDraft(m.checkpoint());
  const first = {
    kind: 'assignment' as const,
    team: 0 as const,
    player: '0-9',
    slot: 8,
    roleId: 'winger' as const,
    duty: 'support' as const,
  };
  const second = {
    kind: 'assignment' as const,
    team: 0 as const,
    player: '0-9',
    slot: 10,
    roleId: 'winger' as const,
    duty: 'support' as const,
  };
  draft.edit(first);
  draft.edit(second);
  const reference = Match.restore(m.checkpoint());
  reference.command(first);
  reference.command(second);
  expect(draft.commands).toHaveLength(2);
  expect(draft.preview.state.players).toEqual(reference.state.players);
});
