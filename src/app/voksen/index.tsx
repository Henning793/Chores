import { useState } from 'react';
import { View } from 'react-native';

import { useBarn, useOppgaver } from '@/data/familie';
import { useUtforelseHandlinger, useUtforelser } from '@/data/utforelser';
import { kr } from '@/lib/penger';
import { naarTekst } from '@/lib/uke';
import { Avatar, Felt, Knapp, Kort, Laster, Pille, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand } from '@/ui/tema';

export default function TilGodkjenning() {
  const utforelser = useUtforelser();
  const barn = useBarn();
  const oppgaver = useOppgaver();
  const { behandle } = useUtforelseHandlinger();
  const [avviser, setAvviser] = useState<string | null>(null);
  const [kommentar, setKommentar] = useState('');

  if (utforelser.isPending || barn.isPending || oppgaver.isPending) return <Laster />;

  const venter = utforelser.data.filter((u) => u.status === 'venter').sort((a, b) => a.utfort.localeCompare(b.utfort));
  const nylig = utforelser.data.filter((u) => u.status !== 'venter').slice(0, 10);
  const barnFor = (id: string) => barn.data?.find((b) => b.id === id);
  const oppgaveFor = (id: string) => oppgaver.data?.find((o) => o.id === id);

  return (
    <Skjerm>
      {venter.length === 0 ? (
        <Tom ikon="🎉" tittel="Ingenting venter" tekst="Når barna krysser av en oppgave, dukker den opp her." />
      ) : (
        <>
          {venter.map((u) => {
            const b = barnFor(u.barn_id);
            return (
              <Kort key={u.id}>
                <View style={{ flexDirection: 'row', gap: avstand.m, alignItems: 'center' }}>
                  <Avatar navn={b?.navn ?? '?'} farge={b?.farge} bildeSti={b?.bilde_sti} />
                  <View style={{ flex: 1 }}>
                    <T fet>
                      {oppgaveFor(u.oppgave_id)?.tittel ?? 'Oppgave'}
                      {u.merknad ? ` · ${u.merknad}` : ''}
                    </T>
                    <T dempet v="liten">
                      {b?.navn} · {naarTekst(u.utfort)}
                    </T>
                  </View>
                  <T fet>{kr(u.belop_ore)}</T>
                </View>
                {avviser === u.id ? (
                  <>
                    <Felt
                      value={kommentar}
                      onChangeText={setKommentar}
                      placeholder="Hva mangler? Barnet ser denne kommentaren."
                      autoFocus
                      maxLength={280}
                    />
                    <View style={{ flexDirection: 'row', gap: avstand.s }}>
                      <Knapp tittel="Avbryt" variant="myk" stil={{ flex: 1 }} onPress={() => setAvviser(null)} />
                      <Knapp
                        tittel="Send avvisning"
                        variant="nei"
                        stil={{ flex: 1 }}
                        deaktivert={kommentar.trim().length === 0}
                        onPress={() => {
                          behandle(u.id, false, kommentar);
                          setAvviser(null);
                        }}
                      />
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', gap: avstand.s }}>
                    <Knapp
                      tittel="Avvis"
                      variant="nei"
                      stil={{ flex: 1 }}
                      onPress={() => {
                        setKommentar('');
                        setAvviser(u.id);
                      }}
                    />
                    <Knapp tittel="Godkjenn" variant="ok" stil={{ flex: 1 }} onPress={() => behandle(u.id, true)} />
                  </View>
                )}
              </Kort>
            );
          })}
          {venter.length > 1 ? (
            <Knapp
              tittel={`Godkjenn alle (${venter.length})`}
              variant="kant"
              onPress={() => venter.forEach((u) => behandle(u.id, true))}
            />
          ) : null}
        </>
      )}

      {nylig.length > 0 ? <Seksjon>Nylig behandlet</Seksjon> : null}
      {nylig.map((u) => (
        <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: avstand.s }}>
          <View style={{ flex: 1 }}>
            <T v="liten" fet>
              {barnFor(u.barn_id)?.navn} · {oppgaveFor(u.oppgave_id)?.tittel}
              {u.merknad ? ` · ${u.merknad}` : ''}
            </T>
            <T v="liten" dempet>
              {naarTekst(u.utfort)}
              {u.registrert_av ? ' · registrert av voksen' : ''}
            </T>
          </View>
          <Pille tekst={u.status === 'godkjent' ? kr(u.belop_ore) : 'Avvist'} type={u.status} />
        </View>
      ))}
    </Skjerm>
  );
}
