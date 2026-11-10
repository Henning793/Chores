import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useArkiverOppgave, useLagreOppgave, useOppgaver } from '@/data/familie';
import type { Oppgave } from '@/data/typer';
import { IKONGRUPPER, STANDARD_IKON } from '@/lib/ikoner';
import { PAUSEVALG, pauseMin } from '@/lib/pause';
import { kr, tilOre } from '@/lib/penger';
import { feiltekst } from '@/lib/firebase';
import { Chip, Chips, Felt, Feilmelding, Knapp, Laster, Mynt, Rad, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand, radius, useFarger } from '@/ui/tema';


/** Barneoppgavene og hva de gir. Vises under Barna → Oppgaver. */
export function Barneoppgaver() {
  const oppgaver = useOppgaver();
  const [redigerer, setRedigerer] = useState<Partial<Oppgave> | null>(null);

  if (oppgaver.isPending) return <Laster />;

  return (
    <>
      <Skjerm>
        <Knapp tittel="+ Ny oppgave" onPress={() => setRedigerer({ ikon: STANDARD_IKON, forslag: [] })} />
        {oppgaver.data?.length ? (
          oppgaver.data.map((o) => (
            <Rad key={o.id} onPress={() => setRedigerer(o)}>
              <Text style={{ fontSize: 34 }}>{o.ikon || STANDARD_IKON}</Text>
              <View style={{ flex: 1 }}>
                <T fet>{o.tittel}</T>
                <T dempet v="liten">
                  {[pauseMin(o) > 0 ? `Pause ${PAUSEVALG.find((p) => p.min === pauseMin(o))?.tekst ?? `${pauseMin(o)} min`}` : 'Ingen pause', ...o.forslag].join(' · ')}
                </T>
              </View>
              <Mynt ore={o.belopOre} />
            </Rad>
          ))
        ) : (
          <Tom
            ikon="🧹"
            tittel="Ingen oppgaver ennå"
            tekst="Legg til oppgaver barna kan tjene penger på, for eksempel «Ryddet» eller «Tømt oppvaskmaskin»."
          />
        )}
      </Skjerm>
      {redigerer ? <OppgaveSkjema start={redigerer} onLukk={() => setRedigerer(null)} /> : null}
    </>
  );
}

/** Skjema for ny eller endret barneoppgave. `onLagret` kalles etter lagring (brukes når et gjøremål gjøres om). */
export function OppgaveSkjema({
  start,
  onLukk,
  onLagret,
}: {
  start: Partial<Oppgave>;
  onLukk: () => void;
  onLagret?: () => void;
}) {
  const f = useFarger();
  const lagre = useLagreOppgave();
  const arkiver = useArkiverOppgave();
  const [tittel, setTittel] = useState(start.tittel ?? '');
  const [belop, setBelop] = useState(start.belopOre != null ? String(start.belopOre / 100).replace('.', ',') : '');
  const [ikon, setIkon] = useState(start.ikon ?? STANDARD_IKON);
  const [pause, setPause] = useState(pauseMin(start));
  const [beskrivelse, setBeskrivelse] = useState(start.beskrivelse ?? '');
  const [forslag, setForslag] = useState((start.forslag ?? []).join(', '));
  const ore = tilOre(belop);
  const feil = lagre.error ?? arkiver.error;

  async function lagreOgLukk() {
    if (ore == null) return;
    await lagre.mutateAsync({
      id: start.id,
      tittel: tittel.trim(),
      belopOre: ore,
      ikon,
      pauseMin: pause,
      beskrivelse: beskrivelse.trim() || null,
      forslag: forslag
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    onLagret?.();
    onLukk();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLukk}>
      <ScrollView style={{ backgroundColor: f.bg }} contentContainerStyle={styles.skjema} keyboardShouldPersistTaps="handled">
        <View style={styles.topp}>
          <T v="tittel">{start.id ? 'Endre barneoppgave' : 'Ny barneoppgave'}</T>
          <Pressable onPress={onLukk} hitSlop={12} accessibilityRole="button">
            <T farge={f.merke} fet>
              Lukk
            </T>
          </Pressable>
        </View>
        <Felt etikett="Navn" value={tittel} onChangeText={setTittel} placeholder="F.eks. Ryddet" maxLength={60} />
        <Felt
          etikett="Beløp (kr)"
          value={belop}
          onChangeText={setBelop}
          placeholder="20"
          keyboardType="decimal-pad"
        />
        {belop && ore == null ? <T farge={f.nei}>Skriv et beløp, for eksempel 20 eller 12,50.</T> : null}
        {start.id && ore != null && ore !== start.belopOre ? (
          <T dempet v="liten">
            Nytt beløp gjelder fra nå. Tidligere avkrysninger beholder {kr(start.belopOre)}.
          </T>
        ) : null}
        <View style={styles.ikonValgt}>
          <View style={[styles.ikonStor, { backgroundColor: f.merkeMyk }]}>
            <Text style={{ fontSize: 56 }}>{ikon}</Text>
          </View>
          <T dempet v="liten" stil={{ flex: 1 }}>
            Velg et bilde barna kjenner igjen uten å kunne lese. Det vises stort på barnas skjerm.
          </T>
        </View>
        {IKONGRUPPER.map((g) => (
          <View key={g.navn} style={{ gap: avstand.xs }}>
            <T v="liten" dempet fet>
              {g.navn}
            </T>
            <View style={styles.ikonRutenett}>
              {g.ikoner.map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setIkon(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ikon === i }}
                  style={[
                    styles.ikonRute,
                    { borderColor: ikon === i ? f.merke : f.linje, backgroundColor: ikon === i ? f.merkeMyk : f.flate },
                  ]}>
                  <Text style={{ fontSize: 28 }}>{i}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <T v="liten" dempet fet>
          Pause før samme barn kan krysse av igjen
        </T>
        <Chips>
          {PAUSEVALG.map((p) => (
            <Chip key={p.min} tekst={p.tekst} valgt={pause === p.min} onPress={() => setPause(p.min)} />
          ))}
        </Chips>
        <Felt
          etikett="Forslag til hvor (valgfritt, skill med komma)"
          value={forslag}
          onChangeText={setForslag}
          placeholder="Stuen, Rommet mitt, Kjøkkenet"
        />
        <Felt etikett="Beskrivelse (valgfritt)" value={beskrivelse} onChangeText={setBeskrivelse} multiline />
        <Feilmelding tekst={feil ? feiltekst(feil) : null} />
        <Knapp
          tittel="Lagre"
          deaktivert={!tittel.trim() || ore == null}
          laster={lagre.isPending}
          onPress={lagreOgLukk}
        />
        {start.id ? (
          <Knapp
            tittel="Arkiver oppgaven"
            variant="nei"
            laster={arkiver.isPending}
            onPress={async () => {
              await arkiver.mutateAsync(start.id!);
              onLukk();
            }}
          />
        ) : null}
        {start.id ? (
          <T dempet v="liten" sentrert>
            Arkiverte oppgaver forsvinner fra lista, men historikken beholdes.
          </T>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  skjema: { padding: avstand.l, gap: avstand.m, paddingBottom: 60, width: '100%', maxWidth: 600, alignSelf: 'center' },
  ikonValgt: { flexDirection: 'row', alignItems: 'center', gap: avstand.m },
  ikonStor: { width: 88, height: 88, borderRadius: radius.l, alignItems: 'center', justifyContent: 'center' },
  ikonRutenett: { flexDirection: 'row', flexWrap: 'wrap', gap: avstand.s },
  ikonRute: { width: 48, height: 48, borderRadius: radius.s, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  topp: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: avstand.s },
});
