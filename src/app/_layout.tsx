import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/data/auth';
import { useMeg } from '@/data/familie';
import { ProfilProvider, useProfil } from '@/data/profil';
import { lastUtboks } from '@/data/utboks';
import { useVarsler } from '@/data/varsler';
import { Laster } from '@/ui/komponenter';
import { useFarger } from '@/ui/tema';

// Data hurtiglagres på enheten, så appen kan åpnes og vise oppgaver uten nett.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 1000 * 60 * 60 * 24 * 7, staleTime: 1000 * 30, networkMode: 'offlineFirst' },
    mutations: { networkMode: 'always' },
  },
});
const persister = createAsyncStoragePersister({ storage: AsyncStorage });

export default function RootLayout() {
  const skjema = useColorScheme();
  useVarsler();
  useEffect(() => {
    void lastUtboks();
  }, []);
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}>
      <AuthProvider>
        <ProfilProvider>
          <ThemeProvider value={skjema === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <Navigasjon />
          </ThemeProvider>
        </ProfilProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

function Navigasjon() {
  const f = useFarger();
  const { bruker, laster } = useAuth();
  const meg = useMeg();
  const profil = useProfil();

  const innlogget = !!bruker;
  const harFamilie = !!meg.data;

  if (laster || !profil.klar || (innlogget && meg.isPending)) return <Laster />;

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Tilbake',
        headerStyle: { backgroundColor: f.bg },
        headerTintColor: f.merke,
        headerTitleStyle: { color: f.tekst },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: f.bg },
      }}>
      <Stack.Screen name="invitasjon" options={{ headerShown: false }} />
      <Stack.Protected guard={!innlogget}>
        <Stack.Screen name="logg-inn" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={innlogget && !harFamilie}>
        <Stack.Screen name="velkommen" options={{ title: 'Velkommen' }} />
      </Stack.Protected>
      <Stack.Protected guard={innlogget && harFamilie}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pin" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="barn/[barnId]" options={{ headerShown: false }} />
        <Stack.Screen name="voksen" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
