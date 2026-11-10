import { useMemo } from 'react';

import type { Ukeoppgjor } from '@/data/typer';
import { useUkeoppgjor, useUtforelser } from '@/data/utforelser';
import { leggTilDager, ukeStart } from '@/lib/uke';

export type Uke = {
  barnId: string;
  ukeStart: string;
  tjentOre: number;
  antallGodkjent: number;
  antallVenter: number;
  utbetaltOre: number | null;
  utbetalt: string | null;
};

/**
 * Ukesummer per barn. Historikk kommer fra databasen; denne og forrige uke regnes ut
 * fra avkrysningene på enheten, så de også viser det som ikke er sendt ennå.
 */
export function useUker(): { uker: Uke[]; laster: boolean } {
  const oppgjor = useUkeoppgjor();
  const utforelser = useUtforelser();

  const uker = useMemo(() => {
    const denne = ukeStart();
    const forrige = leggTilDager(denne, -7);
    const kart = new Map<string, Uke>();
    const nokkel = (b: string, u: string) => `${b}|${u}`;

    for (const r of (oppgjor.data ?? []) as Ukeoppgjor[]) {
      kart.set(nokkel(r.barn_id, r.uke_start), {
        barnId: r.barn_id,
        ukeStart: r.uke_start,
        tjentOre: r.tjent_ore ?? 0,
        antallGodkjent: r.antall_godkjent,
        antallVenter: r.antall_venter,
        utbetaltOre: r.utbetalt_ore,
        utbetalt: r.utbetalt,
      });
    }

    const lokale = new Map<string, Uke>();
    for (const u of utforelser.data) {
      if (u.uke_start !== denne && u.uke_start !== forrige) continue;
      const k = nokkel(u.barn_id, u.uke_start);
      const fraDb = kart.get(k);
      const uke = lokale.get(k) ?? {
        barnId: u.barn_id,
        ukeStart: u.uke_start,
        tjentOre: 0,
        antallGodkjent: 0,
        antallVenter: 0,
        utbetaltOre: fraDb?.utbetaltOre ?? null,
        utbetalt: fraDb?.utbetalt ?? null,
      };
      if (u.status === 'godkjent') {
        uke.tjentOre += u.belop_ore;
        uke.antallGodkjent += 1;
      } else if (u.status === 'venter') {
        uke.antallVenter += 1;
      }
      lokale.set(k, uke);
    }
    lokale.forEach((v, k) => kart.set(k, v));

    return [...kart.values()].sort((a, b) => b.ukeStart.localeCompare(a.ukeStart));
  }, [oppgjor.data, utforelser.data]);

  return { uker, laster: oppgjor.isPending };
}
