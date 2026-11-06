import { HeartRateSample, Punch, PunchType, PUNCH_TYPES } from '../device/types';

export interface RoundStats {
  index: number;
  punches: number;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  roundsPlanned: number;
  roundsDone: number;
  roundSeconds: number;
  punches: Punch[];
  heartRate: HeartRateSample[];
  /** Index du round pour chaque coup (même longueur que punches) */
  punchRound: number[];
}

export interface Summary {
  total: number;
  perMinute: number;
  avgSpeed: number;
  maxSpeed: number;
  avgForce: number;
  maxForce: number;
  byType: Record<PunchType, number>;
  left: number;
  right: number;
  avgBpm: number;
  maxBpm: number;
  calories: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const max = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);

export function summarize(punches: Punch[], hr: HeartRateSample[], activeSeconds: number): Summary {
  const byType = Object.fromEntries(PUNCH_TYPES.map((t) => [t, 0])) as Record<PunchType, number>;
  let left = 0;
  for (const p of punches) {
    byType[p.type]++;
    if (p.hand === 'gauche') left++;
  }
  const bpms = hr.map((s) => s.bpm);
  const avgBpm = avg(bpms);
  // Estimation simple (formule de Keytel, homme 30 ans / 75 kg) : à affiner avec un profil utilisateur.
  const minutes = activeSeconds / 60;
  const calories = avgBpm ? Math.max(0, ((-55.0969 + 0.6309 * avgBpm + 0.1988 * 75 + 0.2017 * 30) / 4.184) * minutes) : 0;
  return {
    total: punches.length,
    perMinute: minutes > 0 ? punches.length / minutes : 0,
    avgSpeed: avg(punches.map((p) => p.speed)),
    maxSpeed: max(punches.map((p) => p.speed)),
    avgForce: avg(punches.map((p) => p.force)),
    maxForce: max(punches.map((p) => p.force)),
    byType,
    left,
    right: punches.length - left,
    avgBpm,
    maxBpm: max(bpms),
    calories,
  };
}

export function punchesPerRound(s: SessionRecord): number[] {
  const out = Array.from({ length: Math.max(1, s.roundsDone) }, () => 0);
  for (const r of s.punchRound) if (r < out.length) out[r]++;
  return out;
}

export const TYPE_LABEL: Record<PunchType, string> = {
  direct: 'Direct',
  crochet: 'Crochet',
  uppercut: 'Uppercut',
  swing: 'Swing',
};

export function hrZone(bpm: number, maxHr = 190): { label: string; color: string } {
  const pct = bpm / maxHr;
  if (pct < 0.6) return { label: 'Récupération', color: '#4FA3FF' };
  if (pct < 0.7) return { label: 'Endurance', color: '#3DDC97' };
  if (pct < 0.8) return { label: 'Aérobie', color: '#F5C542' };
  if (pct < 0.9) return { label: 'Seuil', color: '#FF8A3D' };
  return { label: 'Maximum', color: '#FF3B4E' };
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
