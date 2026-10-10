import { useEffect, useRef, useState } from 'react';
import { goalkeeperX } from '../engine/shot';
import type { Chance, ShotInput, ShotResult } from '../engine/types';
const names = { goal: 'GOL', save: 'KALECİ KURTARDI', wide: 'DIŞARI', over: 'ÜSTTEN DIŞARI' };
export function ShotPanel({
  chance,
  name,
  result,
  onShoot,
  onDone,
}: {
  chance: Chance;
  name: string;
  result: ShotResult | null;
  onShoot: (i: ShotInput) => void;
  onDone: () => void;
}) {
  const [aim, setAim] = useState(0.0),
    [height, setHeight] = useState(0.35),
    [power, setPower] = useState(0.72),
    [armed, setArmed] = useState(false),
    [timing, setTiming] = useState(0),
    [travel, setTravel] = useState(0);
  const started = useRef(0),
    timingAt = () => (Math.sin((performance.now() - started.current) / 650 - Math.PI / 2) + 1) / 2;
  useEffect(() => {
    if (!armed || result) return;
    let frame = 0;
    const run = () => {
      setTiming(timingAt());
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [armed, result]);
  useEffect(() => {
    if (!result) return;
    let frame = 0;
    const start = performance.now();
    const run = () => {
      const p = Math.min(1, (performance.now() - start) / Math.max(1000, result.flightTime * 1800));
      setTravel(p);
      if (p < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [result]);
  const arm = () => {
    started.current = performance.now();
    setTiming(0);
    setArmed(true);
  };
  const shoot = () => {
    if (armed && !result) {
      onShoot({ aim, height, power, timing: timingAt() });
      setArmed(false);
    }
  };
  const project = (x: number, y: number, z = 0) => ({
    x: 400 + (y - 34) * (10 + 40 * Math.exp(-(105 - x) / 3)),
    y: 90 + (105 - x) * 11 - z * 25,
  });
  const from = project(chance.position.x, chance.position.y),
    point = result ? result.path[Math.min(30, Math.floor(travel * 30))] : null,
    ball = point ? project(point.x, point.y, point.z) : from;
  const keeperProgress = result
    ? Math.max(
        0,
        Math.min(
          1,
          (travel * result.flightTime - result.reaction) /
            (result.keeperTime - result.reaction || 1),
        ),
      )
    : 0;
  const keeperY =
    chance.keeper.y + (result ? result.keeperY - chance.keeper.y : 0) * keeperProgress;
  return (
    <section className="ar-shot ar-panel" aria-label="Manuel şut penceresi">
      <div className="ar-section">
        <div>
          <small>
            {chance.practice ? 'ŞUT ANTRENMANI · MAÇTAN BAĞIMSIZ' : 'KAZANILMIŞ SON ÇARE FIRSATI'}
          </small>
          <h2>
            {name} <span>· #{chance.team + 1} kontrolü</span>
          </h2>
        </div>
        <b>{Math.round(105 - chance.position.x)} m</b>
      </div>
      <p className="ar-muted">
        {chance.practice
          ? 'Serbest deneme; maç skoru ve haklar etkilenmez.'
          : 'Yerel iki taraflı oyun. Kontrolü bu takımın oyuncusuna verin. Maç saati durdu.'}
      </p>
      <svg
        viewBox="0 0 800 460"
        role="img"
        aria-label="Kaleye dokunarak ince hedef seçin"
        onPointerDown={(e) => {
          if (result) return;
          const rect = e.currentTarget.getBoundingClientRect(),
            x = ((e.clientX - rect.left) / rect.width) * 800,
            y = ((e.clientY - rect.top) / rect.height) * 460;
          if (y < 120) {
            setAim(Math.max(-1.3, Math.min(1.3, (x - 400) / 183)));
            setHeight(Math.max(0, Math.min(1.3, (90 - y) / 61)));
          }
        }}
      >
        <defs>
          <pattern id="ar-net" width="18" height="15" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 15" fill="none" stroke="#b9c9bd" strokeOpacity=".16" />
          </pattern>
        </defs>
        <rect width="800" height="460" fill="#183e32" rx="14" />
        <path
          d="M100 450 L180 90 L620 90 L700 450 M210 460 L255 230 L545 230 L590 460"
          fill="none"
          stroke="#d6e0ca"
          strokeOpacity=".24"
          strokeWidth="2"
        />
        <rect
          x="217"
          y="25"
          width="366"
          height="65"
          fill="url(#ar-net)"
          stroke="#e2e8da"
          strokeWidth="3"
        />
        <path d="M217 90 H583" stroke="#dfe8d2" strokeWidth="2" />
        <circle
          cx={400 + (keeperY - 34) * 50}
          cy={90 + (105 - goalkeeperX(chance)) * 11}
          r="13"
          fill="#edbd73"
          stroke="#172820"
          strokeWidth="3"
        />
        <text
          x={400 + (keeperY - 34) * 50}
          y={94 + (105 - goalkeeperX(chance)) * 11}
          textAnchor="middle"
          fill="#172820"
          fontSize="10"
        >
          GK
        </text>
        {!result && (
          <g stroke="#c6f17a" strokeWidth="2">
            <circle cx={400 + aim * 183} cy={90 - height * 61} r="10" fill="#c6f17a22" />
            <path
              d={`M${388 + aim * 183} ${90 - height * 61}h24 M${400 + aim * 183} ${78 - height * 61}v24`}
            />
            <path
              d={`M${from.x} ${from.y} L${400 + aim * 183} ${90 - height * 61}`}
              strokeDasharray="5 7"
              opacity=".35"
            />
          </g>
        )}
        <circle
          cx={from.x}
          cy={from.y + 13}
          r="17"
          fill={chance.team === 0 ? '#c6f17a' : '#8fbaf5'}
          stroke="#fff"
          strokeOpacity=".6"
          strokeWidth="2"
        />
        <text
          x={from.x}
          y={from.y + 17}
          textAnchor="middle"
          fill="#142b23"
          fontSize="11"
          fontWeight="bold"
        >
          99
        </text>
        {result && (
          <polyline
            points={result.path
              .slice(0, Math.floor(travel * 30) + 1)
              .map((p) => {
                const v = project(p.x, p.y, p.z);
                return `${v.x},${v.y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#d4e2be"
            strokeOpacity=".55"
            strokeWidth="2"
          />
        )}
        <circle cx={ball.x} cy={ball.y} r="5" fill="white" stroke="#142b23" strokeWidth="2" />
      </svg>
      <div className="ar-shot-controls">
        <div>
          <label>YÖN</label>
          <div className="ar-segment">
            {(
              [
                [-0.8, 'Sol'],
                [0, 'Orta'],
                [0.8, 'Sağ'],
              ] as const
            ).map(([n, label]) => (
              <button
                key={label}
                disabled={!!result}
                aria-pressed={aim === n}
                onClick={() => setAim(n)}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            İnce hedef{' '}
            <input
              aria-label="Yatay hedef"
              type="range"
              min="-130"
              max="130"
              value={Math.round(aim * 100)}
              disabled={!!result}
              onChange={(e) => setAim(Number(e.target.value) / 100)}
            />
          </label>
          <label>
            Hedef yüksekliği{' '}
            <input
              aria-label="Hedef yüksekliği"
              type="range"
              min="0"
              max="130"
              value={Math.round(height * 100)}
              disabled={!!result}
              onChange={(e) => setHeight(Number(e.target.value) / 100)}
            />
          </label>
        </div>
        <div>
          <label>
            GÜÇ <b>%{Math.round(power * 100)}</b>
            <input
              aria-label="Şut gücü"
              type="range"
              min="15"
              max="100"
              value={Math.round(power * 100)}
              disabled={!!result}
              onChange={(e) => setPower(Number(e.target.value) / 100)}
            />
          </label>
          <p className="ar-muted">
            Aşırı güç sapmayı ve yüksekten kaçırma riskini artırır. Düşük güç kaleciye zaman verir.
          </p>
          <label>ZAMANLAMA · YEŞİL BÖLGEDE BIRAK</label>
          <div
            className="ar-timing"
            role="meter"
            aria-label="Şut zamanlaması"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(timing * 100)}
            data-testid="shot-timing"
          >
            <span />
            <i style={{ left: `${timing * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="ar-shot-footer">
        <span>
          Baskı %{Math.round(chance.pressure * 100)} · Bitiricilik {chance.skills.finishing} ·
          Kaleci refleksi {chance.keeper.reflexes}
        </span>
        {!result ? (
          <button className="ar-primary" onClick={armed ? shoot : arm}>
            {armed ? 'ŞUT ÇEK' : 'ZAMANLAMAYI BAŞLAT'}
          </button>
        ) : travel >= 1 ? (
          <button className="ar-primary" onClick={onDone}>
            {chance.practice ? 'Yeni deneme' : 'Maça dön'}
          </button>
        ) : (
          <b>Top uçuşta…</b>
        )}
      </div>
      {result && travel >= 1 && (
        <div className={`ar-result ${result.outcome}`} role="status">
          <strong>{names[result.outcome]}</strong>
          <span>{result.reason}</span>
          <small>
            {result.velocity.toFixed(1)} m/sn · {result.flightTime.toFixed(2)} sn uçuş · zamanlama
            sapması %{Math.round(Math.abs(result.timingError) * 100)}
          </small>
        </div>
      )}
      <p className="ar-muted ar-small">
        Kaleye dokunun veya kaydırıcıları ok tuşlarıyla ayarlayın. Düğmeler Enter / Boşluk ile
        çalışır. Sonuç garanti değildir.
      </p>
    </section>
  );
}
