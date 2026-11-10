import { View } from 'react-native';

import { useBarn } from '@/data/familie';
import { useUker, type Uke } from '@/data/uker';
import { useAngreBetalt, useMarkerBetalt } from '@/data/utforelser';
import { kr } from '@/lib/penger';
import { ukeSpenn, ukeStart, ukenummer } from '@/lib/uke';
import { Avatar, Feilmelding, Knapp, Laster, Pille, Rad, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand } from '@/ui/tema';
import { feiltekst } from '@/lib/supabase';

export default function Ukeoppgjor() {
  const barn = useBarn();
  const { uker, laster } = useUker();
  const betal = useMarkerBetalt();
  const angre = useAngreBetalt();

  if (laster || barn.isPending) return <Laster />;
  if (uker.length === 0) {
    return (
      <Skjerm>
        <Tom ikon="📅" tittel="Ingen uker ennå" tekst="Ukesummene dukker opp når barna begynner å krysse av." />
      </Skjerm>
    );
  }

  const denne = ukeStart();
  const ukeStarter = [...new Set(uker.map((u) => u.ukeStart))];
  const barnFor = (id: string) => barn.data?.find((b) => b.id === id);

  return (
    <Skjerm>
      <Feilmelding tekst={betal.error ? feiltekst(betal.error) : angre.error ? feiltekst(angre.error) : null} />
      {ukeStarter.map((us) => (
        <View key={us} style={{ gap: avstand.s }}>
          <Seksjon>
            Uke {ukenummer(us)} · {ukeSpenn(us)}
            {us === denne ? ' · pågår' : ''}
          </Seksjon>
          {uker
            .filter((u) => u.ukeStart === us)
            .map((u) => (
              <UkeRad
                key={u.barnId}
                u={u}
                navn={barnFor(u.barnId)?.navn ?? 'Tidligere barn'}
                farge={barnFor(u.barnId)?.farge}
                bilde={barnFor(u.barnId)?.bilde_sti}
                pagar={us === denne}
                opptatt={betal.isPending || angre.isPending}
                onBetal={() => betal.mutate({ barnId: u.barnId, ukeStart: u.ukeStart, belopOre: u.tjentOre })}
                onAngre={() => angre.mutate({ barnId: u.barnId, ukeStart: u.ukeStart })}
              />
            ))}
        </View>
      ))}
    </Skjerm>
  );
}

function UkeRad({
  u,
  navn,
  farge,
  bilde,
  pagar,
  opptatt,
  onBetal,
  onAngre,
}: {
  u: Uke;
  navn: string;
  farge?: string;
  bilde?: string | null;
  pagar: boolean;
  opptatt: boolean;
  onBetal: () => void;
  onAngre: () => void;
}) {
  return (
    <Rad stil={{ flexWrap: 'wrap' }}>
      <Avatar navn={navn} farge={farge} bildeSti={bilde} />
      <View style={{ flex: 1, minWidth: 120 }}>
        <T fet>{navn}</T>
        <T dempet v="liten">
          {u.antallGodkjent} {u.antallGodkjent === 1 ? 'oppgave' : 'oppgaver'}
          {u.antallVenter ? ` · ${u.antallVenter} venter` : ''}
        </T>
      </View>
      <T v="tittel">{kr(u.tjentOre)}</T>
      {pagar ? null : u.utbetalt ? (
        <View style={{ alignItems: 'flex-end', gap: 4, width: '100%' }}>
          <Pille tekst={`Betalt ${kr(u.utbetaltOre)} ✓`} type="godkjent" />
          <Knapp tittel="Angre betalt" variant="myk" liten deaktivert={opptatt} onPress={onAngre} />
        </View>
      ) : u.tjentOre > 0 ? (
        <Knapp
          tittel={`Marker ${kr(u.tjentOre)} som betalt`}
          liten
          deaktivert={opptatt || u.antallVenter > 0}
          stil={{ width: '100%' }}
          onPress={onBetal}
        />
      ) : null}
      {!pagar && !u.utbetalt && u.antallVenter > 0 ? (
        <T dempet v="liten">
          Godkjenn eller avvis det som venter før du markerer uka som betalt.
        </T>
      ) : null}
    </Rad>
  );
}
