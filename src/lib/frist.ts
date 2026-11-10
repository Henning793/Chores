// Frister og gjentakelse for Gjøremål. Datoer er YYYY-MM-DD i norsk tid.

import type { Gjentakelse, Gjoremal } from '@/data/typer';
import { dagFor, leggTilDager } from '@/lib/uke';

const UKEDAGER = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
const MANEDER = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

export const GJENTAKELSER: { verdi: Gjentakelse | null; tekst: string }[] = [
  { verdi: null, tekst: 'Aldri' },
  { verdi: 'dag', tekst: 'Hver dag' },
  { verdi: 'uke', tekst: 'Hver uke' },
  { verdi: 'maned', tekst: 'Hver måned' },
  { verdi: 'ar', tekst: 'Hvert år' },
];

export function gjentakelseTekst(g: Gjentakelse | null): string {
  return GJENTAKELSER.find((x) => x.verdi === g)?.tekst ?? '';
}

function deler(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function dagerIManed(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function tilIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Neste frist for en gjentakende oppgave. Regnes fra forrige frist, så «den 15. hver måned»
 * holder seg. Mangler fristen, regnes det fra i dag. Ligger resultatet i fortiden
 * (oppgaven ble fullført sent), hoppes det fram til første frist fra og med i dag.
 */
export function nesteFrist(frist: string | null, g: Gjentakelse, idag: string = dagFor()): string {
  const start = frist ?? idag;
  const { d: dag0 } = deler(start);
  let n = 1;
  for (;;) {
    let neste: string;
    if (g === 'dag') neste = leggTilDager(start, n);
    else if (g === 'uke') neste = leggTilDager(start, 7 * n);
    else {
      const { y, m } = deler(start);
      const totalt = g === 'maned' ? m - 1 + n : m - 1 + 12 * n;
      const ny = y + Math.floor(totalt / 12);
      const nm = (totalt % 12) + 1;
      neste = tilIso(ny, nm, Math.min(dag0, dagerIManed(ny, nm)));
    }
    if (neste >= idag || n > 3660) return neste;
    n++;
  }
}

/** «I dag», «I morgen», «Fre 14. nov» eller «Forfalt · man 10. nov». Med klokkeslett: «I morgen 14:00». */
export function fristTekst(frist: string, kl: string | null, idag: string = dagFor()): string {
  const { y, m, d } = deler(frist);
  const ukedag = UKEDAGER[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  let tekst: string;
  if (frist === idag) tekst = 'I dag';
  else if (frist === leggTilDager(idag, 1)) tekst = 'I morgen';
  else if (frist === leggTilDager(idag, -1)) tekst = 'I går';
  else tekst = `${ukedag[0].toUpperCase()}${ukedag.slice(1)} ${d}. ${MANEDER[m - 1]}${y !== deler(idag).y ? ` ${y}` : ''}`;
  return kl ? `${tekst} ${kl}` : tekst;
}

/** Forfalt: fristen er passert (dagen før i dag, eller i dag etter klokkeslettet). */
export function erForfalt(g: Pick<Gjoremal, 'frist' | 'fristKl'>, na: Date = new Date()): boolean {
  if (!g.frist) return false;
  const idag = dagFor(na);
  if (g.frist < idag) return true;
  if (g.frist > idag || !g.fristKl) return false;
  const klNa = new Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' }).format(na);
  return klNa.replace('.', ':') > g.fristKl;
}

/** Åpne med frist først (tidligst øverst), så åpne uten frist (eldst øverst), så fullførte (sist fullført øverst). */
export function sorterGjoremal(liste: Gjoremal[]): { medFrist: Gjoremal[]; utenFrist: Gjoremal[]; fullforte: Gjoremal[] } {
  const apne = liste.filter((g) => !g.fullfort);
  const fristNokkel = (g: Gjoremal) => `${g.frist}T${g.fristKl ?? '99:99'}`;
  return {
    medFrist: apne.filter((g) => g.frist).sort((a, b) => fristNokkel(a).localeCompare(fristNokkel(b))),
    utenFrist: apne.filter((g) => !g.frist).sort((a, b) => a.opprettet.localeCompare(b.opprettet)),
    fullforte: liste.filter((g) => g.fullfort).sort((a, b) => b.fullfort!.localeCompare(a.fullfort!)),
  };
}

/** Tolker «14.11», «14.11.2026» eller «2026-11-14». Gir YYYY-MM-DD eller null. */
export function tolkDato(tekst: string, idag: string = dagFor()): string | null {
  const t = tekst.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const norsk = /^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?$/.exec(t);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (norsk) {
    d = Number(norsk[1]);
    m = Number(norsk[2]);
    y = norsk[3] ? Number(norsk[3].length === 2 ? `20${norsk[3]}` : norsk[3]) : deler(idag).y;
    // Uten år: neste gang datoen kommer.
    if (!norsk[3] && tilIso(y, m, d) < idag) y++;
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > dagerIManed(y, m)) return null;
  return tilIso(y, m, d);
}

/** Tolker «14», «1400», «14:00» eller «14.00». Gir HH:MM eller null. */
export function tolkKlokke(tekst: string): string | null {
  const t = tekst.trim().replace('.', ':');
  const r = /^(\d{1,2})(?::?(\d{2}))?$/.exec(t);
  if (!r) return null;
  const h = Number(r[1]);
  const min = Number(r[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Når varselet skal komme: kl. 09 dagen før, eller én time før når klokkeslett er satt. Norsk tid. */
export function varselTidspunkt(g: Pick<Gjoremal, 'frist' | 'fristKl'>): Date | null {
  if (!g.frist) return null;
  if (g.fristKl) return new Date(osloTilUtc(g.frist, g.fristKl).getTime() - 60 * 60 * 1000);
  return osloTilUtc(leggTilDager(g.frist, -1), '09:00');
}

/** Tidspunkt i norsk tid → Date. Håndterer sommertid. */
export function osloTilUtc(dato: string, kl: string): Date {
  const gjett = new Date(`${dato}T${kl}:00Z`);
  for (const timer of [1, 2]) {
    const kandidat = new Date(gjett.getTime() - timer * 3600 * 1000);
    const vist = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(kandidat);
    const [dmy, hm] = vist.split(', ');
    const [dd, mm, yyyy] = dmy.split('/');
    if (`${yyyy}-${mm}-${dd}` === dato && hm === kl) return kandidat;
  }
  return new Date(gjett.getTime() - 3600 * 1000);
}
