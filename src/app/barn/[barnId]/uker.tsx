import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useUker } from '@/data/uker';
import { kr } from '@/lib/penger';
import { ukeSpenn, ukeStart, ukenummer } from '@/lib/uke';
import { Kort, Laster, Pille, Rad, Skjerm, T, Tom } from '@/ui/komponenter';

export default function BarnUker() {
  const { barnId } = useLocalSearchParams<{ barnId: string }>();
  const { uker, laster } = useUker();
  if (laster) return <Laster />;

  const mine = uker.filter((u) => u.barnId === barnId);
  const totalt = mine.reduce((s, u) => s + u.tjentOre, 0);
  const stjerner = mine.reduce((s, u) => s + u.antallGodkjent, 0);
  const denne = ukeStart();

  return (
    <Skjerm>
      <Kort>
        <T dempet>Tjent totalt</T>
        <T v="visning">{kr(totalt)}</T>
        <T dempet>⭐ {stjerner} stjerner samlet</T>
      </Kort>
      {mine.length === 0 ? (
        <Tom ikon="📅" tittel="Ingen uker ennå" tekst="Kryss av en oppgave, så dukker uka opp her." />
      ) : (
        mine.map((u) => (
          <Rad key={u.ukeStart}>
            <View style={{ flex: 1 }}>
              <T fet>
                Uke {ukenummer(u.ukeStart)} · {ukeSpenn(u.ukeStart)}
              </T>
              <T dempet v="liten">
                ⭐ {u.antallGodkjent}
                {u.antallVenter ? ` · ${u.antallVenter} venter` : ''}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <T fet>{kr(u.tjentOre)}</T>
              {u.ukeStart === denne ? (
                <Pille tekst="Pågår" type="info" />
              ) : u.utbetalt ? (
                <Pille tekst="Betalt" type="godkjent" />
              ) : (
                <Pille tekst="Ikke betalt ennå" type="venter" />
              )}
            </View>
          </Rad>
        ))
      )}
    </Skjerm>
  );
}
