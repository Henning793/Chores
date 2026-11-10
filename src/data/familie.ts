import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import {
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useMemo } from 'react';

import { useAuth } from '@/data/auth';
import { useLive } from '@/data/live';
import type { Barn, Familie, Oppgave, Voksen } from '@/data/typer';
import { db } from '@/lib/firebase';
import { lagPin } from '@/lib/pin';

/** Den innloggede voksne og familien hen tilhører (null hvis ingen familie ennå). */
export function useMeg() {
  const { bruker } = useAuth();
  const uid = bruker?.uid;
  return useQuery({
    queryKey: ['meg', uid],
    enabled: !!uid,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      const b = await getDoc(doc(db, 'brukere', uid!));
      const familieId = b.data()?.familieId as string | undefined;
      if (!familieId) return null;
      const [f, v] = await Promise.all([
        getDoc(doc(db, 'familier', familieId)),
        getDoc(doc(db, 'familier', familieId, 'voksne', uid!)),
      ]);
      if (!f.exists() || !v.exists()) return null;
      return {
        familie: { id: f.id, ...f.data() } as Familie,
        voksen: { id: v.id, ...v.data() } as Voksen,
      };
    },
  });
}

/** Familie-ID for innlogget bruker. Kaster hvis brukt før familien er lastet. */
export function useFamilieId(): string {
  const { data } = useMeg();
  if (!data) throw new Error('Familien er ikke lastet');
  return data.familie.id;
}

const ikkeArkivert = <T extends { arkivert: string | null; rekkefolge: number }>(rader: T[] | undefined) =>
  (rader ?? []).filter((r) => !r.arkivert).sort((a, b) => a.rekkefolge - b.rekkefolge);

export function useBarn() {
  const familieId = useFamilieId();
  const q = useMemo(() => query(collection(db, 'familier', familieId, 'barn')), [familieId]);
  const r = useLive<Barn>(['barn', familieId], q);
  const data = useMemo(() => ikkeArkivert(r.data), [r.data]);
  return { ...r, data };
}

export function useVoksne() {
  const familieId = useFamilieId();
  const q = useMemo(() => query(collection(db, 'familier', familieId, 'voksne')), [familieId]);
  return useLive<Voksen>(['voksne', familieId], q);
}

export function useOppgaver() {
  const familieId = useFamilieId();
  const q = useMemo(() => query(collection(db, 'familier', familieId, 'oppgaver')), [familieId]);
  const r = useLive<Oppgave>(['oppgaver', familieId], q);
  const data = useMemo(() => ikkeArkivert(r.data), [r.data]);
  return { ...r, data };
}

// ---------------------------------------------------------------------------
// Familie og invitasjon
// ---------------------------------------------------------------------------

export function useOpprettFamilie() {
  const qc = useQueryClient();
  const { bruker } = useAuth();
  return useMutation({
    mutationFn: async (v: { familienavn: string; visningsnavn: string; pin: string }) => {
      const uid = bruker!.uid;
      const familieRef = doc(collection(db, 'familier'));
      const batch = writeBatch(db);
      batch.set(familieRef, { navn: v.familienavn, opprettetAv: uid, opprettet: serverTimestamp() });
      batch.set(doc(familieRef, 'voksne', uid), {
        visningsnavn: v.visningsnavn,
        bilde: null,
        ...(await lagPin(uid, v.pin)),
        opprettet: serverTimestamp(),
      });
      batch.set(doc(db, 'brukere', uid), { familieId: familieRef.id });
      await batch.commit();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meg'] }),
  });
}

export function useGodtaInvitasjon() {
  const qc = useQueryClient();
  const { bruker } = useAuth();
  return useMutation({
    mutationFn: async (v: { token: string; visningsnavn: string; pin: string }) => {
      const uid = bruker!.uid;
      const invRef = doc(db, 'invitasjoner', v.token);
      const inv = await getDoc(invRef).catch(() => null);
      const data = inv?.data();
      if (!data || data.brukt || (data.utloper as Timestamp).toMillis() < Date.now()) {
        throw new Error('Invitasjonen er ugyldig, brukt eller utløpt. Be om en ny lenke.');
      }
      const familieId = data.familieId as string;
      const batch = writeBatch(db);
      batch.set(doc(db, 'familier', familieId, 'voksne', uid), {
        visningsnavn: v.visningsnavn,
        bilde: null,
        ...(await lagPin(uid, v.pin)),
        invitasjon: v.token,
        opprettet: serverTimestamp(),
      });
      batch.update(invRef, { brukt: serverTimestamp(), bruktAv: uid });
      batch.set(doc(db, 'brukere', uid), { familieId });
      await batch.commit();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meg'] }),
  });
}

/** Lager en invitasjon som er gyldig i 2 timer. Gir token til lenken. */
export async function opprettInvitasjon(familieId: string, uid: string): Promise<{ token: string; utloper: number }> {
  const token = (randomUUID() + randomUUID()).replace(/-/g, '');
  const utloper = Date.now() + 2 * 60 * 60 * 1000 - 30 * 1000; // litt margin mot klokkeforskjell
  await setDoc(doc(db, 'invitasjoner', token), {
    familieId,
    opprettetAv: uid,
    opprettet: serverTimestamp(),
    utloper: Timestamp.fromMillis(utloper),
    brukt: null,
    bruktAv: null,
  });
  return { token, utloper };
}

const loggFeil = (e: unknown) => console.warn('Lagring feilet', e);

// ---------------------------------------------------------------------------
// Barn, oppgaver og egen profil. Firestore viser endringen med en gang, også uten nett.
// ---------------------------------------------------------------------------

export function useLagreBarn() {
  const familieId = useFamilieId();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (b: Partial<Barn> & { navn: string }) => {
      const { id, ...rest } = b;
      const ref = id ? doc(db, 'familier', familieId, 'barn', id) : doc(collection(db, 'familier', familieId, 'barn'));
      const ny = id ? {} : { rekkefolge: Date.now(), arkivert: null, bilde: null };
      setDoc(ref, { ...ny, ...rest }, { merge: true }).catch(loggFeil);
    },
  });
}

export function useArkiverBarn() {
  const familieId = useFamilieId();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      updateDoc(doc(db, 'familier', familieId, 'barn', id), { arkivert: new Date().toISOString() }).catch(loggFeil);
    },
  });
}

export function useLagreOppgave() {
  const familieId = useFamilieId();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (o: Partial<Oppgave> & { tittel: string; belopOre: number }) => {
      const { id, ...rest } = o;
      const ref = id ? doc(db, 'familier', familieId, 'oppgaver', id) : doc(collection(db, 'familier', familieId, 'oppgaver'));
      const ny = id ? {} : { rekkefolge: Date.now(), arkivert: null };
      setDoc(ref, { ...ny, ...rest }, { merge: true }).catch(loggFeil);
    },
  });
}

export function useArkiverOppgave() {
  const familieId = useFamilieId();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      updateDoc(doc(db, 'familier', familieId, 'oppgaver', id), { arkivert: new Date().toISOString() }).catch(loggFeil);
    },
  });
}

export function useLagreVoksen() {
  const qc = useQueryClient();
  const { bruker } = useAuth();
  const familieId = useFamilieId();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (v: { visningsnavn?: string; bilde?: string | null; pin?: string }) => {
      const { pin, ...rest } = v;
      const endring = pin ? { ...rest, ...(await lagPin(bruker!.uid, pin)) } : rest;
      updateDoc(doc(db, 'familier', familieId, 'voksne', bruker!.uid), endring).catch(loggFeil);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meg'] }),
  });
}
