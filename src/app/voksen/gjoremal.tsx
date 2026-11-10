import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useVoksne } from '@/data/familie';
import { useGjoremal, useGjoremalHandlinger } from '@/data/gjoremal';
import type { Gjentakelse, Gjoremal } from '@/data/typer';
import { bekreft } from '@/lib/bekreft';
import { erForfalt, fristTekst, GJENTAKELSER, gjentakelseTekst, sorterGjoremal, tolkDato, tolkKlokke } from '@/lib/frist';
import { STANDARD_IKON } from '@/lib/ikoner';
import { dagFor, leggTilDager, naarTekst } from '@/lib/uke';
import { OppgaveSkjema } from '@/skjermer/Barneoppgaver';
import { Chip, Chips, Felt, Knapp, Laster, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand, radius, useFarger } from '@/ui/tema';

/** «Gjøremål»: felles liste for de voksne. */
export default function GjoremalSkjerm() {
  const f = useFarger();
  const liste = useGjoremal();
  const voksne = useVoksne();
  const h = useGjoremalHandlinger();
  const [redigerer, setRedigerer] = useState<Partial<Gjoremal> | null>(null);
  const [tilBarn, setTilBarn] = useState<Gjoremal | null>(null);

  if (liste.isPending) return <Laster />;

  const alle = liste.data ?? [];
  const { medFrist, utenFrist, fullforte } = sorterGjoremal(alle);
  const navn = (uid: string | null) => voksne.data?.find((v) => v.id === uid)?.visningsnavn ?? '';

  const rad = (g: Gjoremal) => (
    <GjoremalRad
      key={g.id}
      g={g}
      fullfortAv={navn(g.fullfortAv)}
      onVeksle={() => h.veksle(g, alle)}
      onApne={() => setRedigerer(g)}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <Skjerm>
        {alle.length === 0 ? (
          <Tom ikon="📝" tittel="Ingen gjøremål" tekst="Trykk + for å legge til noe som må gjøres. Lista er felles for alle voksne." />
        ) : null}
        {medFrist.length > 0 ? <Seksjon>Med frist</Seksjon> : null}
        {medFrist.map(rad)}
        {utenFrist.length > 0 ? <Seksjon>Uten frist</Seksjon> : null}
        {utenFrist.map(rad)}
        {fullforte.length > 0 ? (
          <>
            <Seksjon>Fullført ({fullforte.length})</Seksjon>
            {fullforte.map(rad)}
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              style={{ alignSelf: 'center', padding: avstand.s }}
              onPress={async () => {
                const ok = await bekreft(
                  'Fjern fullførte?',
                  `${fullforte.length} ${fullforte.length === 1 ? 'gjøremål slettes' : 'gjøremål slettes'} for godt.`,
                  'Fjern',
                );
                if (ok) h.fjernFullforte(alle);
              }}>
              <T farge={f.nei} fet>
                Fjern fullførte
              </T>
            </Pressable>
          </>
        ) : null}
        <View style={{ height: 72 }} />
      </Skjerm>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nytt gjøremål"
        onPress={() => setRedigerer({})}
        style={({ pressed }) => [styles.pluss, { backgroundColor: f.merke, opacity: pressed ? 0.85 : 1 }]}>
        <Ionicons name="add" size={30} color={f.paMerke} />
      </Pressable>

      {redigerer ? (
        <GjoremalSkjema
          start={redigerer}
          onLukk={() => setRedigerer(null)}
          onTilBarn={(g) => {
            setRedigerer(null);
            setTilBarn(g);
          }}
        />
      ) : null}
      {tilBarn ? (
        <OppgaveSkjema
          start={{ tittel: tilBarn.tittel.slice(0, 60), beskrivelse: tilBarn.beskrivelse, ikon: STANDARD_IKON, forslag: [] }}
          onLukk={() => setTilBarn(null)}
          onLagret={() => h.slett(tilBarn.id)}
        />
      ) : null}
    </View>
  );
}

