// Kø for endringer som skal fungere uten nett: avkrysning, godkjenning/avvisning,
// registrering og angring. Køen lagres på enheten og sendes i rekkefølge når nettet er tilbake.
// Hver jobb har en ID laget på enheten, så det er trygt å sende samme jobb to ganger.

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { erNettverksfeil, supabase } from '@/lib/supabase';

export type KryssJobb = {
  type: 'kryss';
  rad: {
    id: string;
    familie_id: string;
    barn_id: string;
    oppgave_id: string;
    merknad: string | null;
    belop_ore: number;
    utfort: string;
    nytt_forsok_av: string | null;
  };
};
export type BehandleJobb = { type: 'behandle'; utforelseId: string; godkjenn: boolean; kommentar: string | null; av: string; tid: string };
export type RegistrerJobb = {
  type: 'registrer';
  rad: KryssJobb['rad'];
  av: string;
};
export type AngreJobb = { type: 'angre'; utforelseId: string };

export type Jobb = (KryssJobb | BehandleJobb | RegistrerJobb | AngreJobb) & { jobbId: string };

const NOKKEL = 'utboks.v1';
let ko: Jobb[] = [];
let lastet = false;
let sender = false;
const lyttere = new Set<() => void>();
let etterSending: (() => void) | null = null;

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

/** Kalles etter at køen er tømt, så appen kan hente ferske data. */
export function vedSendt(fn: () => void) {
  etterSending = fn;
}

async function utfor(j: Jobb): Promise<void> {
  switch (j.type) {
    case 'kryss': {
      const { error } = await supabase.from('utforelser').insert(j.rad);
      if (error && error.code !== '23505') throw error; // 23505 = allerede lagret
      return;
    }
    case 'registrer': {
      const r = j.rad;
      const { error } = await supabase.rpc('registrer_utforelse', {
        p_id: r.id,
        p_barn: r.barn_id,
        p_oppgave: r.oppgave_id,
        p_merknad: r.merknad,
        p_utfort: r.utfort,
      });
      if (error) throw error;
      return;
    }
    case 'behandle': {
      const { error } = await supabase.rpc('behandle_utforelse', {
        p_id: j.utforelseId,
        p_godkjenn: j.godkjenn,
        p_kommentar: j.kommentar,
      });
      if (error && !error.message.includes('allerede behandlet')) throw error;
      return;
    }
    case 'angre': {
      const { error } = await supabase.from('utforelser').delete().eq('id', j.utforelseId).eq('status', 'venter');
      if (error) throw error;
      return;
    }
  }
}

export async function send(): Promise<void> {
  if (sender || !lastet || ko.length === 0) return;
  sender = true;
  let sendteNoe = false;
  try {
    while (ko.length > 0) {
      const jobb = ko[0];
      try {
        await utfor(jobb);
      } catch (feil) {
        if (erNettverksfeil(feil)) break; // prøv igjen når nettet er tilbake
        console.warn('Forkastet jobb som databasen avviste', jobb, feil);
      }
      ko = ko.slice(1);
      sendteNoe = true;
      varsle();
      await lagre();
    }
  } finally {
    sender = false;
    if (sendteNoe) etterSending?.();
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
