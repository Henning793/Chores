// Kø for endringer som skal fungere uten nett: avkrysning, godkjenning/avvisning,
// registrering og angring. Køen lagres på enheten og sendes i rekkefølge når nettet er tilbake.
// Hver jobb kjøres som en Firestore-transaksjon som sjekker tilstanden først, så det er trygt
// å sende samme jobb to ganger (ingen dobbel telling i ukesummen).

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { doc, increment, runTransaction } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { db, erNettverksfeil } from '@/lib/firebase';
import { ukeStart } from '@/lib/uke';

export type NyUtforelse = {
  id: string;
  barnId: string;
  oppgaveId: string;
  merknad: string | null;
  belopOre: number;
  utfort: string;
  nyttForsokAv: string | null;
};

export type Jobb = { jobbId: string; familieId: string } & (
  | { type: 'kryss'; rad: NyUtforelse }
  | { type: 'registrer'; rad: NyUtforelse; av: string }
  | { type: 'behandle'; utforelseId: string; godkjenn: boolean; kommentar: string | null; av: string; tid: string }
  | { type: 'angre'; utforelseId: string }
);

const NOKKEL = 'utboks.v2';
let ko: Jobb[] = [];
let lastet = false;
let sender = false;
const lyttere = new Set<() => void>();
let etterKryss: ((jobb: Jobb) => void) | null = null;

function varsle() {
  lyttere.forEach((l) => l());
}

async function lagre() {
  try {
    await AsyncStorage.setItem(NOKKEL, JSON.stringify(ko));
  } catch {
    // Lagring feilet; køen ligger fortsatt i minnet.
  }
}

export async function lastUtboks() {
  if (lastet) return;
  try {
    const tekst = await AsyncStorage.getItem(NOKKEL);
    ko = tekst ? (JSON.parse(tekst) as Jobb[]) : [];
  } catch {
    ko = [];
  }
  lastet = true;
  varsle();
  void send();
}

export function leggIKo(jobb: Jobb) {
  ko = [...ko, jobb];
  varsle();
  void lagre().then(send);
}

/** Kalles etter at et barns avkrysning er lagret, f.eks. for å sende pushvarsel. */
export function vedKryssSendt(fn: ((jobb: Jobb) => void) | null) {
  etterKryss = fn;
}

const utfRef = (familieId: string, id: string) => doc(db, 'familier', familieId, 'utforelser', id);
const ukeRef = (familieId: string, barnId: string, uke: string) => doc(db, 'familier', familieId, 'uker', `${barnId}_${uke}`);

/** Utfører én jobb. Gir true hvis noe faktisk ble endret. */
async function utfor(j: Jobb): Promise<boolean> {
  const f = j.familieId;
  switch (j.type) {
    case 'kryss':
      return runTransaction(db, async (tx) => {
        const ref = utfRef(f, j.rad.id);
        if ((await tx.get(ref)).exists()) return false;
        tx.set(ref, {
          ...j.rad,
          ukeStart: ukeStart(new Date(j.rad.utfort)),
          status: 'venter',
          registrertAv: null,
          behandletAv: null,
          behandlet: null,
          kommentar: null,
        });
        return true;
      });

    case 'registrer':
      return runTransaction(db, async (tx) => {
        const ref = utfRef(f, j.rad.id);
        if ((await tx.get(ref)).exists()) return false;
        const uke = ukeStart(new Date(j.rad.utfort));
        tx.set(ref, {
          ...j.rad,
          ukeStart: uke,
          status: 'godkjent',
          registrertAv: j.av,
          behandletAv: j.av,
          behandlet: j.rad.utfort,
          kommentar: null,
        });
        tx.set(
          ukeRef(f, j.rad.barnId, uke),
          { barnId: j.rad.barnId, ukeStart: uke, tjentOre: increment(j.rad.belopOre), antallGodkjent: increment(1) },
          { merge: true },
        );
        return true;
      });

    case 'behandle':
      return runTransaction(db, async (tx) => {
        const ref = utfRef(f, j.utforelseId);
        const snap = await tx.get(ref);
        const u = snap.data();
        if (!u || u.status !== 'venter') return false;
        tx.update(ref, {
          status: j.godkjenn ? 'godkjent' : 'avvist',
          kommentar: j.kommentar,
          behandletAv: j.av,
          behandlet: j.tid,
        });
        if (j.godkjenn) {
          tx.set(
            ukeRef(f, u.barnId, u.ukeStart),
            { barnId: u.barnId, ukeStart: u.ukeStart, tjentOre: increment(u.belopOre), antallGodkjent: increment(1) },
            { merge: true },
          );
        }
        return true;
      });

    case 'angre':
      return runTransaction(db, async (tx) => {
        const ref = utfRef(f, j.utforelseId);
        const snap = await tx.get(ref);
        if (!snap.exists() || snap.data().status !== 'venter') return false;
        tx.delete(ref);
        return true;
      });
  }
}

export async function send(): Promise<void> {
  if (sender || !lastet || ko.length === 0) return;
  sender = true;
  try {
    while (ko.length > 0) {
      const jobb = ko[0];
      try {
        const endret = await utfor(jobb);
        if (endret && jobb.type === 'kryss') etterKryss?.(jobb);
      } catch (feil) {
        if (erNettverksfeil(feil)) break; // prøv igjen når nettet er tilbake
        console.warn('Forkastet jobb som ble avvist', jobb, feil);
      }
      ko = ko.slice(1);
      varsle();
      await lagre();
    }
  } finally {
    sender = false;
  }
}

NetInfo.addEventListener((s) => {
  if (s.isConnected) void send();
});
AppState.addEventListener('change', (s) => {
  if (s === 'active') void send();
});

function abonner(l: () => void) {
  lyttere.add(l);
  return () => lyttere.delete(l);
}

export function useUtboks(): Jobb[] {
  return useSyncExternalStore(abonner, () => ko);
}
