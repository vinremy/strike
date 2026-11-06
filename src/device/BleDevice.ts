// Connexion à la vraie puce via Bluetooth Low Energy (react-native-ble-plx).
// Nécessite un "development build" (npx expo run:ios / run:android ou EAS),
// le Bluetooth n'étant pas disponible dans Expo Go ni sur le web.

import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Device, Subscription } from 'react-native-ble-plx';
import {
  BATTERY_CHAR, BATTERY_SERVICE, BOXTRACK_SERVICE, DEVICE_NAME_PREFIX, HR_CHAR, HR_SERVICE, PUNCH_CHAR,
  base64ToBytes, decodeHeartRate, decodePunch,
} from './protocol';
import { DeviceListeners, DeviceSource, FoundDevice } from './types';

export const bleSupported = Platform.OS === 'ios' || Platform.OS === 'android';

async function requestAndroidPermissions() {
  if (Platform.OS !== 'android') return true;
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  return Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

export class BleDevice implements DeviceSource {
  readonly kind = 'ble' as const;
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private subs: Subscription[] = [];

  private getManager(): BleManager {
    if (!this.manager) {
      // Chargé à la demande pour ne pas casser l'aperçu web.
      const { BleManager } = require('react-native-ble-plx') as typeof import('react-native-ble-plx');
      this.manager = new BleManager();
    }
    return this.manager;
  }

  async scan(onFound: (d: FoundDevice) => void) {
    if (!bleSupported) throw new Error('Bluetooth indisponible sur cette plateforme');
    if (!(await requestAndroidPermissions())) throw new Error('Permissions Bluetooth refusées');
    const manager = this.getManager();
    const seen = new Set<string>();
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, d) => {
      if (error || !d) return;
      const name = d.name ?? d.localName ?? '';
      if (!name.startsWith(DEVICE_NAME_PREFIX) || seen.has(d.id)) return;
      seen.add(d.id);
      onFound({ id: d.id, name, rssi: d.rssi });
    });
    return () => manager.stopDeviceScan();
  }

  async connect(deviceId: string, l: DeviceListeners) {
    const manager = this.getManager();
    manager.stopDeviceScan();
    const device = await manager.connectToDevice(deviceId, { requestMTU: 64 });
    await device.discoverAllServicesAndCharacteristics();
    this.device = device;

    this.subs.push(
      device.monitorCharacteristicForService(BOXTRACK_SERVICE, PUNCH_CHAR, (err, c) => {
        if (err || !c?.value) return;
        const p = decodePunch(base64ToBytes(c.value));
        if (p) l.onPunch(p);
      }),
    );

    const services = await device.services();
    const uuids = services.map((s) => s.uuid.toLowerCase());
    if (uuids.includes(HR_SERVICE)) {
      this.subs.push(
        device.monitorCharacteristicForService(HR_SERVICE, HR_CHAR, (err, c) => {
          if (err || !c?.value) return;
          const bpm = decodeHeartRate(base64ToBytes(c.value));
          if (bpm) l.onHeartRate({ t: Date.now(), bpm });
        }),
      );
    }
    if (uuids.includes(BATTERY_SERVICE)) {
      const c = await device.readCharacteristicForService(BATTERY_SERVICE, BATTERY_CHAR);
      if (c.value) l.onBattery?.(base64ToBytes(c.value)[0]);
    }
    this.subs.push(manager.onDeviceDisconnected(deviceId, () => l.onDisconnect?.()));
  }

  async disconnect() {
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    if (this.device) await this.device.cancelConnection().catch(() => {});
    this.device = null;
  }
}
