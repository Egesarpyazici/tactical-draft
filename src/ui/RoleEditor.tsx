import type { MatchState, Player, SingleTacticalCommand } from '../engine/types';
import {
  ROLES,
  defaultAssignment,
  dutyNames,
  positionNames,
  roleFit,
  type RoleId,
  type Duty,
} from '../engine/roles';
import { roleFor } from '../engine/tactics';
const labels: Record<string, string> = {
  reflexes: 'Refleks',
  handling: 'Top tutuşu',
  positioning: 'Pozisyon alma',
  decisions: 'Karar verme',
  pace: 'Hız',
  firstTouch: 'İlk kontrol',
  passing: 'Pas',
  marking: 'Markaj',
  awareness: 'Savunma farkındalığı',
  tackling: 'Müdahale',
  vision: 'Oyun görüşü',
  composure: 'Soğukkanlılık',
  technique: 'Teknik',
  stamina: 'Dayanıklılık',
  offBall: 'Topsuz hareket',
  dribbling: 'Top sürme',
  finishing: 'Bitiricilik',
  acceleration: 'Hızlanma',
  pressing: 'Pres eğilimi',
  aggression: 'Agresiflik',
};
export function RoleEditor({
  state,
  p,
  editable,
  onCommand,
}: {
  state: MatchState;
  p: Player;
  editable: boolean;
  onCommand: (c: SingleTacticalCommand) => void;
}) {
  const profile = ROLES[p.roleId],
    fit = roleFit(p, p.roleId),
    formation = state.teams[p.team].tactics.formation;
  const assign = (slot: number, roleId: RoleId, duty: Duty) =>
    onCommand({ kind: 'assignment', team: p.team, player: p.id, slot, roleId, duty });
  return (
    <section className="role-editor">
      <h4>Bireysel görev · {positionNames[p.role]}</h4>
      <label className="select-label">
        Mevki yeri
        <select
          aria-label="Oyuncu mevki yeri"
          disabled={!editable}
          value={p.slot}
          onChange={(e) => {
            const slot = Number(e.target.value),
              position = roleFor(formation, slot);
            const next = ROLES[p.roleId].positions.includes(position)
              ? { roleId: p.roleId, duty: p.duty }
              : defaultAssignment(position);
            assign(slot, next.roleId, next.duty);
          }}
        >
          {state.players
            .filter((q) => q.team === p.team && q.keeper === p.keeper)
            .sort((a, b) => a.slot - b.slot)
            .map((q) => (
              <option key={q.slot} value={q.slot}>
                {q.slot + 1} · {positionNames[roleFor(formation, q.slot)]} / {q.name.split(' ')[0]}
              </option>
            ))}
        </select>
      </label>
      <label className="select-label">
        Rol
        <select
          aria-label="Oyuncu rolü"
          disabled={!editable}
          value={p.roleId}
          onChange={(e) => {
            const roleId = e.target.value as RoleId;
            const r = ROLES[roleId];
            assign(p.slot, roleId, r.duties.includes(p.duty) ? p.duty : r.duties[0]);
          }}
        >
          {Object.values(ROLES)
            .filter((r) => r.positions.includes(p.role))
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </label>
      <label className="select-label">
        Görev
        <select
          aria-label="Oyuncu görevi"
          disabled={!editable}
          value={p.duty}
          onChange={(e) => assign(p.slot, p.roleId, e.target.value as Duty)}
        >
          {profile.duties.map((d) => (
            <option key={d} value={d}>
              {dutyNames[d]}
            </option>
          ))}
        </select>
      </label>
      <p className="small">{profile.description}</p>
      <p className="small muted">
        <b>Katkı:</b> {profile.benefit}
        <br />
        <b>Risk:</b> {profile.risk}
      </p>
      <div className="energy">
        <span>Özellik uyumu</span>
        <b>{Math.round(fit.score)} / 100</b>
      </div>
      <div className="attribute-grid">
        {fit.requirements.map(({ key, value }) => (
          <span key={key}>
            {labels[key] ?? key}
            <b>{value}</b>
          </span>
        ))}
      </div>
      <p className="muted small">
        Uyum, yukarıdaki özelliklerin ortalamasıdır; başarı garantisi değildir. Mevki değişimi o
        yeri kullanan oyuncuyla yer değiştirir.
      </p>
      {!editable && <p className="muted small">Rol ve taktik değiştirmek için maçı duraklatın.</p>}
    </section>
  );
}
