import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Verdiene settes i .env (se .env.example). Publishable-nøkkelen er ment å ligge i appen;
// tilgang styres av Row Level Security i databasen.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Mangler EXPO_PUBLIC_SUPABASE_URL eller EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY i .env');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Forny innlogging bare mens appen er i forgrunnen.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Feil fra databasen (har en Postgres-kode) skal ikke prøves på nytt. Nettverksfeil skal. */
export function erNettverksfeil(feil: unknown): boolean {
  if (!feil || typeof feil !== 'object') return false;
  const f = feil as { code?: string; message?: string; status?: number };
  if (f.code) return false;
  const melding = (f.message ?? '').toLowerCase();
  return melding.includes('network') || melding.includes('fetch') || melding.includes('timeout') || f.status === 0;
}

/** Gjør en Supabase-feil om til en melding som kan vises til brukeren. */
export function feiltekst(feil: unknown): string {
  if (erNettverksfeil(feil)) return 'Ingen nettforbindelse. Prøv igjen når du er på nett.';
  const melding = (feil as { message?: string })?.message;
  return melding || 'Noe gikk galt. Prøv igjen.';
}
