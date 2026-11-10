import type { Utforelse } from '@/data/typer';
import { dagFor, leggTilDager } from '@/lib/uke';

/** Antall dager på rad (til og med i dag eller i går) med minst én godkjent oppgave. */
export function dagerPaRad(utforelser: Utforelse[], na: Date = new Date()): number {
  const dager = new Set(utforelser.filter((u) => u.status === 'godkjent').map((u) => dagFor(new Date(u.utfort))));
  let dag = dagFor(na);
  if (!dager.has(dag)) dag = leggTilDager(dag, -1);
  let antall = 0;
  while (dager.has(dag)) {
    antall += 1;
    dag = leggTilDager(dag, -1);
  }
  return antall;
}
