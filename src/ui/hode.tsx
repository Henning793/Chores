import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View, type ColorValue } from 'react-native';

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

type IkonNavn = ComponentProps<typeof Ionicons>['name'];

/**
 * Strekikon i fanelinja. Den valgte fanen får en myk pille bak ikonet i rommets farge.
 * `pille` og `farge` styres av fanen, så Barna blir gul og Gjøremål blå.
 */
export function StrekIkon({ navn, fokus, farge, pille }: { navn: IkonNavn; fokus: boolean; farge: ColorValue; pille: string }) {
  return (
    <View
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fokus ? pille : 'transparent',
      }}>
      <Ionicons name={fokus ? navn : (`${navn}-outline` as IkonNavn)} size={21} color={farge as string} />
    </View>
  );
}

/** Emoji i fanelinja hos barna, som ikke kan lese ennå. */
export function FaneIkon({ tegn }: { tegn: string }) {
  return <Text style={{ fontSize: 20 }}>{tegn}</Text>;
}
