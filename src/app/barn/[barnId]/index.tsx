import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useOppgaver } from '@/data/familie';
import type { Oppgave, Utforelse } from '@/data/typer';
import { useUtforelseHandlinger, useUtforelser } from '@/data/utforelser';
import { STANDARD_IKON } from '@/lib/ikoner';
import { nedtelling, pauseIgjen, pauseMin, useNaa } from '@/lib/pause';
import { kr } from '@/lib/penger';
import { dagerPaRad } from '@/lib/stjerner';
import { dagFor, naarTekst, ukeStart, ukenummer } from '@/lib/uke';
import { Chip, Chips, Felt, Knapp, Laster, Mynt, Pille, Rad, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand, radius, useFarger } from '@/ui/tema';

export default function BarnHjem() {
  const f = useFarger();
  const { barnId } = useLocalSearchParams<{ barnId: string }>();
  const oppgaver = useOppgaver();
  const utforelser = useUtforelser();
  const { kryssAv, angre } = useUtforelseHandlinger();
  const [valgt, setValgt] = useState<{ oppgave: Oppgave; nyttForsokAv: string | null } | null>(null);
  const [bekreftelse, setBekreftelse] = useState<string | null>(null);
  const mine = utforelser.data.filter((u) => u.barnId === barnId);
  // Oppdateres hvert sekund, så nedtellingen går og oppgaven låses opp av seg selv.
  const naa = useNaa(true);

  if (oppgaver.isPending) return <Laster />;

  const uke = ukeStart();
  const denneUka = mine.filter((u) => u.ukeStart === uke);
  const tjent = denneUka.filter((u) => u.status === 'godkjent').reduce((s, u) => s + u.belopOre, 0);
  const venterOre = denneUka.filter((u) => u.status === 'venter').reduce((s, u) => s + u.belopOre, 0);
  const stjerner = denneUka.filter((u) => u.status === 'godkjent').length;
  const pa_rad = dagerPaRad(mine);
  const iDag = dagFor();
  // Dagens avkrysninger, pluss eldre som venter eller er avvist uten nytt forsøk.
  const provdIgjen = new Set(mine.map((u) => u.nyttForsokAv).filter(Boolean));
  const liste = mine.filter(
    (u) => dagFor(new Date(u.utfort)) === iDag || u.status === 'venter' || (u.status === 'avvist' && !provdIgjen.has(u.id) && u.ukeStart === uke),
  );
  const oppgaveFor = (id: string) => oppgaver.data?.find((o) => o.id === id);

  return (
    <>
      <Skjerm>
        <View style={[styles.hero, { backgroundColor: f.merke }]}>
          <Text style={[styles.heroLiten, { color: f.paMerke }]}>Uke {ukenummer(uke)} · tjent så langt</Text>
          <Text style={[styles.heroStor, { color: f.paMerke }]}>{kr(tjent)}</Text>
          <Text style={[styles.heroLiten, { color: f.paMerke }]}>
            ⭐ {stjerner} {stjerner === 1 ? 'stjerne' : 'stjerner'}
            {pa_rad > 1 ? ` · 🔥 ${pa_rad} dager på rad` : ''}
            {venterOre > 0 ? ` · ${kr(venterOre)} venter` : ''}
          </Text>
        </View>

        {bekreftelse ? (
          <View style={[styles.bekreft, { backgroundColor: f.okMyk }]}>
            <T farge={f.ok} fet>
              {bekreftelse}
            </T>
          </View>
        ) : null}

        <Seksjon>Hva har du gjort?</Seksjon>
        {oppgaver.data?.length ? (
          <View style={styles.rutenett}>
            {oppgaver.data.map((o) => (
              <OppgaveRute
                key={o.id}
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

      <KryssAvArk
        valgt={valgt}
        onLukk={() => setValgt(null)}
        onSend={(merknad) => {
          if (!valgt) return;
          kryssAv(barnId, valgt.oppgave, merknad, valgt.nyttForsokAv);
          setBekreftelse(`Bra jobba! «${valgt.oppgave.tittel}» er sendt til godkjenning.`);
          setTimeout(() => setBekreftelse(null), 4000);
          setValgt(null);
        }}
      />
    </>
  );
}

function OppgaveRute({ oppgave: o, pauseMs, onPress }: { oppgave: Oppgave; pauseMs: number; onPress: () => void }) {
  const f = useFarger();
  const pauset = pauseMs > 0;
  const andel = pauset ? pauseMs / (pauseMin(o) * 60_000) : 0;
  return (
    <Pressable
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
          <Knapp tittel="Ferdig! Send til godkjenning" onPress={() => onSend(merknad || null)} />
          <T dempet sentrert v="liten">
            Du får {kr(o?.belopOre)} og en ⭐ når det er godkjent
          </T>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.l, padding: avstand.l, gap: avstand.xs },
  heroLiten: { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  heroStor: { fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bekreft: { borderRadius: radius.s, padding: avstand.m },
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
