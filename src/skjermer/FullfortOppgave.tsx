import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBarn, useOppgaver } from '@/data/familie';
import { useUtforelseHandlinger } from '@/data/utforelser';
import { STANDARD_IKON } from '@/lib/ikoner';
import { kr } from '@/lib/penger';
import { dagFor, leggTilDager } from '@/lib/uke';
import { Chip, Chips, Knapp, Seksjon, T } from '@/ui/komponenter';
import { avstand, radius, useFarger } from '@/ui/tema';

const DAGER = [
  { tekst: 'I dag', tilbake: 0 },
  { tekst: 'I går', tilbake: 1 },
  { tekst: '2 dager siden', tilbake: 2 },
];

/** For når et barn glemte å krysse av selv. Lagres som godkjent med en gang. */
export function FullfortOppgave({ barnId: startBarn, onLukk }: { barnId?: string; onLukk: () => void }) {
  const f = useFarger();
  const barn = useBarn();
  const oppgaver = useOppgaver();
  const { registrer } = useUtforelseHandlinger();
  const [barnId, setBarnId] = useState<string | null>(startBarn ?? (barn.data.length === 1 ? barn.data[0].id : null));
  const [oppgaveId, setOppgaveId] = useState<string | null>(null);
  const [tilbake, setTilbake] = useState(0);
  const [merknad, setMerknad] = useState<string | null>(null);

  const oppgave = oppgaver.data.find((o) => o.id === oppgaveId);
  const b = barn.data.find((x) => x.id === barnId);

  function lagre() {
    if (!oppgave || !b) return;
    let tid = new Date();
    if (tilbake > 0) {
      // Klokka 12 norsk tid den valgte dagen, så den havner i riktig uke.
      tid = new Date(`${leggTilDager(dagFor(), -tilbake)}T12:00:00+01:00`);
    }
    registrer(b.id, oppgave, merknad, tid);
    onLukk();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLukk}>
      <ScrollView style={{ backgroundColor: f.bg }} contentContainerStyle={styles.skjema} keyboardShouldPersistTaps="handled">
        <View style={styles.topp}>
          <T v="tittel">Fullført oppgave</T>
          <Pressable onPress={onLukk} hitSlop={12} accessibilityRole="button">
            <T farge={f.merke} fet>
              Lukk
            </T>
          </Pressable>
        </View>

        {barn.data.length === 0 || oppgaver.data.length === 0 ? (
          <T dempet>Legg til barn under Mer og oppgaver under Barna → Oppgaver først.</T>
        ) : (
          <>
            <Seksjon>Hvem</Seksjon>
            <Chips>
              {barn.data.map((x) => (
                <Chip key={x.id} tekst={x.navn} valgt={barnId === x.id} onPress={() => setBarnId(x.id)} />
              ))}
            </Chips>

            <Seksjon>Hva</Seksjon>
            <View style={styles.fliser}>
              {oppgaver.data.map((o) => {
                const valgt = oppgaveId === o.id;
                return (
                  <Pressable
                    key={o.id}
                    accessibilityRole="button"
                    accessibilityLabel={o.tittel}
                    accessibilityState={{ selected: valgt }}
                    onPress={() => {
                      setOppgaveId(o.id);
                      setMerknad(null);
                    }}
                    style={[
                      styles.flis,
                      { borderColor: valgt ? f.ok : f.linje, backgroundColor: valgt ? f.okMyk : f.flate },
                    ]}>
                    <Text style={{ fontSize: 30 }}>{o.ikon || STANDARD_IKON}</Text>
                    <Text numberOfLines={2} style={{ color: f.tekst, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      {o.tittel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {oppgave?.forslag.length ? (
              <Chips>
                {oppgave.forslag.map((s) => (
                  <Chip key={s} tekst={s} valgt={merknad === s} onPress={() => setMerknad(merknad === s ? null : s)} />
                ))}
              </Chips>
            ) : null}

            <Seksjon>Når</Seksjon>
            <Chips>
              {DAGER.map((d) => (
                <Chip key={d.tilbake} tekst={d.tekst} valgt={tilbake === d.tilbake} onPress={() => setTilbake(d.tilbake)} />
              ))}
            </Chips>

            <Knapp
              tittel={oppgave ? `Lagre · ${kr(oppgave.belopOre)}` : 'Lagre'}
              variant="ok"
              deaktivert={!oppgave || !b}
              onPress={lagre}
              stil={{ marginTop: avstand.s }}
            />
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  skjema: { padding: avstand.l, gap: avstand.m, paddingBottom: 60, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topp: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: avstand.s },
  fliser: { flexDirection: 'row', flexWrap: 'wrap', gap: avstand.s },
  flis: { width: 92, minHeight: 88, borderWidth: 2, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
});
