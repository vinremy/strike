import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Bar, Button, Card, Columns, Label, Sparkline, Stat, styles } from '../../components/ui';
import { PUNCH_TYPES } from '../../device/types';
import { useApp } from '../../state/AppContext';
import { formatDuration, punchesPerRound, summarize, TYPE_LABEL } from '../../state/stats';
import { colors, typeColors } from '../../theme';

export default function SessionSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, deleteSession } = useApp();
  const s = history.find((h) => h.id === id);

  if (!s) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.muted}>Séance introuvable.</Text>
      </View>
    );
  }

  const sum = summarize(s.punches, s.heartRate, s.roundsDone * s.roundSeconds);
  const perRound = punchesPerRound(s);
  const maxType = Math.max(1, ...Object.values(sum.byType));
  const leftPct = sum.total ? Math.round((sum.left / sum.total) * 100) : 50;
  const favorite = PUNCH_TYPES.reduce((a, b) => (sum.byType[b] > sum.byType[a] ? b : a));

  // Évolution de la vitesse : moyenne glissante sur 10 coups
  const speedTrend = s.punches.map((_, i, arr) => {
    const w = arr.slice(Math.max(0, i - 9), i + 1);
    return w.reduce((a, p) => a + p.speed, 0) / w.length;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.muted}>
          {new Date(s.startedAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.h1}>{sum.total} coups</Text>
        <Text style={styles.muted}>
          {s.roundsDone}/{s.roundsPlanned} rounds · {formatDuration((s.endedAt - s.startedAt) / 1000)} au total
        </Text>
      </View>

      <Card>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <Stat label="Vitesse moy." value={sum.avgSpeed.toFixed(1)} unit="m/s" />
          <Stat label="Vitesse max" value={sum.maxSpeed.toFixed(1)} unit="m/s" />
        </View>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <Stat label="Force moy." value={Math.round(sum.avgForce).toString()} unit="N" />
          <Stat label="Force max" value={String(sum.maxForce)} unit="N" color={colors.accent} />
        </View>
        <View style={styles.row}>
          <Stat label="Cadence" value={sum.perMinute.toFixed(0)} unit="coups/min" />
          <Stat label="Calories" value={Math.round(sum.calories).toString()} unit="kcal" />
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Coups par round</Text>
        <Columns data={perRound} color={colors.accent} />
      </Card>

      <Card>
        <Text style={styles.h2}>Répartition</Text>
        {PUNCH_TYPES.map((t) => (
          <Bar key={t} label={TYPE_LABEL[t]} value={sum.byType[t]} max={maxType} color={typeColors[t]} />
        ))}
        <Label>Gauche / droite</Label>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginVertical: 8 }}>
          <View style={{ flex: leftPct, backgroundColor: colors.left }} />
          <View style={{ flex: 100 - leftPct, backgroundColor: colors.right }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.left, fontWeight: '600' }}>Gauche {leftPct} %</Text>
          <Text style={{ color: colors.right, fontWeight: '600' }}>Droite {100 - leftPct} %</Text>
        </View>
        {sum.total ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>Coup favori : <Text style={{ color: typeColors[favorite], fontWeight: '700' }}>{TYPE_LABEL[favorite]}</Text></Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Évolution de la vitesse</Text>
        <Sparkline data={speedTrend} color={colors.warning} height={70} />
        <Text style={[styles.muted, { marginTop: 8 }]}>
          Une courbe qui descend en fin de séance indique de la fatigue.
        </Text>
      </Card>

      <Card>
        <Text style={styles.h2}>Cardio</Text>
        <View style={[styles.row, { marginBottom: 12 }]}>
          <Stat label="Moyenne" value={sum.avgBpm ? Math.round(sum.avgBpm).toString() : '–'} unit="bpm" />
          <Stat label="Maximum" value={sum.maxBpm ? String(sum.maxBpm) : '–'} unit="bpm" color={colors.accent} />
        </View>
        <Sparkline data={s.heartRate.map((h) => h.bpm)} color={colors.accent} height={70} />
      </Card>

      <Button title="Retour à l'accueil" onPress={() => router.navigate('/')} />
      <Button
        title="Supprimer la séance"
        variant="danger"
        onPress={() => {
          deleteSession(s.id);
          router.navigate('/historique');
        }}
      />
    </ScrollView>
  );
}
