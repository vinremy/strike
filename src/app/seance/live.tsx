import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Bar, Button, Card, Label, Sparkline, Stat, styles } from '../../components/ui';
import { HeartRateSample, Punch, PUNCH_TYPES } from '../../device/types';
import { useApp } from '../../state/AppContext';
import { formatDuration, hrZone, summarize, TYPE_LABEL } from '../../state/stats';
import { colors, typeColors } from '../../theme';

type Phase = 'prepa' | 'round' | 'repos' | 'fini';

export default function LiveSession() {
  const params = useLocalSearchParams<{ rounds: string; round: string; rest: string }>();
  const rounds = Number(params.rounds) || 3;
  const roundSec = Number(params.round) || 180;
  const restSec = Number(params.rest) || 60;

  const app = useApp();
  const [phase, setPhase] = useState<Phase>('prepa');
  const [round, setRound] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const remainingRef = useRef(5);
  const [paused, setPaused] = useState(false);
  const [, setTick] = useState(0);

  const startedAt = useRef(Date.now());
  const punches = useRef<Punch[]>([]);
  const punchRound = useRef<number[]>([]);
  const hr = useRef<HeartRateSample[]>([]);
  const phaseRef = useRef<Phase>('prepa');
  const roundRef = useRef(0);
  const activeSec = useRef(0);
  const [lastPunch, setLastPunch] = useState<Punch | null>(null);
  const saved = useRef(false);

  // Abonnement aux données du capteur
  useEffect(() => {
    const unsub = app.subscribe({
      onPunch: (p) => {
        if (phaseRef.current !== 'round') return;
        punches.current.push(p);
        punchRound.current.push(roundRef.current);
        setLastPunch(p);
      },
      onHeartRate: (s) => {
        hr.current.push(s);
        setTick((t) => t + 1);
      },
    });
    return () => {
      unsub();
      app.setActive(false);
    };
  }, []);

  // Minuteur des rounds
  useEffect(() => {
    if (paused || phase === 'fini') return;
    const id = setInterval(() => {
      if (phaseRef.current === 'round') activeSec.current += 1;
      if (remainingRef.current > 1) {
        remainingRef.current -= 1;
      } else if (phaseRef.current === 'prepa' || phaseRef.current === 'repos') {
        // Fin de la préparation ou du repos : on lance le round
        remainingRef.current = roundSec;
        go('round');
      } else if (roundRef.current + 1 >= rounds) {
        remainingRef.current = 0;
        go('fini');
      } else {
        roundRef.current += 1;
        remainingRef.current = restSec;
        go('repos');
      }
      setRemaining(remainingRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, phase]);

  useEffect(() => {
    app.setActive(phase === 'round' && !paused);
  }, [phase, paused]);

  useEffect(() => {
    if (phase === 'fini') finish(rounds);
  }, [phase]);

  function go(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
    setRound(roundRef.current);
  }

  function finish(roundsDone: number) {
    if (saved.current) return;
    saved.current = true;
    app.setActive(false);
    const id = String(Date.now());
    app.saveSession({
      id,
      startedAt: startedAt.current,
      endedAt: Date.now(),
      roundsPlanned: rounds,
      roundsDone: Math.max(1, roundsDone),
      roundSeconds: roundSec,
      punches: punches.current,
      punchRound: punchRound.current,
      heartRate: hr.current,
    });
    router.replace(`/seance/${id}`);
  }

  const stopEarly = () => {
    if (punches.current.length === 0) {
      app.setActive(false);
      router.back();
      return;
    }
    finish(roundRef.current + (phaseRef.current === 'round' ? 1 : 0));
  };

  const sum = summarize(punches.current, hr.current, Math.max(1, activeSec.current));
  const roundPunches = punchRound.current.filter((r) => r === round).length;
  const bpm = hr.current.at(-1)?.bpm ?? app.lastBpm;
  const zone = bpm ? hrZone(bpm) : null;
  const maxType = Math.max(1, ...Object.values(sum.byType));

  const phaseColor = phase === 'round' ? colors.accent : phase === 'repos' ? colors.rest : colors.warning;
  const phaseLabel = phase === 'prepa' ? 'Préparez-vous' : phase === 'round' ? `Round ${round + 1} / ${rounds}` : phase === 'repos' ? `Repos · prochain : round ${round + 1}` : 'Terminé';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ alignItems: 'center', borderColor: phaseColor, paddingVertical: 24 }}>
        <Text style={{ color: phaseColor, fontWeight: '800', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
          {paused ? 'En pause' : phaseLabel}
        </Text>
        <Text style={{ color: colors.text, fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {formatDuration(remaining)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {Array.from({ length: rounds }, (_, i) => (
            <View
              key={i}
              style={{
                width: 22, height: 6, borderRadius: 3,
                backgroundColor: i < round || (i === round && phase === 'repos') ? colors.accent : i === round && phase === 'round' ? colors.text : colors.cardAlt,
              }}
            />
          ))}
        </View>
      </Card>

      <View style={styles.row}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Label>Coups (round)</Label>
          <Text style={{ color: colors.text, fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{roundPunches}</Text>
          <Text style={styles.muted}>Total {sum.total}</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Label>Cardio</Label>
          <Text style={{ color: zone?.color ?? colors.text, fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{bpm ?? '–'}</Text>
          <Text style={styles.muted}>{zone?.label ?? 'bpm'}</Text>
        </Card>
      </View>

      <Card>
        <Label>Dernier coup</Label>
        {lastPunch ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: typeColors[lastPunch.type] + '33' }}>
              <Text style={{ color: typeColors[lastPunch.type], fontWeight: '800' }}>{TYPE_LABEL[lastPunch.type]}</Text>
            </View>
            <Text style={{ color: lastPunch.hand === 'gauche' ? colors.left : colors.right, fontWeight: '700' }}>
              {lastPunch.hand === 'gauche' ? 'Gauche' : 'Droite'}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{lastPunch.speed.toFixed(1)} <Text style={styles.muted}>m/s</Text></Text>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{lastPunch.force} <Text style={styles.muted}>N</Text></Text>
          </View>
        ) : (
          <Text style={[styles.muted, { marginTop: 10 }]}>En attente du premier coup…</Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <Stat label="Vitesse moy." value={sum.avgSpeed.toFixed(1)} unit="m/s" />
          <Stat label="Force max" value={String(sum.maxForce)} unit="N" />
          <Stat label="Cadence" value={sum.perMinute.toFixed(0)} unit="/min" />
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Types de coups</Text>
        {PUNCH_TYPES.map((t) => (
          <Bar key={t} label={TYPE_LABEL[t]} value={sum.byType[t]} max={maxType} color={typeColors[t]} />
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: colors.left, fontWeight: '600' }}>Gauche {sum.left}</Text>
          <Text style={{ color: colors.right, fontWeight: '600' }}>Droite {sum.right}</Text>
        </View>
      </Card>

      <Card>
        <Label>Fréquence cardiaque</Label>
        <View style={{ marginTop: 10 }}>
          <Sparkline data={hr.current.slice(-90).map((s) => s.bpm)} color={zone?.color ?? colors.accent} />
        </View>
      </Card>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title={paused ? 'Reprendre' : 'Pause'} variant="ghost" onPress={() => setPaused((p) => !p)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Terminer" variant="danger" onPress={stopEarly} />
        </View>
      </View>
    </ScrollView>
  );
}
