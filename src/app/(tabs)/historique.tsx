import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Card, styles } from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { summarize } from '../../state/stats';
import { colors } from '../../theme';

export default function History() {
  const { history } = useApp();

  if (!history.length) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🥊</Text>
        <Text style={[styles.h2, { textAlign: 'center' }]}>Aucune séance pour l'instant</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Tes séances apparaîtront ici avec toutes leurs stats.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={history}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => {
        const s = summarize(item.punches, item.heartRate, item.roundsDone * item.roundSeconds);
        return (
          <Pressable onPress={() => router.push(`/seance/${item.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 18 }}>{s.total}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                  {new Date(item.startedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text style={styles.muted}>
                  {item.roundsDone} rounds · {s.avgSpeed.toFixed(1)} m/s · {Math.round(s.avgForce)} N
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
