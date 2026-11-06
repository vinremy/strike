import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Label, Stat, styles } from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { summarize } from '../../state/stats';
import { colors } from '../../theme';

const PRESETS = [
  { label: 'Sac', rounds: 3, round: 180, rest: 60 },
  { label: 'Cardio', rounds: 6, round: 120, rest: 30 },
  { label: 'Pro', rounds: 12, round: 180, rest: 60 },
  { label: 'Test 30 s', rounds: 2, round: 30, rest: 10 },
];

export default function Home() {
  const { connection, deviceName, battery, history } = useApp();
  const [preset, setPreset] = useState(0);
  const connected = connection === 'connecte';

  const week = useMemo(() => {
    const since = Date.now() - 7 * 864e5;
    const recent = history.filter((h) => h.startedAt >= since);
    return {
      sessions: recent.length,
      punches: recent.reduce((a, s) => a + s.punches.length, 0),
      maxForce: Math.max(0, ...recent.flatMap((s) => s.punches.map((p) => p.force))),
    };
  }, [history]);

  const last = history[0];
  const lastSum = last ? summarize(last.punches, last.heartRate, last.roundsDone * last.roundSeconds) : null;
  const p = PRESETS[preset];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ marginBottom: 4 }}>
          <Text style={[styles.muted, { fontWeight: '600' }]}>BOXTRACK</Text>
          <Text style={styles.h1}>Prêt à frapper ?</Text>
        </View>

        <Pressable onPress={() => router.push('/appareil')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: connected ? colors.success : colors.muted }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                {connected ? deviceName : 'Aucun capteur connecté'}
              </Text>
              <Text style={styles.muted}>
                {connected ? `Batterie ${battery ?? '–'} %` : 'Touchez pour connecter votre puce'}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
          </Card>
        </Pressable>

        <Card>
          <Text style={styles.h2}>Nouvelle séance</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRESETS.map((pr, i) => (
              <Pressable
                key={pr.label}
                onPress={() => setPreset(i)}
                style={{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: i === preset ? colors.accentSoft : colors.cardAlt,
                  borderWidth: 1, borderColor: i === preset ? colors.accent : colors.border,
                }}
              >
                <Text style={{ color: i === preset ? colors.accent : colors.text, fontWeight: '600' }}>{pr.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.muted, { marginBottom: 14 }]}>
            {p.rounds} rounds × {p.round >= 60 ? `${p.round / 60} min` : `${p.round} s`} · repos {p.rest} s
          </Text>
          <Button
            title={connected ? 'Commencer' : 'Connecter un capteur'}
            onPress={() =>
              connected
                ? router.push({ pathname: '/seance/live', params: { rounds: p.rounds, round: p.round, rest: p.rest } })
                : router.push('/appareil')
            }
          />
        </Card>

        <Card>
          <Text style={styles.h2}>7 derniers jours</Text>
          <View style={styles.row}>
            <Stat label="Séances" value={String(week.sessions)} />
            <Stat label="Coups" value={week.punches.toLocaleString('fr-FR')} />
            <Stat label="Force max" value={week.maxForce ? String(week.maxForce) : '–'} unit={week.maxForce ? 'N' : undefined} />
          </View>
        </Card>

        {last && lastSum ? (
          <Pressable onPress={() => router.push(`/seance/${last.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={[styles.h2, { marginBottom: 0 }]}>Dernière séance</Text>
                <Label>{new Date(last.startedAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</Label>
              </View>
              <View style={styles.row}>
                <Stat label="Coups" value={String(lastSum.total)} />
                <Stat label="Vitesse moy." value={lastSum.avgSpeed.toFixed(1)} unit="m/s" />
                <Stat label="Cardio moy." value={lastSum.avgBpm ? Math.round(lastSum.avgBpm).toString() : '–'} unit="bpm" />
              </View>
            </Card>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
