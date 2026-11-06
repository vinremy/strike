// Faux capteur : génère des combinaisons de coups et une fréquence cardiaque
// réalistes, pour développer et faire des démos sans la puce.

import { DeviceListeners, DeviceSource, FoundDevice, Hand, Punch, PunchType } from './types';

const COMBOS: { hand: Hand; type: PunchType }[][] = [
  [{ hand: 'gauche', type: 'direct' }],
  [{ hand: 'gauche', type: 'direct' }, { hand: 'droite', type: 'direct' }],
  [{ hand: 'gauche', type: 'direct' }, { hand: 'droite', type: 'direct' }, { hand: 'gauche', type: 'crochet' }],
  [{ hand: 'gauche', type: 'direct' }, { hand: 'droite', type: 'uppercut' }, { hand: 'gauche', type: 'crochet' }],
  [{ hand: 'droite', type: 'direct' }, { hand: 'gauche', type: 'crochet' }, { hand: 'droite', type: 'direct' }],
  [{ hand: 'gauche', type: 'crochet' }, { hand: 'droite', type: 'swing' }],
];

const BASE: Record<PunchType, { speed: number; force: number }> = {
  direct: { speed: 8.5, force: 1500 },
  crochet: { speed: 9.5, force: 2100 },
  uppercut: { speed: 7.8, force: 1900 },
  swing: { speed: 10.2, force: 2400 },
};

const jitter = (v: number, pct: number) => v * (1 + (Math.random() * 2 - 1) * pct);

export class SimulatedDevice implements DeviceSource {
  readonly kind = 'simulateur' as const;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private hrTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private fatigue = 0;
  private bpm = 72;
  private listeners: DeviceListeners | null = null;

  async scan(onFound: (d: FoundDevice) => void) {
    const t = setTimeout(() => onFound({ id: 'sim-1', name: 'BoxTrack Démo (simulé)', rssi: -48 }), 600);
    return () => clearTimeout(t);
  }

  async connect(_id: string, listeners: DeviceListeners) {
    await new Promise((r) => setTimeout(r, 700));
    this.listeners = listeners;
    listeners.onBattery?.(87);
    this.hrTimer = setInterval(() => {
      const target = this.active ? 160 + this.fatigue * 15 : 105;
      this.bpm += (target - this.bpm) * (this.active ? 0.06 : 0.04) + (Math.random() - 0.5) * 2;
      listeners.onHeartRate({ t: Date.now(), bpm: Math.round(this.bpm) });
    }, 1000);
    this.scheduleCombo();
  }

  setActive(active: boolean) {
    this.active = active;
  }

  private scheduleCombo() {
    const pause = this.active ? 700 + Math.random() * 1800 : 4000 + Math.random() * 6000;
    this.timers.push(
      setTimeout(() => {
        if (!this.listeners) return;
        if (this.active) this.fireCombo();
        this.scheduleCombo();
      }, pause),
    );
  }

  private fireCombo() {
    const combo = COMBOS[Math.floor(Math.random() * COMBOS.length)];
    let delay = 0;
    for (const move of combo) {
      this.timers.push(
        setTimeout(() => {
          if (!this.listeners) return;
          const b = BASE[move.type];
          const tired = 1 - this.fatigue * 0.12;
          const power = move.hand === 'droite' ? 1.12 : 1;
          const punch: Punch = {
            t: Date.now(),
            hand: move.hand,
            type: move.type,
            speed: +jitter(b.speed * tired, 0.12).toFixed(2),
            force: Math.round(jitter(b.force * tired * power, 0.18)),
          };
          this.fatigue = Math.min(1, this.fatigue + 0.002);
          this.listeners.onPunch(punch);
        }, delay),
      );
      delay += 220 + Math.random() * 180;
    }
  }

  async disconnect() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.hrTimer) clearInterval(this.hrTimer);
    this.hrTimer = null;
    this.listeners = null;
    this.fatigue = 0;
    this.bpm = 72;
  }
}
