import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { kr } from '@/lib/penger';
import { avstand, radius, useFarger, type Farger } from '@/ui/tema';

export const skrift = {
  visning: { fontSize: 28, fontWeight: '700' } as TextStyle,
  tittel: { fontSize: 20, fontWeight: '700' } as TextStyle,
  brod: { fontSize: 16 } as TextStyle,
  liten: { fontSize: 13 } as TextStyle,
};

// ---------------------------------------------------------------------------
// Oppsett
// ---------------------------------------------------------------------------

export function Skjerm({
  children,
  rull = true,
  utenTopp = true,
  stil,
}: {
  children: ReactNode;
  rull?: boolean;
  /** Bruk false når skjermen ikke har header, så innholdet holder seg unna statuslinjen. */
  utenTopp?: boolean;
  stil?: StyleProp<ViewStyle>;
}) {
  const f = useFarger();
  const innhold = [styles.innhold, stil];
  return (
    <SafeAreaView edges={utenTopp ? ['left', 'right'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: f.bg }}>
      {rull ? (
        <ScrollView contentContainerStyle={innhold} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[innhold, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function T({
  children,
  v = 'brod',
  dempet,
  farge,
  stil,
  fet,
  sentrert,
  selectable,
}: {
  children: ReactNode;
  selectable?: boolean;
  v?: keyof typeof skrift;
  dempet?: boolean;
  farge?: string;
  stil?: StyleProp<TextStyle>;
  fet?: boolean;
  sentrert?: boolean;
}) {
  const f = useFarger();
  return (
    <Text
      selectable={selectable}
      style={[
        skrift[v],
        { color: farge ?? (dempet ? f.dempet : f.tekst) },
        fet && { fontWeight: '700' },
        sentrert && { textAlign: 'center' },
        stil,
      ]}>
      {children}
    </Text>
  );
}

export function Seksjon({ children }: { children: ReactNode }) {
  const f = useFarger();
  return <Text style={[styles.seksjon, { color: f.dempet }]}>{children}</Text>;
}

export function Kort({ children, stil }: { children: ReactNode; stil?: StyleProp<ViewStyle> }) {
  const f = useFarger();
  return <View style={[styles.kort, { backgroundColor: f.flate, borderColor: f.linje }, stil]}>{children}</View>;
}

export function Rad({
  children,
  onPress,
  stil,
}: {
  children: ReactNode;
  onPress?: () => void;
  stil?: StyleProp<ViewStyle>;
}) {
  const f = useFarger();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.rad,
        { backgroundColor: f.flate, borderColor: f.linje, opacity: pressed ? 0.7 : 1 },
        stil,
      ]}>
      {children}
    </Pressable>
  );
}

export function Tom({ ikon, tittel, tekst }: { ikon: string; tittel: string; tekst?: string }) {
  return (
    <View style={styles.tom}>
      <Text style={{ fontSize: 40 }}>{ikon}</Text>
      <T v="tittel" sentrert>
        {tittel}
      </T>
      {tekst ? (
        <T dempet sentrert>
          {tekst}
        </T>
      ) : null}
    </View>
  );
}

export function Laster() {
  const f = useFarger();
  return (
    <View style={[styles.senter, { backgroundColor: f.bg }]}>
      <ActivityIndicator color={f.merke} />
    </View>
  );
}

export function Feilmelding({ tekst }: { tekst: string | null }) {
  const f = useFarger();
  if (!tekst) return null;
  return (
    <View style={[styles.feil, { backgroundColor: f.neiMyk }]}>
      <T farge={f.nei} v="liten" fet>
        {tekst}
      </T>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Kontroller
// ---------------------------------------------------------------------------

type KnappVariant = 'primar' | 'kant' | 'ok' | 'nei' | 'myk';

function knappFarger(f: Farger, v: KnappVariant) {
  switch (v) {
    case 'primar':
      return { bg: f.merke, fg: f.paMerke, kant: f.merke };
    case 'kant':
      return { bg: 'transparent', fg: f.merke, kant: f.merke };
    case 'ok':
      return { bg: f.ok, fg: f.paMerke, kant: f.ok };
    case 'nei':
      return { bg: f.neiMyk, fg: f.nei, kant: f.neiMyk };
    case 'myk':
      return { bg: f.merkeMyk, fg: f.merke, kant: f.merkeMyk };
  }
}

export function Knapp({
  tittel,
  onPress,
  variant = 'primar',
  deaktivert,
  laster,
  liten,
  stil,
}: {
  tittel: string;
  onPress: () => void;
  variant?: KnappVariant;
  deaktivert?: boolean;
  laster?: boolean;
  liten?: boolean;
  stil?: StyleProp<ViewStyle>;
}) {
  const f = useFarger();
  const k = knappFarger(f, variant);
  const av = deaktivert || laster;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!av }}
      onPress={onPress}
      disabled={av}
      style={({ pressed }) => [
        styles.knapp,
        liten && styles.knappLiten,
        { backgroundColor: k.bg, borderColor: k.kant, opacity: av ? 0.5 : pressed ? 0.8 : 1 },
        stil,
      ]}>
      {laster ? (
        <ActivityIndicator color={k.fg} />
      ) : (
        <Text style={[styles.knappTekst, liten && { fontSize: 14 }, { color: k.fg }]}>{tittel}</Text>
      )}
    </Pressable>
  );
}

export function Felt({ etikett, stil, ...props }: TextInputProps & { etikett?: string; stil?: StyleProp<ViewStyle> }) {
  const f = useFarger();
  return (
    <View style={[{ gap: avstand.xs }, stil]}>
      {etikett ? (
        <T v="liten" dempet fet>
          {etikett}
        </T>
      ) : null}
      <TextInput
        placeholderTextColor={f.dempet}
        {...props}
        style={[styles.felt, { borderColor: f.linje, color: f.tekst, backgroundColor: f.flate }, props.style]}
      />
    </View>
  );
}

export function Chip({ tekst, valgt, onPress }: { tekst: string; valgt?: boolean; onPress: () => void }) {
  const f = useFarger();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!valgt }}
      style={[
        styles.chip,
        { borderColor: valgt ? f.merke : f.linje, backgroundColor: valgt ? f.merkeMyk : f.flate },
      ]}>
      <Text style={{ color: valgt ? f.merke : f.tekst, fontWeight: '700' }}>{tekst}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

