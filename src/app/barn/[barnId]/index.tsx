import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useOppgaver } from '@/data/familie';
import type { Oppgave, Utforelse } from '@/data/typer';
import { useUtforelseHandlinger, useUtforelser } from '@/data/utforelser';
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

  if (oppgaver.isPending) return <Laster />;

  const mine = utforelser.data.filter((u) => u.barn_id === barnId);
  const uke = ukeStart();
  const denneUka = mine.filter((u) => u.uke_start === uke);
  const tjent = denneUka.filter((u) => u.status === 'godkjent').reduce((s, u) => s + u.belop_ore, 0);
  const venterOre = denneUka.filter((u) => u.status === 'venter').reduce((s, u) => s + u.belop_ore, 0);
  const stjerner = denneUka.filter((u) => u.status === 'godkjent').length;
  const pa_rad = dagerPaRad(mine);
  const iDag = dagFor();
  // Dagens avkrysninger, pluss eldre som venter eller er avvist uten nytt forsøk.
  const provdIgjen = new Set(mine.map((u) => u.nytt_forsok_av).filter(Boolean));
  const liste = mine.filter(
    (u) => dagFor(new Date(u.utfort)) === iDag || u.status === 'venter' || (u.status === 'avvist' && !provdIgjen.has(u.id) && u.uke_start === uke),
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
          oppgaver.data.map((o) => (
            <Rad key={o.id} onPress={() => setValgt({ oppgave: o, nyttForsokAv: null })}>
              <Text style={{ fontSize: 28 }}>{o.ikon || '⭐'}</Text>
              <View style={{ flex: 1 }}>
                <T fet>{o.tittel}</T>
                {o.beskrivelse ? (
                  <T dempet v="liten">
                    {o.beskrivelse}
                  </T>
                ) : null}
              </View>
              <Mynt ore={o.belop_ore} />
              <View style={[styles.pluss, { borderColor: f.merke }]}>
                <Text style={{ color: f.merke, fontSize: 22, fontWeight: '800' }}>+</Text>
              </View>
            </Rad>
          ))
        ) : (
          <Tom ikon="📝" tittel="Ingen oppgaver ennå" tekst="Be en voksen legge inn oppgaver." />
        )}

        {liste.length > 0 ? <Seksjon>I dag</Seksjon> : null}
        {liste.map((u) => (
          <UtforelseRad
            key={u.id}
            u={u}
            tittel={oppgaveFor(u.oppgave_id)?.tittel ?? 'Oppgave'}
            onProvIgjen={() => {
              const o = oppgaveFor(u.oppgave_id);
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

function UtforelseRad({
  u,
  tittel,
  onProvIgjen,
  onAngre,
}: {
  u: Utforelse;
  tittel: string;
  onProvIgjen: () => void;
  onAngre: () => void;
}) {
  return (
    <Rad>
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
        <Pille tekst={`+${kr(u.belop_ore)}`} type="godkjent" />
      ) : (
        <Knapp tittel="Prøv igjen" variant="nei" liten onPress={onProvIgjen} />
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
          <T v="tittel">
            {o?.ikon || '⭐'} {o?.tittel}
          </T>
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
            Du får {kr(o?.belop_ore)} og en ⭐ når det er godkjent
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
  pluss: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dimme: { flex: 1, backgroundColor: 'rgba(10,16,30,0.45)' },
  ark: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: avstand.xl, gap: avstand.m, paddingBottom: 40 },
});
