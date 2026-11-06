import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodePunch, encodePunch, decodeHeartRate, base64ToBytes } from './protocol';

test('encode puis décode un coup', () => {
  const bytes = encodePunch({ hand: 'droite', type: 'crochet', speed: 8.47, force: 1234 });
  const p = decodePunch(bytes, 42);
  assert.deepEqual(p, { t: 42, hand: 'droite', type: 'crochet', speed: 8.47, force: 1234 });
});

test('rejette un paquet trop court ou un type inconnu', () => {
  assert.equal(decodePunch(new Uint8Array([0, 1, 2])), null);
  assert.equal(decodePunch(new Uint8Array([0, 9, 0, 0, 0, 0])), null);
});

test('fréquence cardiaque 8 et 16 bits', () => {
  assert.equal(decodeHeartRate(new Uint8Array([0x00, 142])), 142);
  assert.equal(decodeHeartRate(new Uint8Array([0x01, 0x2c, 0x01])), 300);
});

test('base64 vers octets', () => {
  assert.deepEqual([...base64ToBytes('AQID')], [1, 2, 3]);
});
