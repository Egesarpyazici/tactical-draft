import type { Attributes, Player, Role, Vec } from './types';
export type Duty = 'defend' | 'support' | 'attack';
export type RoleId =
  | 'keeper'
  | 'sweeper'
  | 'centreBack'
  | 'ballPlayer'
  | 'fullBack'
  | 'wingBack'
  | 'invertedBack'
  | 'anchor'
  | 'deepPlaymaker'
  | 'centralMid'
  | 'boxToBox'
  | 'mezzala'
  | 'winger'
  | 'insideForward'
  | 'playmaker'
  | 'shadowStriker'
  | 'striker'
  | 'falseNine'
  | 'pressingForward';
export type RoleProfile = {
  id: RoleId;
  name: string;
  positions: Role[];
  duties: Duty[];
  description: string;
  benefit: string;
  risk: string;
  attributes: (keyof Attributes)[];
  advance: number;
  width: number;
  run: number;
  press: number;
  riskTaking: number;
  creative: number;
  mark: number;
};
const define = (
  id: RoleId,
  name: string,
  positions: Role[],
  duties: Duty[],
  description: string,
  benefit: string,
  risk: string,
  attributes: (keyof Attributes)[],
  v: Partial<
    Pick<RoleProfile, 'advance' | 'width' | 'run' | 'press' | 'riskTaking' | 'creative' | 'mark'>
  > = {},
): RoleProfile => ({
  id,
  name,
  positions,
  duties,
  description,
  benefit,
  risk,
  attributes,
  advance: 0,
  width: 1,
  run: 0,
  press: 0,
  riskTaking: 0,
  creative: 0,
  mark: 0,
  ...v,
});
export const ROLES: Record<RoleId, RoleProfile> = {
  keeper: define(
    'keeper',
    'Standart Kaleci',
    ['GK'],
    ['defend'],
    'Kale açısını korur; yakın ve güvenli topa çıkar.',
    'Kale güvenliği',
    'Geride geniş alan bırakır',
    ['reflexes', 'handling', 'positioning'],
  ),
  sweeper: define(
    'sweeper',
    'Libero Kaleci',
    ['GK'],
    ['support'],
    'Savunma arkasındaki güvenli serbest topa daha erken çıkar.',
    'Yüksek çizgiye destek',
    'Çıkışta kale boş kalabilir',
    ['decisions', 'pace', 'firstTouch', 'passing'],
    { advance: 5, creative: 0.1 },
  ),
  centreBack: define(
    'centreBack',
    'Standart Stoper',
    ['CB'],
    ['defend'],
    'Hattı tutar, bölgesindeki koşuyu devralır.',
    'Savunma hattı bütünlüğü',
    'İleri pas bağlantısı sınırlı',
    ['marking', 'awareness', 'tackling'],
    { mark: 0.15 },
  ),
  ballPlayer: define(
    'ballPlayer',
    'Pasör Stoper',
    ['CB'],
    ['defend', 'support'],
    'Koridor varsa hat kıran pasları arar.',
    'Savunmadan bağlantı',
    'Baskı altında riskli pas',
    ['passing', 'vision', 'composure', 'technique'],
    { creative: 0.2, riskTaking: 0.12 },
  ),
  fullBack: define(
    'fullBack',
    'Standart Bek',
    ['FB'],
    ['defend', 'support'],
    'Kanadı korur ve ölçülü destek verir.',
    'Dengeli genişlik',
    'Bindirme sayısı sınırlı',
    ['positioning', 'stamina', 'tackling'],
  ),
  wingBack: define(
    'wingBack',
    'Kanat Bek',
    ['FB'],
    ['support', 'attack'],
    'Top takımındayken çizgiyi genişletir ve bindirir.',
    'Hücum genişliği',
    'Geçişte arkasında alan',
    ['pace', 'stamina', 'offBall', 'passing'],
    { advance: 7, width: 1.15, run: 0.2 },
  ),
  invertedBack: define(
    'invertedBack',
    'İçe Kat Eden Bek',
    ['FB'],
    ['support'],
    'Hücumda merkez bağlantısına girer, savunmada kanada döner.',
    'Merkezde pas üçgeni',
    'Top kaybında kanat açık',
    ['decisions', 'passing', 'firstTouch', 'awareness'],
    { advance: 5, width: 0.45, creative: 0.08 },
  ),
  anchor: define(
    'anchor',
    'Çakılı Ön Libero',
    ['DM'],
    ['defend'],
    'Savunma önünü korur, ileri koşuları sınırlar.',
    'Merkezde güvence',
    'Ceza alanına az destek',
    ['awareness', 'positioning', 'marking'],
    { advance: -5, run: -0.3, mark: 0.2 },
  ),
  deepPlaymaker: define(
    'deepPlaymaker',
    'Derinden Oyun Kurucu',
    ['DM', 'CM'],
    ['defend', 'support'],
    'Geride pas açısı kurar ve açık koridorları değerlendirir.',
    'İlk pas bağlantısı',
    'Yakın baskıda top kaybı',
    ['passing', 'vision', 'composure'],
    { advance: -3, creative: 0.2, riskTaking: 0.08 },
  ),
  centralMid: define(
    'centralMid',
    'Standart Orta Saha',
    ['CM'],
    ['defend', 'support', 'attack'],
    'Hatlar arasında bağlantı ve alan dengesi sağlar.',
    'Esnek destek',
    'Özel koşu tehdidi sınırlı',
    ['passing', 'decisions', 'positioning'],
  ),
  boxToBox: define(
    'boxToBox',
    'İki Yönlü Orta Saha',
    ['CM'],
    ['support'],
    'Hücumda ilerler, kayıpta geri dönüş yapar.',
    'İki ceza alanına katkı',
    'Yüksek koşu maliyeti',
    ['stamina', 'offBall', 'tackling'],
    { advance: 4, run: 0.18, press: 0.08 },
  ),
  mezzala: define(
    'mezzala',
    'Yarı Alan Orta Sahası',
    ['CM'],
    ['support', 'attack'],
    'Hücumda merkezden yarı alana açılır.',
    'Kanatla iç koridor bağlantısı',
    'Merkezde dönüş mesafesi',
    ['offBall', 'vision', 'technique'],
    { advance: 4, width: 1.35, run: 0.15, creative: 0.1 },
  ),
  winger: define(
    'winger',
    'Klasik Kanat',
    ['W'],
    ['support', 'attack'],
    'Çizgiyi tutar ve geniş pas seçeneği oluşturur.',
    'Savunmayı yatay açar',
    'Kaleye uzak başlangıç',
    ['pace', 'dribbling', 'passing'],
    { width: 1.15, run: 0.12 },
  ),
  insideForward: define(
    'insideForward',
    'İç Forvet',
    ['W'],
    ['attack'],
    'Top ilerlediğinde iç koridordan kaleye koşar.',
    'İç koridor tehdidi',
    'Kanat genişliği azalır',
    ['offBall', 'finishing', 'acceleration'],
    { advance: 5, width: 0.58, run: 0.3, riskTaking: 0.1 },
  ),
  playmaker: define(
    'playmaker',
    'İleri Oyun Kurucu',
    ['AM'],
    ['support'],
    'Hat arasında yaklaşarak yaratıcı pas açısı kurar.',
    'Forvet bağlantısı',
    'Dar alanda baskı',
    ['vision', 'passing', 'firstTouch'],
    { advance: -4, creative: 0.25 },
  ),
  shadowStriker: define(
    'shadowStriker',
    'Gölge Forvet',
    ['AM'],
    ['attack'],
    'Santrfor çevresindeki boş koridora ileri koşar.',
    'İkinci gol tehdidi',
    'Orta sahaya uzaklaşır',
    ['offBall', 'finishing', 'decisions'],
    { advance: 8, run: 0.35, riskTaking: 0.1 },
  ),
  striker: define(
    'striker',
    'Golcü Forvet',
    ['ST'],
    ['attack'],
    'Savunma çizgisi yakınında uygun şut alanını arar.',
    'Ceza alanı tehdidi',
    'Bağlantı için desteğe ihtiyaç',
    ['finishing', 'composure', 'offBall'],
    { run: 0.18 },
  ),
  falseNine: define(
    'falseNine',
    'Sahte Dokuz',
    ['ST'],
    ['support'],
    'Topa doğru derine gelerek stoperin takip/kademe kararını zorlar.',
    'Hatlar arası bağlantı',
    'Ceza alanında hedef azalır',
    ['firstTouch', 'vision', 'passing', 'decisions'],
    { advance: -12, run: -0.18, creative: 0.18 },
  ),
  pressingForward: define(
    'pressingForward',
    'Pres Forvet',
    ['ST'],
    ['support', 'attack'],
    'Ön hat baskı sorumluluğunu daha sık üstlenir.',
    'İlk baskı ve geçiş',
    'Koşu ve enerji maliyeti',
    ['pressing', 'stamina', 'aggression', 'decisions'],
    { press: 0.25, run: 0.1 },
  ),
};
export const dutyNames: Record<Duty, string> = {
  defend: 'Savunma',
  support: 'Destek',
  attack: 'Hücum',
};
export const positionNames: Record<Role, string> = {
  GK: 'Kaleci',
  CB: 'Stoper',
  FB: 'Bek',
  DM: 'Ön libero',
  CM: 'Merkez orta saha',
  W: 'Kanat',
  AM: 'Ofansif orta saha',
  ST: 'Santrfor',
};
const defaults: Record<Role, RoleId> = {
  GK: 'keeper',
  CB: 'centreBack',
  FB: 'fullBack',
  DM: 'anchor',
  CM: 'centralMid',
  W: 'winger',
  AM: 'playmaker',
  ST: 'striker',
};
export const defaultAssignment = (position: Role) => {
  const roleId = defaults[position],
    r = ROLES[roleId];
  return { roleId, duty: (r.duties.includes('support') ? 'support' : r.duties[0]) as Duty };
};
export function roleFit(p: Pick<Player, 'attributes'>, id: RoleId) {
  const r = ROLES[id];
  return {
    score: r.attributes.reduce((n, key) => n + p.attributes[key], 0) / r.attributes.length,
    requirements: r.attributes.map((key) => ({ key, value: p.attributes[key] })),
  };
}
export function validateRole(position: Role, id: RoleId, duty: Duty) {
  const r = ROLES[id];
  if (!r || !r.positions.includes(position) || !r.duties.includes(duty))
    throw new Error('Role/duty incompatible with position');
}
/** Local attacking coordinates. Role effects never modify goal probability or scores. */
export function roleTarget(p: Player, target: Vec, attacking: boolean): Vec {
  const r = ROLES[p.roleId],
    fit = roleFit(p, p.roleId).score / 100;
  if (!attacking) return target;
  const advance =
    (r.advance + (p.duty === 'attack' ? 5 : p.duty === 'defend' ? -3 : 0)) * (0.65 + 0.35 * fit);
  return { x: target.x + advance, y: 34 + (target.y - 34) * r.width };
}
