import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// Verdiene settes i .env (se .env.example). Publishable/anon-nøkkelen er ment å ligge i appen;
// tilgang styres av Row Level Security i databasen.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Mangler EXPO_PUBLIC_SUPABASE_URL eller EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY i .env');
}

// TODO (etter godkjent design): sikker lagring av sesjon (expo-secure-store) og autoRefresh ved AppState.
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
