// Uker starter mandag og følger norsk tid (samme regel som public.uke_start_for i databasen).

const TZ = 'Europe/Oslo';
const MANEDER = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

/** Kalenderdato (år, måned, dag) i norsk tid for et tidspunkt. */
function osloDato(d: Date): { y: number; m: number; d: number } {
  const deler = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { y: Number(deler.year), m: Number(deler.month), d: Number(deler.day) };
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Datoen (YYYY-MM-DD) i norsk tid. */
export function dagFor(t: Date = new Date()): string {
  const { y, m, d } = osloDato(t);
  return iso(y, m, d);
}

/** Mandag (YYYY-MM-DD) i uka tidspunktet hører til, i norsk tid. */
export function ukeStart(t: Date = new Date()): string {
  const { y, m, d } = osloDato(t);
  const dato = new Date(Date.UTC(y, m - 1, d));
  const ukedag = (dato.getUTCDay() + 6) % 7; // mandag = 0
  dato.setUTCDate(dato.getUTCDate() - ukedag);
  return dato.toISOString().slice(0, 10);
}

export function leggTilDager(isoDato: string, dager: number): string {
  const d = new Date(`${isoDato}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dager);
  return d.toISOString().slice(0, 10);
}

/** ISO-ukenummer for en mandag. */
export function ukenummer(mandag: string): number {
  const torsdag = new Date(`${leggTilDager(mandag, 3)}T00:00:00Z`);
  const nyttar = Date.UTC(torsdag.getUTCFullYear(), 0, 1);
  return Math.ceil(((torsdag.getTime() - nyttar) / 86400000 + 1) / 7);
}

/** "9.–15. nov" eller "29. des–4. jan". */
export function ukeSpenn(mandag: string): string {
  const s = new Date(`${mandag}T00:00:00Z`);
  const e = new Date(`${leggTilDager(mandag, 6)}T00:00:00Z`);
  const sm = MANEDER[s.getUTCMonth()];
  const em = MANEDER[e.getUTCMonth()];
  return sm === em
    ? `${s.getUTCDate()}.–${e.getUTCDate()}. ${em}`
    : `${s.getUTCDate()}. ${sm}–${e.getUTCDate()}. ${em}`;
}

/** "i dag 08:12", "i går 19:30" eller "lør. 14. nov 10:05". */
export function naarTekst(tidspunkt: string, na: Date = new Date()): string {
  const t = new Date(tidspunkt);
  const klokke = new Intl.DateTimeFormat('nb-NO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(t);
  const dag = dagFor(t);
  if (dag === dagFor(na)) return `i dag ${klokke}`;
  if (dag === leggTilDager(dagFor(na), -1)) return `i går ${klokke}`;
  const dato = new Intl.DateTimeFormat('nb-NO', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(t);
  return `${dato} ${klokke}`;
}
