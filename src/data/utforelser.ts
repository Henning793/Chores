import { useMutation } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { collection, deleteField, doc, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useMemo } from 'react';

import { useAuth } from '@/data/auth';
import { useFamilieId } from '@/data/familie';
import { useLive } from '@/data/live';
import type { Oppgave, Ukesum, Utforelse } from '@/data/typer';
import { leggIKo, useUtboks, type Jobb } from '@/data/utboks';
import { db } from '@/lib/firebase';
import { leggTilDager, ukeStart } from '@/lib/uke';

/**
 * Avkrysninger fra forrige uke og fremover, pluss alt som venter.
 * Endringer som ligger i køen på enheten vises som om de allerede er lagret.
 */
export function useUtforelser() {
  const familieId = useFamilieId();
  const fra = leggTilDager(ukeStart(), -7);
  const samling = useMemo(() => collection(db, 'familier', familieId, 'utforelser'), [familieId]);
  const nylige = useLive<Utforelse>(
    ['utforelser', familieId, 'fra', fra],
    useMemo(() => query(samling, where('ukeStart', '>=', fra)), [samling, fra]),
  );
  const venter = useLive<Utforelse>(
    ['utforelser', familieId, 'venter'],
    useMemo(() => query(samling, where('status', '==', 'venter')), [samling]),
  );
  const ko = useUtboks();

  const data = useMemo(() => {
    const kart = new Map<string, Utforelse>();
    for (const u of [...(venter.data ?? []), ...(nylige.data ?? [])]) kart.set(u.id, u);
    return medKo([...kart.values()], ko.filter((j) => j.familieId === familieId));
  }, [nylige.data, venter.data, ko, familieId]);

  return { data, isPending: nylige.isPending && venter.isPending };
}

export function medKo(rader: Utforelse[], ko: Jobb[]): Utforelse[] {
  let ut = [...rader];
  for (const j of ko) {
    if (j.type === 'kryss' || j.type === 'registrer') {
      if (ut.some((r) => r.id === j.rad.id)) continue;
      const godkjent = j.type === 'registrer';
      ut.push({
        ...j.rad,
        ukeStart: ukeStart(new Date(j.rad.utfort)),
        status: godkjent ? 'godkjent' : 'venter',
        registrertAv: godkjent ? j.av : null,
        behandletAv: godkjent ? j.av : null,
        behandlet: godkjent ? j.rad.utfort : null,
        kommentar: null,
        ikkeSendt: true,
      });
    } else if (j.type === 'behandle') {
      ut = ut.map((r) =>
        r.id === j.utforelseId && r.status === 'venter'
          ? { ...r, status: j.godkjenn ? 'godkjent' : 'avvist', kommentar: j.kommentar, behandletAv: j.av, behandlet: j.tid, ikkeSendt: true }
          : r,
      );
    } else if (j.type === 'angre') {
      ut = ut.filter((r) => r.id !== j.utforelseId);
    }
  }
  return ut.sort((a, b) => b.utfort.localeCompare(a.utfort));
}

/** Handlinger som går via køen og virker uten nett. */
export function useUtforelseHandlinger() {
  const familieId = useFamilieId();
  const { bruker } = useAuth();
  const meg = bruker?.uid ?? '';

  const ny = (barnId: string, oppgave: Oppgave, merknad: string | null, utfort: Date, nyttForsokAv: string | null) => ({
    id: randomUUID(),
    barnId,
    oppgaveId: oppgave.id,
    merknad: merknad?.trim() || null,
    belopOre: oppgave.belopOre,
    utfort: utfort.toISOString(),
    nyttForsokAv,
  });

  return {
    kryssAv(barnId: string, oppgave: Oppgave, merknad: string | null, nyttForsokAv: string | null = null) {
      leggIKo({ jobbId: randomUUID(), familieId, type: 'kryss', rad: ny(barnId, oppgave, merknad, new Date(), nyttForsokAv) });
    },
    registrer(barnId: string, oppgave: Oppgave, merknad: string | null, utfort: Date) {
      leggIKo({ jobbId: randomUUID(), familieId, type: 'registrer', av: meg, rad: ny(barnId, oppgave, merknad, utfort, null) });
    },
    behandle(utforelseId: string, godkjenn: boolean, kommentar: string | null = null) {
      leggIKo({
        jobbId: randomUUID(),
        familieId,
        type: 'behandle',
        utforelseId,
        godkjenn,
        kommentar: kommentar?.trim() || null,
        av: meg,
        tid: new Date().toISOString(),
      });
    },
    angre(utforelseId: string) {
      leggIKo({ jobbId: randomUUID(), familieId, type: 'angre', utforelseId });
    },
  };
}

/** Ukesummer for alle barn og alle uker (historikk). */
export function useUkesummer() {
  const familieId = useFamilieId();
  const q = useMemo(() => query(collection(db, 'familier', familieId, 'uker')), [familieId]);
  return useLive<Ukesum>(['uker', familieId], q);
}

export function useMarkerBetalt() {
  const familieId = useFamilieId();
  const { bruker } = useAuth();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (v: { barnId: string; ukeStart: string; belopOre: number }) => {
      setDoc(
        doc(db, 'familier', familieId, 'uker', `${v.barnId}_${v.ukeStart}`),
        { barnId: v.barnId, ukeStart: v.ukeStart, utbetaltOre: v.belopOre, utbetalt: new Date().toISOString(), utbetaltAv: bruker!.uid },
        { merge: true },
      ).catch((e) => console.warn('Lagring feilet', e));
    },
  });
}

export function useAngreBetalt() {
  const familieId = useFamilieId();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (v: { barnId: string; ukeStart: string }) => {
      updateDoc(doc(db, 'familier', familieId, 'uker', `${v.barnId}_${v.ukeStart}`), {
        utbetaltOre: deleteField(),
        utbetalt: deleteField(),
        utbetaltAv: deleteField(),
      }).catch((e) => console.warn('Lagring feilet', e));
    },
  });
}
