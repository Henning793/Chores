import { Redirect, useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useBarn } from '@/data/familie';
import { useProfil } from '@/data/profil';
import { useSanntid } from '@/data/utforelser';
import { ByttProfilKnapp, FaneIkon } from '@/ui/hode';
import { useFarger } from '@/ui/tema';

export default function BarnLayout() {
  const f = useFarger();
  useSanntid();
  const { barnId } = useLocalSearchParams<{ barnId: string }>();
  const { aktiv } = useProfil();
  const barn = useBarn();
  const b = barn.data?.find((x) => x.id === barnId);

  if (aktiv?.type !== 'barn' || aktiv.id !== barnId) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <ByttProfilKnapp />,
        headerStyle: { backgroundColor: f.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: f.tekst, fontWeight: '700' },
        tabBarActiveTintColor: f.merke,
        tabBarInactiveTintColor: f.dempet,
        tabBarStyle: { backgroundColor: f.flate, borderTopColor: f.linje },
        sceneStyle: { backgroundColor: f.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: `Hei, ${b?.navn ?? ''}!`, tabBarLabel: 'Oppgaver', tabBarIcon: () => <FaneIkon tegn="✅" /> }} />
      <Tabs.Screen name="uker" options={{ title: 'Mine uker', tabBarIcon: () => <FaneIkon tegn="📅" /> }} />
    </Tabs>
  );
}
