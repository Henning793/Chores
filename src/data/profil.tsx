import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Voksen } from '@/data/typer';
import { pinHash } from '@/lib/pin';

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
// PIN: sjekkes mot den voksnes dokument (lagret på enheten, så det virker uten nett).
// Etter fem feil på denne enheten sperres det i fem minutter.
// ---------------------------------------------------------------------------

export type PinSvar = 'riktig' | 'feil' | 'sperret' | 'mangler';

const SPERRE_NOKKEL = 'pin.sperre';
type Sperre = Record<string, { feil: number; til: number | null }>;

async function lesSperre(): Promise<Sperre> {
  try {
    return JSON.parse((await AsyncStorage.getItem(SPERRE_NOKKEL)) ?? '{}') as Sperre;
  } catch {
    return {};
  }
}

export async function sjekkPin(voksen: Voksen, pin: string): Promise<PinSvar> {
  if (!voksen.pinHash || !voksen.pinSalt) return 'mangler';
  const sperre = await lesSperre();
  const s = sperre[voksen.id] ?? { feil: 0, til: null };
  if (s.til && s.til > Date.now()) return 'sperret';

  const riktig = (await pinHash(voksen.id, voksen.pinSalt, pin)) === voksen.pinHash;
  sperre[voksen.id] = riktig
    ? { feil: 0, til: null }
    : { feil: s.feil + 1, til: s.feil + 1 >= 5 ? Date.now() + 5 * 60 * 1000 : null };
  await AsyncStorage.setItem(SPERRE_NOKKEL, JSON.stringify(sperre)).catch(() => {});
  if (riktig) return 'riktig';
  return sperre[voksen.id].til ? 'sperret' : 'feil';
}
