import { useMemo } from 'react';

import { useUkesummer, useUtforelser } from '@/data/utforelser';
import { leggTilDager, ukeStart } from '@/lib/uke';

export type Uke = {
  barnId: string;
  ukeStart: string;
  tjentOre: number;
  antallGodkjent: number;
  antallVenter: number;
  /** Alle avkrysninger gir stjerne, også de som venter eller ble avvist. */
  antallStjerner: number;
  utbetaltOre: number | null;
  utbetalt: string | null;
};

/**
 * Ukesummer per barn. Historikken ligger i ukesum-dokumentene; denne og forrige uke regnes ut
 * fra avkrysningene på enheten, så de også viser det som ikke er sendt ennå.
 */
export function useUker(): { uker: Uke[]; laster: boolean } {
  const summer = useUkesummer();
  const utforelser = useUtforelser();

  const uker = useMemo(() => {
    const denne = ukeStart();
    const forrige = leggTilDager(denne, -7);
    const kart = new Map<string, Uke>();
    const nokkel = (b: string, u: string) => `${b}_${u}`;
    const hent = (barnId: string, uke: string): Uke => {
      const k = nokkel(barnId, uke);
      let v = kart.get(k);
      if (!v) {
        v = { barnId, ukeStart: uke, tjentOre: 0, antallGodkjent: 0, antallVenter: 0, antallStjerner: 0, utbetaltOre: null, utbetalt: null };
        kart.set(k, v);
      }
      return v;
    };

    for (const s of summer.data ?? []) {
      const v = hent(s.barnId, s.ukeStart);
      v.utbetaltOre = s.utbetaltOre ?? null;
      v.utbetalt = s.utbetalt ?? null;
      if (s.ukeStart !== denne && s.ukeStart !== forrige) {
        v.tjentOre = s.tjentOre ?? 0;
        v.antallGodkjent = s.antallGodkjent ?? 0;
        // Eldre uker har bare godkjente lagret; avviste fra før endringen telles ikke.
        v.antallStjerner += s.antallGodkjent ?? 0;
      }
    }

    for (const u of utforelser.data) {
      const nylig = u.ukeStart === denne || u.ukeStart === forrige;
      if (u.status === 'venter') hent(u.barnId, u.ukeStart).antallVenter += 1;
      if (nylig || u.status === 'venter') hent(u.barnId, u.ukeStart).antallStjerner += 1;
      if (nylig && u.status === 'godkjent') {
        const v = hent(u.barnId, u.ukeStart);
        v.tjentOre += u.belopOre;
        v.antallGodkjent += 1;
      }
    }

    return [...kart.values()]
      .filter((u) => u.tjentOre > 0 || u.antallVenter > 0 || u.antallStjerner > 0)
      .sort((a, b) => b.ukeStart.localeCompare(a.ukeStart));
  }, [summer.data, utforelser.data]);

  return { uker, laster: !!summer.isPending };
}
