import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useProfil } from '@/data/profil';
import { useSanntid, useUtforelser } from '@/data/utforelser';
import { ByttProfilKnapp, FaneIkon } from '@/ui/hode';
import { useFarger } from '@/ui/tema';

export default function VoksenLayout() {
  const f = useFarger();
  useSanntid();
  const { aktiv } = useProfil();
  const utforelser = useUtforelser();
  const venter = utforelser.data.filter((u) => u.status === 'venter').length;

  if (aktiv?.type !== 'voksen') return <Redirect href="/" />;

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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Til godkjenning',
          tabBarLabel: 'Godkjenn',
          tabBarIcon: () => <FaneIkon tegn="✅" />,
          tabBarBadge: venter > 0 ? venter : undefined,
        }}
      />
      <Tabs.Screen name="registrer" options={{ title: 'Registrer oppgave', tabBarLabel: 'Registrer', tabBarIcon: () => <FaneIkon tegn="➕" /> }} />
      <Tabs.Screen name="uker" options={{ title: 'Ukeoppgjør', tabBarLabel: 'Uker', tabBarIcon: () => <FaneIkon tegn="📅" /> }} />
      <Tabs.Screen name="oppgaver" options={{ title: 'Oppgaver og beløp', tabBarLabel: 'Oppgaver', tabBarIcon: () => <FaneIkon tegn="🧹" /> }} />
      <Tabs.Screen name="mer" options={{ title: 'Mer', tabBarIcon: () => <FaneIkon tegn="⚙️" /> }} />
    </Tabs>
  );
}
