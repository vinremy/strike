import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BleDevice, bleSupported } from '../device/BleDevice';
import { SimulatedDevice } from '../device/SimulatedDevice';
import { ConnectionState, DeviceSource, FoundDevice, HeartRateSample, Punch } from '../device/types';
import { SessionRecord } from './stats';

const HISTORY_KEY = 'boxtrack.history.v1';

type Listener = { onPunch?: (p: Punch) => void; onHeartRate?: (s: HeartRateSample) => void };

interface AppState {
  connection: ConnectionState;
  deviceName: string | null;
  battery: number | null;
  lastBpm: number | null;
  source: 'simulateur' | 'ble';
  bleAvailable: boolean;
  setSource: (s: 'simulateur' | 'ble') => void;
  scan: (onFound: (d: FoundDevice) => void) => Promise<() => void>;
  connect: (d: FoundDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  setActive: (active: boolean) => void;
  subscribe: (l: Listener) => () => void;
  history: SessionRecord[];
  saveSession: (s: SessionRecord) => void;
  deleteSession: (id: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [source, setSourceState] = useState<'simulateur' | 'ble'>(bleSupported ? 'ble' : 'simulateur');
  const [connection, setConnection] = useState<ConnectionState>('deconnecte');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [lastBpm, setLastBpm] = useState<number | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const devices = useRef<Record<string, DeviceSource>>({});
  const listeners = useRef(new Set<Listener>());

  const device = useCallback((): DeviceSource => {
    if (!devices.current[source]) {
      devices.current[source] = source === 'ble' ? new BleDevice() : new SimulatedDevice();
    }
    return devices.current[source];
  }, [source]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => raw && setHistory(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const persist = (h: SessionRecord[]) => {
    setHistory(h);
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(h)).catch(() => {});
  };

  const disconnect = useCallback(async () => {
    await device().disconnect();
    setConnection('deconnecte');
    setDeviceName(null);
    setBattery(null);
    setLastBpm(null);
  }, [device]);

  const value = useMemo<AppState>(
    () => ({
      connection, deviceName, battery, lastBpm, source, history,
      bleAvailable: bleSupported,
      setSource: (s) => {
        if (connection !== 'deconnecte') return;
        setSourceState(s);
      },
      scan: async (onFound) => {
        setConnection('recherche');
        try {
          const stop = await device().scan(onFound);
          return () => {
            stop();
            setConnection((c) => (c === 'recherche' ? 'deconnecte' : c));
          };
        } catch (e) {
          setConnection('deconnecte');
          throw e;
        }
      },
      connect: async (d) => {
        setConnection('connexion');
        try {
          await device().connect(d.id, {
            onPunch: (p) => listeners.current.forEach((l) => l.onPunch?.(p)),
            onHeartRate: (s) => {
              setLastBpm(s.bpm);
              listeners.current.forEach((l) => l.onHeartRate?.(s));
            },
            onBattery: setBattery,
            onDisconnect: () => {
              setConnection('deconnecte');
              setDeviceName(null);
            },
          });
          setDeviceName(d.name);
          setConnection('connecte');
        } catch (e) {
          setConnection('deconnecte');
          throw e;
        }
      },
      disconnect,
      setActive: (a) => device().setActive?.(a),
      subscribe: (l) => {
        listeners.current.add(l);
        return () => listeners.current.delete(l);
      },
      saveSession: (s) => persist([s, ...history]),
      deleteSession: (id) => persist(history.filter((h) => h.id !== id)),
    }),
    [connection, deviceName, battery, lastBpm, source, history, device, disconnect],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp doit être utilisé dans AppProvider');
  return v;
}
