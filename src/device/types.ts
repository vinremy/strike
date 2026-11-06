// Données échangées entre la puce et l'application.

export type Hand = 'gauche' | 'droite';
export type PunchType = 'direct' | 'crochet' | 'uppercut' | 'swing';

export const PUNCH_TYPES: PunchType[] = ['direct', 'crochet', 'uppercut', 'swing'];

export interface Punch {
  /** Horodatage en millisecondes (Date.now()) */
  t: number;
  hand: Hand;
  type: PunchType;
  /** Vitesse de pointe du poing, en m/s */
  speed: number;
  /** Force d'impact estimée, en newtons */
  force: number;
}

export interface HeartRateSample {
  t: number;
  bpm: number;
}

export type ConnectionState = 'deconnecte' | 'recherche' | 'connexion' | 'connecte';

export interface FoundDevice {
  id: string;
  name: string;
  rssi?: number | null;
}

export interface DeviceListeners {
  onPunch: (p: Punch) => void;
  onHeartRate: (s: HeartRateSample) => void;
  onBattery?: (percent: number) => void;
  onDisconnect?: () => void;
}

/**
 * Source de données d'un capteur. L'app ne dépend que de cette interface :
 * le simulateur et la vraie puce BLE sont interchangeables.
 */
export interface DeviceSource {
  readonly kind: 'simulateur' | 'ble';
  scan(onFound: (d: FoundDevice) => void): Promise<() => void>;
  connect(deviceId: string, listeners: DeviceListeners): Promise<void>;
  disconnect(): Promise<void>;
  /** Indique au capteur si on est en round ou en repos (utile au simulateur). */
  setActive?(active: boolean): void;
}
