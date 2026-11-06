// Protocole BLE proposé pour la puce.
// À adapter avec ton ami selon son firmware : il suffit de modifier ce fichier.
//
// Service "BoxTrack" (UUID personnalisé)
//   Caractéristique "coup" (notify), 8 octets, little-endian :
//     [0]    main      : 0 = gauche, 1 = droite
//     [1]    type      : 0 = direct, 1 = crochet, 2 = uppercut, 3 = swing
//     [2..3] vitesse   : uint16, en cm/s   (ex. 850 = 8,50 m/s)
//     [4..5] force     : uint16, en newtons
//     [6..7] réservé
//
// Fréquence cardiaque : service standard Bluetooth Heart Rate (0x180D / 0x2A37),
// compatible avec n'importe quelle ceinture cardio du marché.
// Batterie : service standard Battery (0x180F / 0x2A19).

import { Hand, Punch, PUNCH_TYPES } from './types';

export const BOXTRACK_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const PUNCH_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HR_CHAR = '00002a37-0000-1000-8000-00805f9b34fb';
export const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_CHAR = '00002a19-0000-1000-8000-00805f9b34fb';

/** Préfixe du nom Bluetooth annoncé par la puce (filtre lors de la recherche). */
export const DEVICE_NAME_PREFIX = 'BoxTrack';

export function decodePunch(bytes: Uint8Array, t = Date.now()): Punch | null {
  if (bytes.length < 6) return null;
  const hand: Hand = bytes[0] === 0 ? 'gauche' : 'droite';
  const type = PUNCH_TYPES[bytes[1]];
  if (!type) return null;
  const speed = (bytes[2] | (bytes[3] << 8)) / 100;
  const force = bytes[4] | (bytes[5] << 8);
  return { t, hand, type, speed, force };
}

export function encodePunch(p: Omit<Punch, 't'>): Uint8Array {
  const speed = Math.round(p.speed * 100);
  const force = Math.round(p.force);
  return new Uint8Array([
    p.hand === 'gauche' ? 0 : 1,
    PUNCH_TYPES.indexOf(p.type),
    speed & 0xff, (speed >> 8) & 0xff,
    force & 0xff, (force >> 8) & 0xff,
    0, 0,
  ]);
}

/** Décode la mesure standard Heart Rate Measurement (0x2A37). */
export function decodeHeartRate(bytes: Uint8Array): number | null {
  if (bytes.length < 2) return null;
  const is16bit = (bytes[0] & 0x01) === 1;
  if (is16bit) return bytes.length >= 3 ? bytes[1] | (bytes[2] << 8) : null;
  return bytes[1];
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
