import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useOppgaver } from '@/data/familie';
import type { Oppgave, Utforelse } from '@/data/typer';
import { useUtforelseHandlinger, useUtforelser } from '@/data/utforelser';
import { STANDARD_IKON } from '@/lib/ikoner';
import { nedtelling, pauseIgjen, pauseMin, useNaa } from '@/lib/pause';
import { kr } from '@/lib/penger';
import { dunk, pling } from '@/lib/lyd';
import { antallStjerner, dagerPaRad } from '@/lib/stjerner';
import { dagFor, naarTekst, ukeStart, ukenummer } from '@/lib/uke';
import { Chip, Chips, Felt, Knapp, Laster, Mynt, Pille, Rad, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { Feiring, FEIRING_VARIGHET, type FeiringStart } from '@/ui/feiring';
import { Stjernehylle, type ViewRef } from '@/ui/stjernehylle';
import { avstand, radius, useFarger } from '@/ui/tema';

export default function BarnHjem() {
  const f = useFarger();
  const { barnId } = useLocalSearchParams<{ barnId: string }>();
  const oppgaver = useOppgaver();
  const utforelser = useUtforelser();
  const { kryssAv, angre } = useUtforelseHandlinger();
  const [valgt, setValgt] = useState<{ oppgave: Oppgave; nyttForsokAv: string | null } | null>(null);
  const [feiringer, setFeiringer] = useState<FeiringStart[]>([]);
  const rolig = useReducedMotion();
  const rotRef = useRef<ViewRef>(null);
  const ledigRef = useRef<ViewRef>(null);
  const ruteRefs = useRef(new Map<string, ViewRef | null>());
  const mine = utforelser.data.filter((u) => u.barnId === barnId);
  // Oppdateres hvert sekund, så nedtellingen går og oppgaven låses opp av seg selv.
  const naa = useNaa(true);

  if (oppgaver.isPending) return <Laster />;

  const uke = ukeStart();
  const denneUka = mine.filter((u) => u.ukeStart === uke);
  const tjent = denneUka.filter((u) => u.status === 'godkjent').reduce((s, u) => s + u.belopOre, 0);
  const venterOre = denneUka.filter((u) => u.status === 'venter').reduce((s, u) => s + u.belopOre, 0);
  // Stjerner som er på vei opp til hylla, vises først når de lander.
  const stjerner = Math.max(0, antallStjerner(mine, barnId, uke) - feiringer.length);
  const pa_rad = dagerPaRad(mine);
  const iDag = dagFor();
  // Dagens avkrysninger, pluss eldre som venter eller er avvist uten nytt forsøk.
  const provdIgjen = new Set(mine.map((u) => u.nyttForsokAv).filter(Boolean));
  const liste = mine.filter(
    (u) => dagFor(new Date(u.utfort)) === iDag || u.status === 'venter' || (u.status === 'avvist' && !provdIgjen.has(u.id) && u.ukeStart === uke),
  );
  const oppgaveFor = (id: string) => oppgaver.data?.find((o) => o.id === id);

  /** Finner midten av ruta, skjermen og den ledige plassen på hylla, og starter feiringen. */
  function feir(oppgaveId: string) {
    const rot = rotRef.current;
    const rute = ruteRefs.current.get(oppgaveId);
    const ledig = ledigRef.current;
    if (rolig || !rot || !rute || !ledig) {
      pling();
      dunk('landet');
      return;
    }
    rot.measureInWindow((rx, ry, rb, rh) => {
      rute.measureInWindow((x, y, b, h) => {
        ledig.measureInWindow((lx, ly, lb) => {
          const start: FeiringStart = {
            id: Date.now(),
            fra: { x: x - rx + b / 2, y: y - ry + h / 2 },
            midt: { x: rb / 2, y: rh * 0.42 },
            til: { x: lx - rx + lb / 2, y: ly - ry + lb / 2, storrelse: lb },
          };
          setFeiringer((f) => [...f, start]);
          setTimeout(() => setFeiringer((f) => f.filter((x) => x.id !== start.id)), FEIRING_VARIGHET);
        });
      });
    });
  }

  return (
    <View ref={rotRef} style={styles.rot} collapsable={false}>
      <Skjerm>
        <View style={[styles.hero, { backgroundColor: f.merke }]}>
          <Text style={[styles.heroLiten, { color: f.paMerke }]}>
            Uke {ukenummer(uke)} · tjent så langt{pa_rad > 1 ? ` · 🔥 ${pa_rad} dager på rad` : ''}
          </Text>
          <View style={styles.pottRad}>
            <Pott ore={tjent} farge={f.paMerke} />
            {venterOre > 0 ? (
              <View style={styles.venter} accessibilityLabel={`${kr(venterOre)} venter på godkjenning`}>
                <Text style={[styles.venterTekst, { color: f.paMerke }]}>⏳ +{kr(venterOre)}</Text>
              </View>
            ) : null}
          </View>
          <Stjernehylle antall={stjerner} ledigRef={ledigRef} />
        </View>

        <Seksjon>Hva har du gjort?</Seksjon>
        {oppgaver.data?.length ? (
          <View style={styles.rutenett}>
            {oppgaver.data.map((o) => (
              <OppgaveRute
                key={o.id}
                ruteRef={(v) => {
                  ruteRefs.current.set(o.id, v);
                }}
                oppgave={o}
                pauseMs={pauseIgjen(o, barnId, mine, naa)}
                onPress={() => setValgt({ oppgave: o, nyttForsokAv: null })}
              />
            ))}
          </View>
        ) : (
          <Tom ikon="📝" tittel="Ingen oppgaver ennå" tekst="Be en voksen legge inn oppgaver." />
        )}

        {liste.length > 0 ? <Seksjon>I dag</Seksjon> : null}
        {liste.map((u) => (
          <UtforelseRad
            key={u.id}
            u={u}
            ikon={oppgaveFor(u.oppgaveId)?.ikon || STANDARD_IKON}
            tittel={oppgaveFor(u.oppgaveId)?.tittel ?? 'Oppgave'}
            pauseMs={(() => {
              const o = oppgaveFor(u.oppgaveId);
              return o ? pauseIgjen(o, barnId, mine, naa) : 0;
            })()}
            onProvIgjen={() => {
              const o = oppgaveFor(u.oppgaveId);
              if (o) setValgt({ oppgave: o, nyttForsokAv: u.id });
            }}
            onAngre={() => angre(u.id)}
          />
        ))}
      </Skjerm>

      {feiringer.map((s) => (
        <Feiring key={s.id} start={s} />
      ))}

      <KryssAvArk
        valgt={valgt}
        onLukk={() => setValgt(null)}
        onSend={(merknad) => {
          if (!valgt) return;
          kryssAv(barnId, valgt.oppgave, merknad, valgt.nyttForsokAv);
          setValgt(null);
          // Arket glir ned først, så smeller det.
          const id = valgt.oppgave.id;
          setTimeout(() => feir(id), 220);
        }}
      />
    </View>
  );
}

/** Beløpet i potten. Hopper litt når en voksen godkjenner og det øker. */
function Pott({ ore, farge }: { ore: number; farge: string }) {
  const skala = useSharedValue(1);
  const forrige = useRef(ore);
  useEffect(() => {
    if (ore > forrige.current) skala.value = withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, { damping: 8 }));
    forrige.current = ore;
  }, [ore, skala]);
  const stil = useAnimatedStyle(() => ({ transform: [{ scale: skala.value }] }));
  return <Animated.Text style={[styles.heroStor, { color: farge, transformOrigin: 'left center' }, stil]}>{kr(ore)}</Animated.Text>;
}

