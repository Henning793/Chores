import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useVoksne } from '@/data/familie';
import { sjekkPin, useProfil } from '@/data/profil';
import { Avatar, Feilmelding, PinTastatur, Skjerm, T } from '@/ui/komponenter';
import { avstand } from '@/ui/tema';

export default function Pin() {
  const { voksen } = useLocalSearchParams<{ voksen: string }>();
  const voksne = useVoksne();
  const { velgVoksen } = useProfil();
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [sjekker, setSjekker] = useState(false);

  const v = voksne.data?.find((x) => x.bruker_id === voksen);

  async function endre(ny: string) {
    setFeil(null);
    setPin(ny);
    if (ny.length !== 4 || !voksen) return;
    setSjekker(true);
    const svar = await sjekkPin(voksen, ny).catch(() => 'feil' as const);
    setSjekker(false);
    if (svar === 'riktig') {
      velgVoksen(voksen);
      router.dismissTo('/');
      return;
    }
    setPin('');
    setFeil(
      svar === 'sperret'
        ? 'For mange forsøk. Vent fem minutter.'
        : svar === 'ukjent-offline'
          ? 'Ingen nettforbindelse. Uten nett kan PIN bare sjekkes på en enhet der den er brukt før.'
          : 'Feil PIN. Prøv igjen.',
    );
  }

  return (
    <Skjerm stil={{ alignItems: 'center', gap: avstand.xl }}>
      <View style={{ alignItems: 'center', gap: avstand.s }}>
        <Avatar navn={v?.visningsnavn ?? '?'} bildeSti={v?.bilde_sti} storrelse={72} />
        <T v="tittel">Hei, {v?.visningsnavn}</T>
        <T dempet>Skriv inn PIN-koden din</T>
      </View>
      <PinTastatur verdi={pin} onEndre={endre} deaktivert={sjekker} />
      <Feilmelding tekst={feil} />
    </Skjerm>
  );
}
