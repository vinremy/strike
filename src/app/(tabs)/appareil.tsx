import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Label, styles } from '../../components/ui';
import { FoundDevice } from '../../device/types';
import { useApp } from '../../state/AppContext';
import { colors } from '../../theme';

export default function DeviceScreen() {
  const app = useApp();
  const [found, setFound] = useState<FoundDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<null | (() => void)>(null);

  useEffect(() => () => stopRef.current?.(), []);

  const startScan = async () => {
    setError(null);
    setFound([]);
    try {
      stopRef.current = await app.scan((d) => setFound((f) => (f.some((x) => x.id === d.id) ? f : [...f, d])));
      setTimeout(() => { stopRef.current?.(); stopRef.current = null; }, 10000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const connect = async (d: FoundDevice) => {
    stopRef.current?.();
    stopRef.current = null;
    try {
      await app.connect(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const connected = app.connection === 'connecte';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Label>Source des données</Label>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {(['ble', 'simulateur'] as const).map((s) => {
            const disabled = (s === 'ble' && !app.bleAvailable) || app.connection !== 'deconnecte';
            const active = app.source === s;
            return (
              <Pressable
                key={s}
                disabled={disabled}
                onPress={() => app.setSource(s)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, alignItems: 'center',
                  backgroundColor: active ? colors.accentSoft : colors.cardAlt,
                  borderWidth: 1, borderColor: active ? colors.accent : colors.border,
                  opacity: disabled && !active ? 0.4 : 1,
                }}
              >
                <Text style={{ color: active ? colors.accent : colors.text, fontWeight: '700' }}>
                  {s === 'ble' ? 'Puce Bluetooth' : 'Simulateur'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!app.bleAvailable ? (
          <Text style={[styles.muted, { marginTop: 10 }]}>Le Bluetooth n'est disponible que dans l'app mobile. Le simulateur est utilisé ici.</Text>
        ) : null}
      </Card>

      {connected ? (
        <Card>
          <Label>Connecté</Label>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 6 }}>{app.deviceName}</Text>
          <View style={{ flexDirection: 'row', gap: 20, marginVertical: 14 }}>
            <Text style={styles.muted}>Batterie : <Text style={{ color: colors.text }}>{app.battery ?? '–'} %</Text></Text>
            <Text style={styles.muted}>Cardio : <Text style={{ color: colors.text }}>{app.lastBpm ?? '–'} bpm</Text></Text>
          </View>
          <Button title="Déconnecter" variant="danger" onPress={app.disconnect} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.h2}>Trouver ma puce</Text>
          <Text style={[styles.muted, { marginBottom: 14 }]}>
            Allume le capteur et garde-le près du téléphone.
          </Text>
          <Button
            title={app.connection === 'recherche' ? 'Recherche…' : app.connection === 'connexion' ? 'Connexion…' : 'Rechercher'}
            disabled={app.connection !== 'deconnecte'}
            onPress={startScan}
          />
          {found.map((d) => (
            <Pressable key={d.id} onPress={() => connect(d)} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: colors.cardAlt }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{d.name}</Text>
                  <Text style={styles.muted}>Signal {d.rssi ?? '?'} dBm</Text>
                </View>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Connecter</Text>
              </View>
            </Pressable>
          ))}
          {error ? <Text style={{ color: colors.accent, marginTop: 12 }}>{error}</Text> : null}
        </Card>
      )}
    </ScrollView>
  );
}
