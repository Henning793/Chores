import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { erNettverksfeil, supabase } from '@/lib/supabase';

/** Hvem appen brukes på vegne av akkurat nå. Nullstilles når appen startes på nytt. */
export type AktivProfil = { type: 'barn'; id: string } | { type: 'voksen'; id: string } | null;

type ProfilVerdi = {
  aktiv: AktivProfil;
  velgBarn: (id: string) => void;
  /** Kalles etter riktig PIN. */
  velgVoksen: (id: string) => void;
  bytt: () => void;
  /** Barnet enheten er låst til, eller null. */
  lastBarn: string | null;
  settLastBarn: (id: string | null) => void;
  klar: boolean;
};

const Kontekst = createContext<ProfilVerdi | null>(null);
const LAS_NOKKEL = 'enhet.lastBarn';

export function ProfilProvider({ children }: { children: ReactNode }) {
  const [aktiv, setAktiv] = useState<AktivProfil>(null);
  const [lastBarn, setLastBarn] = useState<string | null>(null);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAS_NOKKEL)
      .then((id) => {
        setLastBarn(id);
        if (id) setAktiv({ type: 'barn', id });
      })
      .catch(() => {})
      .finally(() => setKlar(true));
  }, []);

  const verdi: ProfilVerdi = {
    aktiv,
    lastBarn,
    klar,
    velgBarn: (id) => setAktiv({ type: 'barn', id }),
    velgVoksen: (id) => setAktiv({ type: 'voksen', id }),
    bytt: () => setAktiv(null),
    settLastBarn: (id) => {
      setLastBarn(id);
      (id ? AsyncStorage.setItem(LAS_NOKKEL, id) : AsyncStorage.removeItem(LAS_NOKKEL)).catch(() => {});
    },
  };
  return <Kontekst.Provider value={verdi}>{children}</Kontekst.Provider>;
}

export function useProfil(): ProfilVerdi {
  const v = useContext(Kontekst);
  if (!v) throw new Error('useProfil må brukes innenfor ProfilProvider');
  return v;
}

// ---------------------------------------------------------------------------
// PIN
// ---------------------------------------------------------------------------

const pinNokkel = (brukerId: string) => `pin_${brukerId.replace(/-/g, '')}`;
const hash = (brukerId: string, pin: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, `${brukerId}:${pin}`);

export type PinSvar = 'riktig' | 'feil' | 'sperret' | 'ukjent-offline';

/**
 * Sjekker PIN mot serveren. Uten nett brukes en lokal kopi fra siste vellykkede sjekk på denne enheten.
 */
export async function sjekkPin(brukerId: string, pin: string): Promise<PinSvar> {
  const { data, error } = await supabase.rpc('sjekk_pin', { p_bruker: brukerId, p_pin: pin });
  if (!error) {
    if (data === true) {
      await SecureStore.setItemAsync(pinNokkel(brukerId), await hash(brukerId, pin)).catch(() => {});
      return 'riktig';
    }
    return 'feil';
  }
  if (!erNettverksfeil(error)) return error.message.includes('For mange') ? 'sperret' : 'feil';

  const lagret = await SecureStore.getItemAsync(pinNokkel(brukerId)).catch(() => null);
  if (!lagret) return 'ukjent-offline';
  return lagret === (await hash(brukerId, pin)) ? 'riktig' : 'feil';
}

export async function huskPinLokalt(brukerId: string, pin: string) {
  await SecureStore.setItemAsync(pinNokkel(brukerId), await hash(brukerId, pin)).catch(() => {});
}
