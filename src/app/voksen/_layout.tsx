import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useFristvarsler, useGjoremal } from '@/data/gjoremal';
import { useProfil } from '@/data/profil';
import { useUtforelser } from '@/data/utforelser';
import { dagFor } from '@/lib/uke';
import { ByttProfilKnapp, StrekIkon } from '@/ui/hode';
import { useFarger } from '@/ui/tema';

/**
 * Voksenvisningen er delt i to rom:
 * «Barna» (gult) for alt som handler om barna, og «Gjøremål» (blått) for de voksnes egen liste.
 */
export default function VoksenLayout() {
  const f = useFarger();
  const { aktiv } = useProfil();
  const utforelser = useUtforelser();
  const gjoremal = useGjoremal();
  useFristvarsler(gjoremal.data);

  if (aktiv?.type !== 'voksen') return <Redirect href="/" />;

  const venter = utforelser.data.filter((u) => u.status === 'venter').length;
  const idag = dagFor();
  const haster = (gjoremal.data ?? []).filter((g) => !g.fullfort && g.frist && g.frist <= idag).length;

  const felles = {
    headerRight: () => <ByttProfilKnapp />,
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '800' as const, fontSize: 22 },
    headerTitleAlign: 'left' as const,
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: f.flate, borderTopColor: f.linje, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarInactiveTintColor: f.dempet,
        sceneStyle: { backgroundColor: f.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          ...felles,
          title: 'Barna',
          headerStyle: { backgroundColor: f.barnRom },
          headerTintColor: f.barnRomTekst,
          tabBarActiveTintColor: f.barnRomTekst,
          tabBarIcon: ({ focused, color }) => <StrekIkon navn="happy" fokus={focused} farge={color} pille={f.barnRom} />,
          tabBarBadge: venter > 0 ? venter : undefined,
        }}
      />
      <Tabs.Screen
        name="gjoremal"
        options={{
          ...felles,
          title: 'Gjøremål',
          headerStyle: { backgroundColor: f.merkeMyk },
          headerTintColor: f.merke,
          tabBarActiveTintColor: f.merke,
          tabBarIcon: ({ focused, color }) => <StrekIkon navn="clipboard" fokus={focused} farge={color} pille={f.merkeMyk} />,
          tabBarBadge: haster > 0 ? haster : undefined,
        }}
      />
      <Tabs.Screen
        name="mer"
        options={{
          ...felles,
          title: 'Mer',
          headerStyle: { backgroundColor: f.bg },
          headerTintColor: f.tekst,
          tabBarActiveTintColor: f.tekst,
          tabBarIcon: ({ focused, color }) => <StrekIkon navn="ellipsis-horizontal-circle" fokus={focused} farge={color} pille={f.linje} />,
        }}
      />
    </Tabs>
  );
}
