import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { dunk, pling } from '@/lib/lyd';
import { profilFarger } from '@/ui/tema';
import { Glimt, Stjerne } from '@/ui/stjerne';

export type Punkt = { x: number; y: number };
export type FeiringStart = {
  id: number;
  /** Midten av oppgaveruta barnet trykket på. */
  fra: Punkt;
  /** Midten av skjermen, der stjerna spretter fram. */
  midt: Punkt;
  /** Midten og størrelsen på den ledige plassen på stjernehylla. */
  til: Punkt & { storrelse: number };
};

/** Tidslinja i millisekunder. Se docs/feiring-design.html. */
export const TID = { pang: 0, stjerneInn: 60, seil: 1150, seilVarighet: 800 } as const;
export const FEIRING_VARIGHET = TID.seil + TID.seilVarighet;

const STOR = 150;
const KONFETTI = 64;
const FARGER = ['#FFC43D', '#2F5BEA', '#1E9E6A', ...profilFarger];

/**
 * Konfettibombe fra oppgaveruta og en stor stjerne som seiler opp til stjernehylla.
 * Legges over hele skjermen og tar ikke imot trykk.
 */
export function Feiring({ start }: { start: FeiringStart }) {
  useEffect(() => {
    dunk('pang');
    const a = setTimeout(pling, TID.stjerneInn);
    const b = setTimeout(() => dunk('landet'), FEIRING_VARIGHET);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Ring fra={start.fra} />
      <Konfetti fra={start.fra} frø={start.id} />
      <FlyStjerne start={start} />
    </View>
  );
}

function Ring({ fra }: { fra: Punkt }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
  }, [t]);
  const stil = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 0.2 + t.value * 1.4 }],
  }));
  return <Animated.View style={[styles.ring, { left: fra.x - 50, top: fra.y - 50 }, stil]} />;
}

/** Enkel, forutsigbar tilfeldighet så hver feiring ser litt annerledes ut. */
function tilfeldig(frø: number) {
  let a = frø >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lagBiter(frø: number) {
  const r = tilfeldig(frø);
  return Array.from({ length: KONFETTI }, (_, i) => {
    const vinkel = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.5;
    const fart = 260 + r() * 380;
    return {
      vx: Math.cos(vinkel) * fart,
      vy: Math.sin(vinkel) * fart,
      r0: r() * 360,
      vr: (r() - 0.5) * 800,
      b: 5 + r() * 5,
      h: 3 + r() * 3,
      rund: r() < 0.3,
      farge: FARGER[i % FARGER.length],
      liv: 0.75 + r() * 0.25,
    };
  });
}

function Konfetti({ fra, frø }: { fra: Punkt; frø: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 1700, easing: Easing.linear });
  }, [t]);
  const biter = useMemo(() => lagBiter(frø), [frø]);
  return (
    <>
      {biter.map((b, i) => (
        <Bit key={i} t={t} fra={fra} {...b} />
      ))}
    </>
  );
}