/** Bryter med 2–4 valg, for eksempel Godkjenn · Oppgaver · Uker. */
export function Bryter<T extends string>({
  valg,
  verdi,
  onEndre,
}: {
  valg: { verdi: T; tekst: string; antall?: number }[];
  verdi: T;
  onEndre: (v: T) => void;
}) {
  const f = useFarger();
  return (
    <View style={[styles.bryter, { backgroundColor: f.linje }]} accessibilityRole="tablist">
      {valg.map((v) => {
        const valgt = v.verdi === verdi;
        return (
          <Pressable
            key={v.verdi}
            accessibilityRole="tab"
            accessibilityState={{ selected: valgt }}
            onPress={() => onEndre(v.verdi)}
            style={[styles.bryterValg, valgt && { backgroundColor: f.flate, ...styles.bryterSkygge }]}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: valgt ? f.tekst : f.dempet }}>{v.tekst}</Text>
            {v.antall ? (
              <View style={[styles.bryterTall, { backgroundColor: f.nei }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11 }}>{v.antall}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Visning
// ---------------------------------------------------------------------------

export function Avatar({
  navn,
  farge,
  bilde,
  storrelse = 40,
}: {
  navn: string;
  farge?: string;
  bilde?: string | null;
  storrelse?: number;
}) {
  const f = useFarger();
  const s = { width: storrelse, height: storrelse, borderRadius: storrelse / 2 };
  if (bilde) return <Image source={{ uri: bilde }} style={[s, styles.avatar]} contentFit="cover" />;
  return (
    <View style={[s, styles.avatar, { backgroundColor: farge ?? f.merke }]}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: storrelse * 0.4 }}>
        {navn.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function Mynt({ ore }: { ore: number }) {
  const f = useFarger();
  return (
    <View style={[styles.pille, { backgroundColor: f.mynt }]}>
      <Text style={{ color: f.myntTekst, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{kr(ore)}</Text>
    </View>
  );
}

export function Pille({ tekst, type }: { tekst: string; type: 'venter' | 'godkjent' | 'avvist' | 'info' }) {
  const f = useFarger();
  const k = {
    venter: [f.ventMyk, f.vent],
    godkjent: [f.okMyk, f.ok],
    avvist: [f.neiMyk, f.nei],
    info: [f.merkeMyk, f.merke],
  }[type];
  return (
    <View style={[styles.pille, { backgroundColor: k[0] }]}>
      <Text style={{ color: k[1], fontWeight: '800', fontSize: 12 }}>{tekst}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PIN-tastatur
// ---------------------------------------------------------------------------

export function PinTastatur({
  verdi,
  onEndre,
  lengde = 4,
  deaktivert,
}: {
  verdi: string;
  onEndre: (v: string) => void;
  lengde?: number;
  deaktivert?: boolean;
}) {
  const f = useFarger();
  const taster = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <View style={{ gap: avstand.xl, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: avstand.l }} accessibilityLabel={`${verdi.length} av ${lengde} sifre`}>
        {Array.from({ length: lengde }).map((_, i) => (
          <View
            key={i}
            style={[styles.prikk, { borderColor: f.merke, backgroundColor: i < verdi.length ? f.merke : 'transparent' }]}
          />
        ))}
      </View>
      <View style={styles.tastatur}>
        {taster.map((t, i) =>
          t === '' ? (
            <View key={i} style={styles.tast} />
          ) : (
            <Pressable
              key={i}
              disabled={deaktivert}
              accessibilityLabel={t === '⌫' ? 'Slett' : t}
              onPress={() => {
                if (t === '⌫') onEndre(verdi.slice(0, -1));
                else if (verdi.length < lengde) onEndre(verdi + t);
              }}
              style={({ pressed }) => [styles.tast, { backgroundColor: pressed ? f.merke : f.merkeMyk }]}>
              {({ pressed }) => (
                <Text style={{ fontSize: 26, fontWeight: '600', color: pressed ? f.paMerke : f.tekst }}>{t}</Text>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  innhold: { padding: avstand.l, gap: avstand.m, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
  seksjon: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: avstand.s },
  kort: { borderWidth: 1, borderRadius: radius.m, padding: avstand.m, gap: avstand.s },
  rad: { flexDirection: 'row', alignItems: 'center', gap: avstand.m, borderWidth: 1, borderRadius: radius.m, padding: avstand.m },
  tom: { alignItems: 'center', gap: avstand.s, paddingVertical: 40, paddingHorizontal: avstand.l },
  senter: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexGrow: 0, overflow: 'hidden' },
  feil: { borderRadius: radius.s, padding: avstand.m },
  knapp: { borderRadius: radius.m, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: avstand.l, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  knappLiten: { paddingVertical: 8, paddingHorizontal: avstand.m, minHeight: 38 },
  knappTekst: { fontSize: 16, fontWeight: '800' },
  felt: { borderWidth: 1.5, borderRadius: radius.s, paddingHorizontal: avstand.m, paddingVertical: 12, fontSize: 16 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: avstand.s },
  pille: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  bryter: { flexDirection: 'row', borderRadius: radius.s + 2, padding: 3, gap: 2 },
  bryterValg: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: radius.s },
  bryterSkygge: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  bryterTall: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  prikk: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  tastatur: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 14, justifyContent: 'center' },
  tast: { width: 80, height: 64, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
});
