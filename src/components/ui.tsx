import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors, radius } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Stat({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Label>{label}</Label>
      <Text style={[styles.statValue, color ? { color } : null]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Button({
  title, onPress, variant = 'primary', disabled,
}: { title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && { backgroundColor: colors.accent },
        variant === 'ghost' && { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
        variant === 'danger' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.btnText, variant === 'danger' && { color: colors.accent }]}>{title}</Text>
    </Pressable>
  );
}

/** Barre horizontale proportionnelle */
export function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.text, fontSize: 14 }}>{label}</Text>
        <Text style={{ color: colors.muted, fontSize: 14, fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

/** Mini courbe */
export function Sparkline({ data, color, height = 48, width = 300 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (data.length < 2) return <View style={{ height }} />;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const span = hi - lo || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 4 - ((v - lo) / span) * (height - 8)}`);
  const last = pts[pts.length - 1].split(',').map(Number);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last[0]} cy={last[1]} r={4} fill={color} />
    </Svg>
  );
}

/** Histogramme vertical simple */
export function Columns({ data, color, labels }: { data: number[]; color: string; labels?: string[] }) {
  const hi = Math.max(1, ...data);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>{v}</Text>
          <View style={{ width: '100%', height: `${(v / hi) * 75}%`, minHeight: 2, backgroundColor: color, borderRadius: 6 }} />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{labels?.[i] ?? `R${i + 1}`}</Text>
        </View>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  stat: { flex: 1, gap: 4 },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statUnit: { color: colors.muted, fontSize: 14, fontWeight: '500' },
  btn: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
});
