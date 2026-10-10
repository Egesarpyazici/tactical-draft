import {
  clamp,
  emptyStats,
  lineups,
  managerSkills,
  STRATEGIES,
  Stream,
  tacticalPosition,
} from './model';
import { resolveShot, validateInput } from './shot';
import type {
  ArcadeCommand,
  ArcadeEvent,
  ArcadeOptions,
  ArcadeState,
  Chance,
  Footballer,
  Motion,
  Point,
  Sequence,
  ShotInput,
  Side,
  Strategy,
} from './types';
const other = (t: Side) => (1 - t) as Side;
const world = (p: Point, t: Side): Point => ({ x: t === 0 ? p.x : 105 - p.x, y: p.y });
export const defaults: ArcadeOptions = {
  unlockMinute: 70,
  chanceThreshold: 0.3,
  managerNames: ['Ege Arslan', 'Mira Deniz'],
};
export class ArcadeMatch {
  readonly state: ArcadeState;
  private rng: Stream;
  constructor(seed = 2026, options: Partial<ArcadeOptions> = {}) {
    const o = { ...defaults, ...structuredClone(options) };
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
      throw new Error('Tohum uint32 olmalı');
    if (
      !Number.isFinite(o.unlockMinute) ||
      o.unlockMinute < 46 ||
      o.unlockMinute > 89 ||
      !Number.isFinite(o.chanceThreshold) ||
      o.chanceThreshold < 0 ||
      o.chanceThreshold > 1 ||
      o.managerNames.length !== 2 ||
      o.managerNames.some((n) => !n.trim() || n.length > 32)
    )
      throw new Error('Geçersiz maç ayarı');
    this.rng = new Stream(seed);
    this.state = {
      seed,
      time: 0,
      sequence: 0,
      phase: 'ready',
      teams: lineups(o.managerNames),
      possession: this.rng.next() < 0.5 ? 0 : 1,
      ball: { x: 52.5, y: 34 },
      stats: [emptyStats(), emptyStats()],
      events: [],
      commands: [],
      pending: null,
      last: null,
      options: o,
      unlocked: false,
      halfPassed: false,
    };
  }
  snapshot() {
    return structuredClone(this.state);
  }
  private emit(
    team: Side,
    kind: ArcadeEvent['kind'],
    text: string,
    extra: Partial<ArcadeEvent> = {},
  ) {
    const s = this.state;
    s.events.push({
      ...extra,
      id: s.events.length,
      time: s.time,
      sequence: s.sequence,
      team,
      kind,
      text,
    });
  }
  private team(t: Side) {
    if (t !== 0 && t !== 1) throw new Error('Geçersiz takım');
    return this.state.teams[t];
  }
  private log(
    c:
      | Omit<Extract<ArcadeCommand, { kind: 'tactic' }>, 'time' | 'sequence'>
      | Omit<Extract<ArcadeCommand, { kind: 'manager' }>, 'time' | 'sequence'>
      | Omit<Extract<ArcadeCommand, { kind: 'shot' }>, 'time' | 'sequence'>,
  ) {
    this.state.commands.push({
      ...structuredClone(c),
      sequence: this.state.sequence,
      time: this.state.time,
    } as ArcadeCommand);
  }
  continue() {
    if (['ready', 'halftime', 'lastResort'].includes(this.state.phase))
      this.state.phase = 'playing';
  }
  tactic(team: Side, strategy: Strategy) {
    this.team(team);
    if (!Object.hasOwn(STRATEGIES, strategy) || ['manual', 'finished'].includes(this.state.phase))
      throw new Error('Taktik şu anda değiştirilemez');
    if (this.state.teams[team].strategy === strategy) return;
    this.state.teams[team].strategy = strategy;
    this.log({ kind: 'tactic', team, strategy });
    this.emit(team, 'tactic', `${STRATEGIES[strategy].name} planı uygulandı.`);
  }
  canEnter(team: Side) {
    const t = this.team(team);
    return (
      this.state.time >= this.state.options.unlockMinute * 60 &&
      !t.used &&
      !['manual', 'finished', 'ready'].includes(this.state.phase)
    );
  }
  enterManager(team: Side, playerId?: string) {
    if (!this.canEnter(team)) throw new Error('Son Çare kullanılamaz');
    const t = this.team(team),
      p =
        t.players.find((p) => p.id === playerId) ??
        (playerId ? undefined : t.players.find((p) => p.profile === 'ST'));
    if (!p || p.profile === 'GK') throw new Error('Bir saha oyuncusu seçilmeli');
    const replacement: Footballer = {
      id: `manager-${team}`,
      name: t.managerName,
      number: 99,
      profile: 'ST',
      manager: true,
      energy: 0.85,
      skills: { ...managerSkills },
    };
    t.players[t.players.indexOf(p)] = replacement;
    t.used = true;
    const motion = this.state.last?.motions.find((m) => m.id === p.id);
    if (motion) Object.assign(motion, { id: replacement.id, manager: true, number: 99 });
    this.log({ kind: 'manager', team, player: p.id });
    this.emit(team, 'manager', `${p.name} çıktı; ${replacement.name} Son Çare için sahada.`, {
      player: replacement.id,
    });
  }
  private pose(team: Side, index: number, ball: Point): Point {
    return tacticalPosition(this.state.teams[team], team, index, ball, this.state.possession);
  }
  advance(): Sequence {
    const s = this.state;
    if (s.phase !== 'playing') throw new Error('Kullanıcı karar penceresi atlanamaz');
    const start = s.time,
      team = s.possession,
      def = other(team),
      a = s.teams[team],
      d = s.teams[def],
      ap = STRATEGIES[a.strategy],
      dp = STRATEGIES[d.strategy];
    const boundary = !s.halfPassed ? 2700 : !s.unlocked ? s.options.unlockMinute * 60 : 5400;
    const duration = Math.min(48 + Math.floor(this.rng.next() * 29), boundary - start);
    s.sequence++;
    s.time += duration;
    const motions: Motion[] = s.teams.flatMap((t, ti) =>
      t.players.map((p, i) => ({
        id: p.id,
        team: ti as Side,
        from: {
          ...(s.last?.motions.find((m) => m.id === p.id)?.to ?? this.pose(ti as Side, i, s.ball)),
        },
        to: this.pose(ti as Side, i, s.ball),
        keeper: p.profile === 'GK',
        manager: p.manager,
        number: p.number,
      })),
    );
    const seq: Sequence = {
      id: s.sequence,
      start,
      end: s.time,
      team,
      title: 'Hücum kuruluyor',
      reasons: [],
      motions,
      ball: [{ ...s.ball }],
    };
    s.last = seq;
    const avg = (ps: Footballer[], key: keyof Footballer['skills']) =>
      ps.reduce((sum, p) => sum + p.skills[key] * (0.55 + 0.45 * p.energy), 0) / ps.length;
    for (const t of s.teams)
      for (const p of t.players) {
        const plan = STRATEGIES[t.strategy];
        p.energy = clamp(
          p.energy -
            (duration / 5400) *
              (0.12 + plan.press * 0.3 + plan.transition * 0.07) *
              (1.4 - p.skills.stamina / 130),
          0.2,
          1,
        );
      }
    const defense = avg(
      d.players.filter((p) => p.profile !== 'GK'),
      'defending',
    );
    const support = avg(
      a.players.filter((p) => p.profile === 'MID'),
      'passing',
    );
    let local = world(s.ball, team),
      passed = 0,
      turned = false;
    this.emit(team, 'possession', `${a.short} topa sahip; ${STRATEGIES[a.strategy].name}.`, {
      point: { ...s.ball },
    });
    const channel = Math.floor(this.rng.next() * 3),
      lane = [15, 34, 53][channel] + this.rng.signed() * 5;
    const fatigue = d.players.reduce((n, p) => n + p.energy, 0) / 11;
    const press = clamp(
      dp.press * (0.55 + defense / 130) * fatigue * (0.45 + Math.max(0, dp.line - local.x) / 70),
    );
    const exposed =
      (dp.line * (1 - press) * ap.transition * (0.5 + avg(a.players, 'pace') / 130)) / 5;
    const depthLimit = clamp(86 + avg(a.players, 'movement') * 0.1 + exposed * 0.25, 88, 96);
    for (let n = 0; n < ap.passes && local.x < 88; n++) {
      const candidates = a.players.filter((p) => p.profile !== 'GK');
      const passer = candidates[Math.floor(this.rng.next() * candidates.length)];
      const length = ap.length * (0.8 + this.rng.next() * 0.4);
      const localPress = press * Math.exp(-passed * (0.18 + support / 300));
      const control = clamp(
        0.66 +
          passer.skills.passing * 0.003 +
          support * 0.001 -
          localPress * 0.24 -
          length * 0.004 -
          (length / 80) * clamp((70 - dp.line) / 70) * 0.18 -
          (1 - passer.energy) * 0.13,
        0.22,
        0.96,
      );
      s.stats[team].passes++;
      if (this.rng.next() > control) {
        turned = true;
        s.possession = def;
        s.stats[def].recoveries++;
        s.stats[def].recoveryX.push(105 - local.x);
        if (localPress > 0.4) s.stats[def].pressWins++;
        seq.title = localPress > 0.4 ? 'Baskı topu kazandırdı' : 'Pas koridoru kapandı';
        seq.reasons.push(
          `Baskı ${Math.round(localPress * 100)}/100; pas mesafesi ${Math.round(length)} m.`,
          'Top kazanımından sonra yeni sahiplik yönü değişti.',
        );
        this.emit(def, 'recovery', seq.title, { point: world(local, team) });
        break;
      }
      s.stats[team].completed++;
      passed++;
      const prev = local.x;
      local = {
        x: clamp(local.x + length * 0.62 + exposed / ap.passes, 5, depthLimit),
        y: clamp(lane + this.rng.signed() * 4, 4, 64),
      };
      seq.ball.push(world(local, team));
      this.emit(team, 'buildup', `${passer.name}: ${Math.round(length)} m pas bağlantısı.`, {
        player: passer.id,
        point: world(local, team),
      });
      if (prev < 70 && local.x >= 70) {
        s.stats[team].entries++;
        this.emit(team, 'entry', 'Son üçte bire giriş.', { point: world(local, team) });
      }
    }
    s.ball = world(local, team);
    if (!turned) {
      if (press > 0.45 && passed >= 2) {
        seq.reasons.push('İlk baskı pas bağlantılarıyla aşıldı.');
        this.emit(team, 'escape', 'Baskıdan çıkış.');
      }
      const frontline = a.players.filter(
        (p) => ['ST', 'W', 'MID'].includes(p.profile) && !(p.manager && a.shotUsed),
      );
      const weights = frontline.map(
        (p) =>
          (((p.profile === 'ST' ? 3 : p.profile === 'W' ? 1.8 : 0.6) * p.skills.movement) / 65) *
          (0.5 + p.energy * 0.5),
      );
      let draw = this.rng.next() * weights.reduce((n, v) => n + v, 0),
        shooter = frontline[0];
      for (let i = 0; i < frontline.length; i++) {
        draw -= weights[i];
        if (draw <= 0) {
          shooter = frontline[i];
          break;
        }
      }
      const compactness = (60 - dp.width) / 65;
      const pressure = clamp(
        0.2 + defense / 180 + compactness * 0.4 - exposed / 30 - this.rng.next() * 0.23,
        0.08,
        0.95,
      );
      const quality = clamp(
        (local.x - 57) / 52 -
          Math.abs(local.y - 34) / 90 -
          pressure * 0.18 +
          shooter.skills.movement / 450,
        0.02,
        0.95,
      );
      if (local.x >= 76 && quality >= 0.16) {
        s.stats[team].chances++;
        s.stats[team].quality += quality;
        s.stats[team].pressure += pressure;
        s.stats[team].channels[channel]++;
        this.emit(team, 'chance', `${shooter.name} şut bölgesine koştu.`, {
          player: shooter.id,
          point: { ...s.ball },
          quality,
        });
        seq.title = 'Şut fırsatı';
        seq.reasons.push(
          `Mesafe ${Math.round(105 - local.x)} m · baskı ${Math.round(pressure * 100)}/100.`,
          dp.line > 60
            ? 'Yüksek hattın arkasındaki alan değerlendirildi.'
            : 'Yerleşik savunma şut açısını daraltıyor.',
        );
        const keeper = d.players.find((p) => p.profile === 'GK')!;
        const c: Chance = {
          id: s.sequence,
          team,
          shooter: shooter.id,
          position: { ...local },
          quality,
          pressure,
          skills: { ...shooter.skills },
          energy: shooter.energy,
          keeper: {
            y: clamp(
              34 + ((local.y - 34) * 2) / Math.max(8, 105 - local.x) + this.rng.signed() * 0.5,
              31.5,
              36.5,
            ),
            reflexes: keeper.skills.reflexes,
            pace: keeper.skills.pace,
          },
          noise: [this.rng.signed(), this.rng.signed()],
          practice: false,
        };
        const motion = seq.motions.find((m) => m.id === shooter.id)!;
        motion.to = { ...s.ball };
        if (shooter.manager) {
          if (this.canShoot(c)) {
            s.pending = c;
            s.phase = 'manual';
            seq.title = 'Son Çare · Kazanılmış şut';
          } else {
            seq.title = 'Yönetici pas desteğine döndü';
            seq.reasons.push(
              'Fırsat manuel şut eşiğinin altında. Gol veya şut hakkı garanti değildir.',
            );
          }
        } else {
          const input: ShotInput = {
            aim: (this.rng.next() < 0.5 ? -1 : 1) * (0.65 + this.rng.next() * 0.38),
            height: 0.15 + this.rng.next() * 0.4,
            power: 0.58 + this.rng.next() * 0.32,
            timing: clamp(0.5 + this.rng.signed() * (0.36 - shooter.skills.composure / 400)),
          };
          this.finishShot(c, input, false);
        }
      } else {
        seq.title = 'Hücum bağlantısı';
        seq.reasons.push('Yeterli şut açısı oluşmadı; top yeniden dolaştırılıyor.');
      }
      if (s.phase !== 'manual' && !seq.shot) {
        s.possession = team;
        s.ball = world(local, team);
      }
    }
    for (const motion of motions) {
      if (
        motion.id === s.pending?.shooter ||
        motion.id === seq.shot?.chance.shooter ||
        (seq.shot && motion.keeper && motion.team !== team)
      )
        continue;
      const t = s.teams[motion.team],
        index = t.players.findIndex((p) => p.id === motion.id);
      motion.to = this.pose(motion.team, index, s.ball);
    }
    if (!seq.reasons.length)
      seq.reasons.push(
        `Tamamlanan bağlantı: ${passed}; seçilen koridor: ${['üst', 'merkez', 'alt'][channel]}.`,
      );
    this.boundary();
    return structuredClone(seq);
  }
  canShoot(c: Chance) {
    const t = this.team(c.team);
    return (
      !c.practice &&
      t.used &&
      !t.shotUsed &&
      t.players.some((p) => p.id === c.shooter && p.manager) &&
      c.quality >= this.state.options.chanceThreshold &&
      c.position.x >= 76
    );
  }
  shoot(team: Side, input: ShotInput) {
    this.team(team);
    validateInput(input);
    const s = this.state,
      c = s.pending;
    if (s.phase !== 'manual' || !c || c.team !== team || !this.canShoot(c))
      throw new Error('Bu takım için kazanılmış şut yok');
    this.log({ kind: 'shot', team, input });
    s.teams[team].shotUsed = true;
    this.finishShot(c, input, true);
    s.pending = null;
    s.phase = 'playing';
    this.boundary();
    return structuredClone(s.last!);
  }
  private finishShot(c: Chance, input: ShotInput, manual: boolean) {
    const s = this.state,
      result = resolveShot(c, input),
      t = s.stats[c.team],
      op = s.stats[other(c.team)];
    t.shots++;
    if (manual) t.managerShots++;
    this.emit(c.team, 'shot', manual ? 'Yönetici manuel şutunu kullandı.' : 'Şut çekildi.', {
      player: c.shooter,
      quality: c.quality,
      point: world(c.position, c.team),
    });
    if (result.outcome === 'goal') {
      t.goals++;
      if (manual) t.managerGoals++;
    }
    if (result.outcome === 'save') op.saves++;
    const defending = other(c.team),
      keeper = s.teams[defending].players.find((p) => p.profile === 'GK')!;
    this.emit(result.outcome === 'save' ? defending : c.team, result.outcome, result.reason, {
      player: result.outcome === 'save' ? keeper.id : c.shooter,
    });
    const keeperMotion = s.last!.motions.find((m) => m.id === keeper.id)!;
    keeperMotion.to = world({ x: result.keeperX, y: result.keeperY }, c.team);
    s.last!.shot = { chance: structuredClone(c), result };
    s.last!.ball.push(world(result.target, c.team));
    s.possession = other(c.team);
    s.ball = world({ x: result.outcome === 'goal' ? 52.5 : 24, y: 34 }, s.possession);
  }
  private boundary() {
    const s = this.state;
    if (s.phase === 'manual') return;
    if (s.time === 2700 && !s.halfPassed) {
      s.phase = 'halftime';
      s.halfPassed = true;
      this.emit(0, 'halftime', 'Devre arası.');
    } else if (s.time === s.options.unlockMinute * 60 && !s.unlocked) {
      s.phase = 'lastResort';
      s.unlocked = true;
      this.emit(0, 'lastResort', 'İki taraf için Son Çare açıldı.');
    } else if (s.time >= 5400) {
      s.phase = 'finished';
      this.emit(0, 'fulltime', 'Maç sona erdi.');
    }
  }
}
export function replayArcade(
  seed: number,
  options: Partial<ArcadeOptions>,
  commands: ArcadeCommand[],
  endSequence: number,
): ArcadeMatch {
  const m = new ArcadeMatch(seed, options);
  let index = 0;
  for (let guard = 0; guard < 1000; guard++) {
    while (commands[index]?.sequence === m.state.sequence) {
      const c = commands[index++];
      if (c.time !== m.state.time) throw new Error('Komut zamanı uyuşmuyor');
      if (c.kind === 'tactic') m.tactic(c.team, c.strategy);
      else if (c.kind === 'manager') m.enterManager(c.team, c.player);
      else m.shoot(c.team, c.input);
    }
    if (m.state.sequence === endSequence) {
      if (index !== commands.length) throw new Error('İleri veya sırasız komut');
      return m;
    }
    if (m.state.phase === 'manual' || m.state.phase === 'finished')
      throw new Error('Eksik şut komutu veya geçersiz son sekans');
    m.continue();
    m.advance();
  }
  throw new Error('Tekrar sınırı aşıldı');
}