function GjoremalRad({
  g,
  fullfortAv,
  onVeksle,
  onApne,
}: {
  g: Gjoremal;
  fullfortAv: string;
  onVeksle: () => void;
  onApne: () => void;
}) {
  const f = useFarger();
  const ferdig = !!g.fullfort;
  const forfalt = !ferdig && erForfalt(g);
  const detaljer: { tekst: string; farge?: string }[] = [];
  if (ferdig) detaljer.push({ tekst: [fullfortAv, naarTekst(g.fullfort!)].filter(Boolean).join(' · ') });
  else {
    if (g.frist) detaljer.push({ tekst: (forfalt ? 'Forfalt · ' : '') + fristTekst(g.frist, g.fristKl), farge: forfalt || g.frist === dagFor() ? f.nei : undefined });
    if (g.gjentas) detaljer.push({ tekst: `↻ ${gjentakelseTekst(g.gjentas)}`, farge: f.merke });
    if (g.beskrivelse) detaljer.push({ tekst: g.beskrivelse });
  }

  return (
    <View style={[styles.rad, { backgroundColor: f.flate, borderColor: f.linje, opacity: ferdig ? 0.6 : 1 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ferdig }}
        accessibilityLabel={g.tittel}
        hitSlop={10}
        onPress={onVeksle}
        style={[styles.boks, { borderColor: ferdig ? f.ok : f.merke, backgroundColor: ferdig ? f.ok : 'transparent' }]}>
        {ferdig ? <Ionicons name="checkmark" size={18} color={f.paMerke} /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityHint="Endre" onPress={onApne} style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: f.tekst,
            fontSize: 16,
            fontWeight: '700',
            textDecorationLine: ferdig ? 'line-through' : 'none',
          }}>
          {g.tittel}
        </Text>
        {detaljer.length > 0 ? (
          <Text numberOfLines={2} style={{ fontSize: 13, color: f.dempet }}>
            {detaljer.map((d, i) => (
              <Text key={i} style={d.farge ? { color: d.farge, fontWeight: '700' } : undefined}>
                {i > 0 ? ' · ' : ''}
                {d.tekst}
              </Text>
            ))}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

type FristValg = 'ingen' | 'idag' | 'imorgen' | 'annen';

function GjoremalSkjema({
  start,
  onLukk,
  onTilBarn,
}: {
  start: Partial<Gjoremal>;
  onLukk: () => void;
  onTilBarn: (g: Gjoremal) => void;
}) {
  const f = useFarger();
  const h = useGjoremalHandlinger();
  const idag = dagFor();
  const imorgen = leggTilDager(idag, 1);
  const startValg: FristValg = !start.frist ? 'ingen' : start.frist === idag ? 'idag' : start.frist === imorgen ? 'imorgen' : 'annen';

  const [tittel, setTittel] = useState(start.tittel ?? '');
  const [beskrivelse, setBeskrivelse] = useState(start.beskrivelse ?? '');
  const [fristValg, setFristValg] = useState<FristValg>(startValg);
  const [annenDato, setAnnenDato] = useState(startValg === 'annen' && start.frist ? norskDato(start.frist) : '');
  const [kl, setKl] = useState(start.fristKl ?? '');
  const [gjentas, setGjentas] = useState<Gjentakelse | null>(start.gjentas ?? null);

  const frist =
    fristValg === 'idag' ? idag : fristValg === 'imorgen' ? imorgen : fristValg === 'annen' ? tolkDato(annenDato, idag) : null;
  const fristKl = frist && kl.trim() ? tolkKlokke(kl) : null;
  const datoFeil = fristValg === 'annen' && annenDato.trim() !== '' && !frist;
  const klFeil = !!frist && kl.trim() !== '' && !fristKl;
  const kanLagre = tittel.trim().length > 0 && !datoFeil && !klFeil && (fristValg !== 'annen' || !!frist);

  function lagre() {
    h.lagre(start.id, {
      tittel: tittel.trim(),
      beskrivelse: beskrivelse.trim() || null,
      frist,
      fristKl,
      gjentas,
    });
    onLukk();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLukk}>
      <ScrollView style={{ backgroundColor: f.bg }} contentContainerStyle={styles.skjema} keyboardShouldPersistTaps="handled">
        <View style={styles.topp}>
          <T v="tittel">{start.id ? 'Endre gjøremål' : 'Nytt gjøremål'}</T>
          <Pressable onPress={onLukk} hitSlop={12} accessibilityRole="button">
            <T farge={f.merke} fet>
              Lukk
            </T>
          </Pressable>
        </View>

        <Felt value={tittel} onChangeText={setTittel} placeholder="Hva må gjøres?" maxLength={120} autoFocus={!start.id} />
        <Felt value={beskrivelse} onChangeText={setBeskrivelse} placeholder="Beskrivelse (valgfritt)" maxLength={1000} multiline />

        <Seksjon>Frist</Seksjon>
        <Chips>
          <Chip tekst="Ingen" valgt={fristValg === 'ingen'} onPress={() => setFristValg('ingen')} />
          <Chip tekst="I dag" valgt={fristValg === 'idag'} onPress={() => setFristValg('idag')} />
          <Chip tekst="I morgen" valgt={fristValg === 'imorgen'} onPress={() => setFristValg('imorgen')} />
          <Chip tekst="Annen dato" valgt={fristValg === 'annen'} onPress={() => setFristValg('annen')} />
        </Chips>
        {fristValg === 'annen' ? (
          <Felt value={annenDato} onChangeText={setAnnenDato} placeholder="Dato, f.eks. 14.11" keyboardType="numbers-and-punctuation" />
        ) : null}
        {datoFeil ? <T farge={f.nei} v="liten">Skriv datoen som 14.11 eller 14.11.2026.</T> : null}
        {fristValg !== 'ingen' ? (
          <Felt value={kl} onChangeText={setKl} placeholder="Klokkeslett (valgfritt), f.eks. 14:00" keyboardType="numbers-and-punctuation" />
        ) : null}
        {klFeil ? <T farge={f.nei} v="liten">Skriv klokkeslettet som 14:00.</T> : null}

        <Seksjon>Gjentas</Seksjon>
        <Chips>
          {GJENTAKELSER.map((g) => (
            <Chip key={g.tekst} tekst={g.tekst} valgt={gjentas === g.verdi} onPress={() => setGjentas(g.verdi)} />
          ))}
        </Chips>

        <Knapp tittel="Lagre" deaktivert={!kanLagre} onPress={lagre} stil={{ marginTop: avstand.s }} />

        {start.id ? (
          <View style={{ gap: avstand.s, marginTop: avstand.l }}>
            <Knapp tittel="Gjør til barneoppgave" variant="kant" onPress={() => onTilBarn(start as Gjoremal)} />
            <Knapp
              tittel="Slett"
              variant="nei"
              onPress={async () => {
                if (await bekreft('Slette gjøremålet?', start.tittel ?? '', 'Slett')) {
                  h.slett(start.id!);
                  onLukk();
                }
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

function norskDato(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y}`;
}

const styles = StyleSheet.create({
  rad: { flexDirection: 'row', alignItems: 'center', gap: avstand.m, borderWidth: 1, borderRadius: radius.m, padding: avstand.m },
  boks: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pluss: {
    position: 'absolute',
    right: avstand.l,
    bottom: avstand.l,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  skjema: { padding: avstand.l, gap: avstand.m, paddingBottom: 60, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topp: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: avstand.s },
});
