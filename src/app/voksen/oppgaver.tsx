import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useArkiverOppgave, useLagreOppgave, useOppgaver } from '@/data/familie';
import type { Oppgave } from '@/data/typer';
import { kr, tilOre } from '@/lib/penger';
import { feiltekst } from '@/lib/supabase';
import { Chip, Chips, Felt, Feilmelding, Knapp, Laster, Mynt, Rad, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand, useFarger } from '@/ui/tema';

const IKONER = ['🧹', '🍽️', '🐕', '🗑️', '🛏️', '👕', '🧺', '🪴', '📚', '🚗', '🧽', '⭐'];

export default function Oppgaver() {
  const oppgaver = useOppgaver();
  const [redigerer, setRedigerer] = useState<Partial<Oppgave> | null>(null);

  if (oppgaver.isPending) return <Laster />;

  return (
    <>
      <Skjerm>
        <Knapp tittel="+ Ny oppgave" onPress={() => setRedigerer({ ikon: '⭐', forslag: [] })} />
        {oppgaver.data?.length ? (
          oppgaver.data.map((o) => (
            <Rad key={o.id} onPress={() => setRedigerer(o)}>
              <Text style={{ fontSize: 26 }}>{o.ikon || '⭐'}</Text>
              <View style={{ flex: 1 }}>
                <T fet>{o.tittel}</T>
                {o.forslag.length ? (
                  <T dempet v="liten">
                    {o.forslag.join(', ')}
                  </T>
                ) : o.beskrivelse ? (
                  <T dempet v="liten">
                    {o.beskrivelse}
                  </T>
                ) : null}
              </View>
              <Mynt ore={o.belop_ore} />
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

function OppgaveSkjema({ start, onLukk }: { start: Partial<Oppgave>; onLukk: () => void }) {
  const f = useFarger();
  const lagre = useLagreOppgave();
  const arkiver = useArkiverOppgave();
  const [tittel, setTittel] = useState(start.tittel ?? '');
  const [belop, setBelop] = useState(start.belop_ore != null ? String(start.belop_ore / 100).replace('.', ',') : '');
  const [ikon, setIkon] = useState(start.ikon ?? '⭐');
  const [beskrivelse, setBeskrivelse] = useState(start.beskrivelse ?? '');
  const [forslag, setForslag] = useState((start.forslag ?? []).join(', '));
  const ore = tilOre(belop);
  const feil = lagre.error ?? arkiver.error;

  async function lagreOgLukk() {
    if (ore == null) return;
    await lagre.mutateAsync({
      id: start.id,
      tittel: tittel.trim(),
      belop_ore: ore,
      ikon,
      beskrivelse: beskrivelse.trim() || null,
      forslag: forslag
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    onLukk();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLukk}>
      <ScrollView style={{ backgroundColor: f.bg }} contentContainerStyle={styles.skjema} keyboardShouldPersistTaps="handled">
        <View style={styles.topp}>
          <T v="tittel">{start.id ? 'Endre oppgave' : 'Ny oppgave'}</T>
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
        {start.id && ore != null && ore !== start.belop_ore ? (
          <T dempet v="liten">
            Nytt beløp gjelder fra nå. Tidligere avkrysninger beholder {kr(start.belop_ore)}.
          </T>
        ) : null}
        <T v="liten" dempet fet>
          Ikon
        </T>
        <Chips>
          {IKONER.map((i) => (
            <Chip key={i} tekst={i} valgt={ikon === i} onPress={() => setIkon(i)} />
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
  topp: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: avstand.s },
});