function Bit({
  t,
  fra,
  vx,
  vy,
  r0,
  vr,
  b,
  h,
  rund,
  farge,
  liv,
}: {
  t: SharedValue<number>;
  fra: Punkt;
  vx: number;
  vy: number;
  r0: number;
  vr: number;
  b: number;
  h: number;
  rund: boolean;
  farge: string;
  liv: number;
}) {
  const stil = useAnimatedStyle(() => {
    const s = t.value * 1.7; // sekunder
    const brems = (1 - Math.exp(-2.4 * s)) / 2.4;
    const x = vx * brems;
    const y = vy * brems + 0.5 * 520 * s * s;
    const igjen = (liv - t.value) / 0.3;
    const rot = r0 + vr * s;
    return {
      opacity: t.value >= liv ? 0 : Math.min(1, igjen),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rot}deg` },
        { scaleY: rund ? 1 : Math.max(0.15, Math.abs(Math.cos((rot * Math.PI) / 90))) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: fra.x - b / 2,
          top: fra.y - h / 2,
          width: rund ? h * 1.6 : b,
          height: rund ? h * 1.6 : h,
          borderRadius: rund ? h : 1,
          backgroundColor: farge,
        },
        stil,
      ]}
    />
  );
}

/** Punkt på en kvadratisk bue fra midten til hylla, som går ut til siden underveis. */
function bue(e: number, a: Punkt, b: Punkt, bredde: number) {
  'worklet';
  const k = { x: Math.min(bredde - 30, Math.max(a.x, b.x) + 90), y: (a.y + b.y) / 2 + 20 };
  const u = 1 - e;
  return { x: u * u * a.x + 2 * u * e * k.x + e * e * b.x, y: u * u * a.y + 2 * u * e * k.y + e * e * b.y };
}

function FlyStjerne({ start }: { start: FeiringStart }) {
  const { midt, til } = start;
  const bredde = midt.x * 2;
  const skala = useSharedValue(0);
  const vri = useSharedValue(-40);
  const glorie = useSharedValue(0);
  const p = useSharedValue(0);
  const landet = useSharedValue(0);

  useEffect(() => {
    skala.value = withDelay(
      TID.stjerneInn,
      withSequence(withTiming(1.25, { duration: 270, easing: Easing.out(Easing.back(2)) }), withTiming(1, { duration: 150 })),
    );
    vri.value = withDelay(
      TID.stjerneInn,
      withSequence(
        withTiming(8, { duration: 270 }),
        withTiming(0, { duration: 150 }),
        withDelay(
          200,
          withSequence(withTiming(-6, { duration: 150 }), withTiming(5, { duration: 150 }), withTiming(0, { duration: 150 })),
        ),
      ),
    );
    glorie.value = withDelay(
      TID.stjerneInn,
      withSequence(withTiming(1, { duration: 330 }), withDelay(TID.seil - TID.stjerneInn - 330, withTiming(0, { duration: 300 }))),
    );
    p.value = withDelay(TID.seil, withTiming(1, { duration: TID.seilVarighet, easing: Easing.inOut(Easing.quad) }));
    landet.value = withDelay(FEIRING_VARIGHET, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
  }, [skala, vri, glorie, p, landet]);

  const stjerneStil = useAnimatedStyle(() => {
    const e = p.value;
    const pos = bue(e, midt, til, bredde);
    const s = skala.value * (1 + (til.storrelse / STOR - 1) * e);
    return {
      opacity: e >= 1 ? 0 : 1,
      transform: [
        { translateX: pos.x - STOR / 2 },
        { translateY: pos.y - STOR / 2 },
        { scale: s },
        { rotate: `${vri.value - 25 * Math.sin(Math.PI * e)}deg` },
      ],
    };
  });
  const glorieStil = useAnimatedStyle(() => ({
    opacity: glorie.value * 0.3,
    transform: [{ scale: 0.3 + glorie.value * 0.7 }],
  }));

  return (
    <>
      <Animated.View style={[styles.glorie, { left: midt.x - 130, top: midt.y - 130 }, glorieStil]} />
      {[1, 2, 3].map((n) => (
        <Spor key={n} n={n} p={p} midt={midt} til={til} bredde={bredde} />
      ))}
      <Animated.View style={[styles.stor, stjerneStil]}>
        <Stjerne storrelse={STOR} fjes />
      </Animated.View>
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <Landingsglimt key={n} n={n} landet={landet} til={til} />
      ))}
    </>
  );
}

/** Glitter som følger etter stjerna mens den seiler. */
function Spor({ n, p, midt, til, bredde }: { n: number; p: SharedValue<number>; midt: Punkt; til: Punkt; bredde: number }) {
  const stil = useAnimatedStyle(() => {
    const e = Math.max(0, p.value - n * 0.06);
    const pos = bue(e, midt, til, bredde);
    const synlig = p.value > 0 && p.value < 1;
    return {
      opacity: synlig ? 1 - n * 0.25 : 0,
      transform: [{ translateX: pos.x - 7 }, { translateY: pos.y - 7 }, { rotate: `${n * 25}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.glimt, stil]}>
      <Glimt storrelse={14 - n * 2} />
    </Animated.View>
  );
}

function Landingsglimt({ n, landet, til }: { n: number; landet: SharedValue<number>; til: Punkt }) {
  const vinkel = (n / 6) * Math.PI * 2;
  const stil = useAnimatedStyle(() => ({
    opacity: landet.value > 0 && landet.value < 1 ? 1 - landet.value : 0,
    transform: [
      { translateX: til.x - 5 + Math.cos(vinkel) * 22 * landet.value },
      { translateY: til.y - 5 + Math.sin(vinkel) * 22 * landet.value },
    ],
  }));
  return (
    <Animated.View style={[styles.glimt, stil]}>
      <Glimt storrelse={10} farge="#FFFFFF" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFC43D' },
  glorie: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFC43D' },
  stor: { position: 'absolute', left: 0, top: 0, width: STOR, height: STOR },
  glimt: { position: 'absolute', left: 0, top: 0 },
});
