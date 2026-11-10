import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useProfil } from '@/data/profil';
import { useFarger } from '@/ui/tema';

/** Knapp i headeren som går tilbake til «Hvem bruker appen?». */
export function ByttProfilKnapp() {
  const f = useFarger();
  const { bytt, lastBarn } = useProfil();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={12}
      onPress={() => {
        bytt();
        router.dismissTo('/');
      }}
      style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: f.merke, fontWeight: '700', fontSize: 16 }}>{lastBarn ? '🔒 Bytt' : 'Bytt'}</Text>
    </Pressable>
  );
}

/** Ikon i fanelinja. */
export function FaneIkon({ tegn }: { tegn: string }) {
  return <Text style={{ fontSize: 20 }}>{tegn}</Text>;
}
