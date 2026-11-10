import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthVerdi = {
  session: Session | null;
  laster: boolean;
  sendKode: (epost: string) => Promise<void>;
  bekreftKode: (epost: string, kode: string) => Promise<void>;
  loggInnMedGoogle: () => Promise<void>;
  loggUt: () => Promise<void>;
};

const AuthKontekst = createContext<AuthVerdi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [laster, setLaster] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLaster(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_hendelse, ny) => setSession(ny));
    return () => data.subscription.unsubscribe();
  }, []);

  const verdi: AuthVerdi = {
    session,
    laster,
    async sendKode(epost) {
      const { error } = await supabase.auth.signInWithOtp({ email: epost.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    async bekreftKode(epost, kode) {
      const { error } = await supabase.auth.verifyOtp({ email: epost.trim(), token: kode.trim(), type: 'email' });
      if (error) throw error;
    },
    async loggInnMedGoogle() {
      const redirectTo = makeRedirectUri({ path: 'auth' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const resultat = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (resultat.type !== 'success') return;
      const kode = new URL(resultat.url).searchParams.get('code');
      if (!kode) throw new Error('Innloggingen ble avbrutt.');
      const { error: byttFeil } = await supabase.auth.exchangeCodeForSession(kode);
      if (byttFeil) throw byttFeil;
    },
    async loggUt() {
      await supabase.auth.signOut();
    },
  };

  return <AuthKontekst.Provider value={verdi}>{children}</AuthKontekst.Provider>;
}

export function useAuth(): AuthVerdi {
  const v = useContext(AuthKontekst);
  if (!v) throw new Error('useAuth må brukes innenfor AuthProvider');
  return v;
}
