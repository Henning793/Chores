import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/lib/firebase';

type AuthVerdi = {
  bruker: User | null;
  laster: boolean;
  loggInn: (epost: string, passord: string) => Promise<void>;
  opprettBruker: (epost: string, passord: string) => Promise<void>;
  glemtPassord: (epost: string) => Promise<void>;
  loggInnMedGoogle: (idToken: string) => Promise<void>;
  loggUt: () => Promise<void>;
};

const AuthKontekst = createContext<AuthVerdi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bruker, setBruker] = useState<User | null>(auth.currentUser);
  const [laster, setLaster] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (b) => {
        setBruker(b);
        setLaster(false);
      }),
    [],
  );

  const verdi: AuthVerdi = {
    bruker,
    laster,
    async loggInn(epost, passord) {
      await signInWithEmailAndPassword(auth, epost.trim(), passord);
    },
    async opprettBruker(epost, passord) {
      await createUserWithEmailAndPassword(auth, epost.trim(), passord);
    },
    async glemtPassord(epost) {
      auth.languageCode = 'no';
      await sendPasswordResetEmail(auth, epost.trim());
    },
    async loggInnMedGoogle(idToken) {
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    },
    async loggUt() {
      await signOut(auth);
    },
  };

  return <AuthKontekst.Provider value={verdi}>{children}</AuthKontekst.Provider>;
}

export function useAuth(): AuthVerdi {
  const v = useContext(AuthKontekst);
  if (!v) throw new Error('useAuth må brukes innenfor AuthProvider');
  return v;
}
