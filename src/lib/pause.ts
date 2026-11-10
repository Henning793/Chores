// Pause mellom avkrysninger av samme oppgave for samme barn.
// Håndheves også i firestore.rules (samlingen «sperrer»).
import { useEffect, useState } from 'react';

import type { Oppgave, Utforelse } from '@/data/typer';

export const STANDARD_PAUSE_MIN = 5;

export const PAUSEVALG: { min: number; tekst: string }[] = [
  { min: 0, tekst: 'Ingen' },
  { min: 5, tekst: '5 min' },
  { min: 15, tekst: '15 min' },
  { min: 30, tekst: '30 min' },
  { min: 60, tekst: '1 time' },
  { min: 240, tekst: '4 timer' },
];

export function pauseMin(o: Pick<Oppgave, 'pauseMin'>): number {
  return o.pauseMin ?? STANDARD_PAUSE_MIN;
}

/** Millisekunder igjen av pausen, eller 0 hvis barnet kan krysse av nå. */
export function pauseIgjen(o: Oppgave, barnId: string, utforelser: Utforelse[], naa: number): number {
  const min = pauseMin(o);
  if (min <= 0) return 0;
  // Bare barnets egne avkrysninger teller, ikke det en voksen har registrert.
  const siste = utforelser
    .filter((u) => u.barnId === barnId && u.oppgaveId === o.id && !u.registrertAv)
    .reduce((maks, u) => Math.max(maks, Date.parse(u.utfort)), 0);
  return Math.max(0, siste + min * 60_000 - naa);
}

/** «4:59», eller «1:05:00» for over en time. */
export function nedtelling(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const t = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(s % 60).padStart(2, '0');
  return t > 0 ? `${t}:${String(m).padStart(2, '0')}:${sek}` : `${m}:${sek}`;
}

/** Nåtid som oppdateres hvert sekund mens `aktiv` er sann. */
export function useNaa(aktiv: boolean): number {
  const [naa, setNaa] = useState(() => Date.now());
  useEffect(() => {
    if (!aktiv) return;
    const t = setInterval(() => setNaa(Date.now()), 1000);
    return () => clearInterval(t);
  }, [aktiv]);
  return naa;
}
