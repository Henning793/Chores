import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { INVITASJON_NOKKEL } from '@/lib/konstanter';
import { Laster } from '@/ui/komponenter';

/** Åpnes fra invitasjonslenken. Husker koden til brukeren er logget inn, og sender videre. */
export default function Invitasjon() {
  const { t } = useLocalSearchParams<{ t?: string }>();
  const [ferdig, setFerdig] = useState(false);

  useEffect(() => {
    (t ? AsyncStorage.setItem(INVITASJON_NOKKEL, t) : Promise.resolve())
      .catch(() => {})
      .finally(() => setFerdig(true));
  }, [t]);

  return ferdig ? <Redirect href="/" /> : <Laster />;
}