function OppgaveRute({
  oppgave: o,
  pauseMs,
  onPress,
  ruteRef,
}: {
  oppgave: Oppgave;
  pauseMs: number;
  onPress: () => void;
  ruteRef: (v: ViewRef | null) => void;
}) {
  const f = useFarger();
  const pauset = pauseMs > 0;
  const andel = pauset ? pauseMs / (pauseMin(o) * 60_000) : 0;
  return (
    <Pressable
      ref={ruteRef}
      onPress={onPress}
      disabled={pauset}
      accessibilityRole="button"
      accessibilityLabel={pauset ? `${o.tittel}, pause i ${nedtelling(pauseMs)}` : `${o.tittel}, ${kr(o.belopOre)}`}
      accessibilityState={{ disabled: pauset }}
      style={({ pressed }) => [
        styles.rute,
        { backgroundColor: f.flate, borderColor: pauset ? f.linje : f.merkeMyk, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.ruteIkon, pauset && { opacity: 0.3 }]}>{o.ikon || STANDARD_IKON}</Text>
      <T fet v="liten" sentrert stil={pauset ? { opacity: 0.5 } : undefined}>
        {o.tittel}
      </T>
      {pauset ? (
        <View style={styles.pauseBoks}>
          <Text style={[styles.pauseTid, { color: f.vent }]}>⏳ {nedtelling(pauseMs)}</Text>
          <View style={[styles.pauseSpor, { backgroundColor: f.ventMyk }]}>
            <View style={[styles.pauseFyll, { backgroundColor: f.vent, width: `${Math.round(andel * 100)}%` }]} />
          </View>
        </View>
      ) : (
        <Mynt ore={o.belopOre} />
      )}
    </Pressable>
  );
}

function UtforelseRad({
  u,
  ikon,
  tittel,
  pauseMs,
  onProvIgjen,
  onAngre,
}: {
  u: Utforelse;
  ikon: string;
  tittel: string;
  pauseMs: number;
  onProvIgjen: () => void;
  onAngre: () => void;
}) {
  return (
    <Rad>
      <Text style={{ fontSize: 34 }}>{ikon}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <T fet>
          {tittel}
          {u.merknad ? ` · ${u.merknad}` : ''}
        </T>
        <T dempet v="liten">
          {naarTekst(u.utfort)}
          {u.ikkeSendt ? ' · sendes når du er på nett' : ''}
        </T>
        {u.status === 'avvist' && u.kommentar ? <T v="liten">«{u.kommentar}»</T> : null}
      </View>
      {u.status === 'venter' ? (
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Pille tekst="Venter" type="venter" />
          <Pressable onPress={onAngre} hitSlop={8} accessibilityRole="button">
            <T dempet v="liten">
              Angre
            </T>
          </Pressable>
        </View>
      ) : u.status === 'godkjent' ? (
        <Pille tekst={`+${kr(u.belopOre)}`} type="godkjent" />
      ) : (
        <Knapp
          tittel={pauseMs > 0 ? `⏳ ${nedtelling(pauseMs)}` : 'Prøv igjen'}
          variant="nei"
          liten
          deaktivert={pauseMs > 0}
          onPress={onProvIgjen}
        />
      )}
    </Rad>
  );
}

function KryssAvArk({
  valgt,
  onLukk,
  onSend,
}: {
  valgt: { oppgave: Oppgave } | null;
  onLukk: () => void;
  onSend: (merknad: string | null) => void;
}) {
  const f = useFarger();
  const [merknad, setMerknad] = useState('');
  const o = valgt?.oppgave;

  return (
    <Modal visible={!!valgt} transparent animationType="slide" onRequestClose={onLukk} onShow={() => setMerknad('')}>
      <Pressable style={styles.dimme} onPress={onLukk} accessibilityLabel="Lukk" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.ark, { backgroundColor: f.flate }]}>
          <View style={{ alignItems: 'center', gap: avstand.xs }}>
            <Text style={{ fontSize: 72 }}>{o?.ikon || STANDARD_IKON}</Text>
            <T v="tittel">{o?.tittel}</T>
          </View>
          {o?.forslag?.length ? (
            <>
              <T dempet>Hvor? (valgfritt)</T>
              <Chips>
                {o.forslag.map((s) => (
                  <Chip key={s} tekst={s} valgt={merknad === s} onPress={() => setMerknad(merknad === s ? '' : s)} />
                ))}
              </Chips>
            </>
          ) : null}
          <Felt value={merknad} onChangeText={setMerknad} placeholder="Skriv noe til mamma eller pappa …" maxLength={120} />
          <Pressable
            onPress={() => onSend(merknad || null)}
            accessibilityRole="button"
            accessibilityLabel="Ferdig"
            style={({ pressed }) => [styles.ferdig, { backgroundColor: f.ok, opacity: pressed ? 0.85 : 1 }]}>
            <View style={styles.hake}>
              <Text style={styles.hakeTegn}>✓</Text>
            </View>
            <Text style={styles.ferdigTekst}>Ferdig!</Text>
          </Pressable>
          <T dempet sentrert v="liten">
            Du får ⭐ nå og {kr(o?.belopOre)} når en voksen har godkjent
          </T>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rot: { flex: 1 },
  pottRad: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: avstand.s },
  venter: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  venterTekst: { fontWeight: '800', fontSize: 14, fontVariant: ['tabular-nums'] },
  ferdig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: avstand.m, borderRadius: 18, padding: 14 },
  hake: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  hakeTegn: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  ferdigTekst: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  hero: { borderRadius: radius.l, padding: avstand.l, gap: avstand.xs },
  heroLiten: { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  heroStor: { fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rutenett: { flexDirection: 'row', flexWrap: 'wrap', gap: avstand.m },
  rute: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    maxWidth: 220,
    borderRadius: radius.l,
    borderWidth: 2,
    padding: avstand.m,
    alignItems: 'center',
    gap: avstand.s,
  },
  ruteIkon: { fontSize: 56, lineHeight: 68 },
  pauseBoks: { alignSelf: 'stretch', alignItems: 'center', gap: 4 },
  pauseTid: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  pauseSpor: { alignSelf: 'stretch', height: 8, borderRadius: 4, overflow: 'hidden' },
  pauseFyll: { height: 8, borderRadius: 4 },
  pluss: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dimme: { flex: 1, backgroundColor: 'rgba(10,16,30,0.45)' },
  ark: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: avstand.xl, gap: avstand.m, paddingBottom: 40 },
});
