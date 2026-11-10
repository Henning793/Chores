import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/data/auth';
import { useFamilieId, useVoksne } from '@/data/familie';
import { sjekkPin, useProfil } from '@/data/profil';
import { registrerForVarsler } from '@/data/varsler';
import { Avatar, Feilmelding, PinTastatur, Skjerm, T } from '@/ui/komponenter';
import { avstand } from '@/ui/tema';

export default function Pin() {
  const { voksen } = useLocalSearchParams<{ voksen: string }>();
  const voksne = useVoksne();
  const familieId = useFamilieId();
  const { bruker } = useAuth();
  const { velgVoksen } = useProfil();
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [sjekker, setSjekker] = useState(false);

  const v = voksne.data?.find((x) => x.id === voksen);

  async function endre(ny: string) {
    setFeil(null);
    setPin(ny);
    if (ny.length !== 4 || !voksen || !v) return;
    setSjekker(true);
    if (!v) return;
    const svar = await sjekkPin(v, ny).catch(() => 'feil' as const);
    setSjekker(false);
    if (svar === 'riktig') {
      // Enheter der en voksen har åpnet profilen sin, får varsel når barn krysser av.
      if (bruker) void registrerForVarsler(familieId, bruker.uid);
      velgVoksen(voksen);
      router.dismissTo('/');
      return;
    }
    setPin('');
    setFeil(
      svar === 'sperret'
        ? 'For mange forsøk. Vent fem minutter.'
        : svar === 'mangler'
          ? 'Denne voksne har ikke valgt PIN ennå.'
          : 'Feil PIN. Prøv igjen.',
    );
  }

  return (
    <Skjerm stil={{ alignItems: 'center', gap: avstand.xl }}>
      <View style={{ alignItems: 'center', gap: avstand.s }}>
        <Avatar navn={v?.visningsnavn ?? '?'} bilde={v?.bilde} storrelse={72} />
        <T v="tittel">Hei, {v?.visningsnavn}</T>
        <T dempet>Skriv inn PIN-koden din</T>
      </View>
      <PinTastatur verdi={pin} onEndre={endre} deaktivert={sjekker} />
      <Feilmelding tekst={feil} />
    </Skjerm>
  );
}
