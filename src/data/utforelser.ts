import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo } from 'react';

import { useAuth } from '@/data/auth';
import { useFamilieId } from '@/data/familie';
import type { Oppgave, Ukeoppgjor, Utforelse } from '@/data/typer';
import { leggIKo, useUtboks, vedSendt, type Jobb } from '@/data/utboks';
import { supabase } from '@/lib/supabase';
import { leggTilDager, ukeStart } from '@/lib/uke';

/**
 * Utførelser fra forrige uke og fremover, pluss alt som venter.
 * Endringer som ligger i køen på enheten vises som om de allerede er lagret.
 */
export function useUtforelser() {
  const familieId = useFamilieId();
  const fra = leggTilDager(ukeStart(), -7);
  const sporring = useQuery({
    queryKey: ['utforelser', familieId, fra],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utforelser')
        .select('*')
        .eq('familie_id', familieId)
        .or(`uke_start.gte.${fra},status.eq.venter`)
        .order('utfort', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Utforelse[];
    },
  });
  const ko = useUtboks();
  const data = useMemo(() => medKo(sporring.data ?? [], ko), [sporring.data, ko]);
  return { ...sporring, data };
}

export function medKo(rader: Utforelse[], ko: Jobb[]): Utforelse[] {
  let ut = [...rader];
  for (const j of ko) {
    if (j.type === 'kryss' || j.type === 'registrer') {
      if (ut.some((r) => r.id === j.rad.id)) continue;
      const godkjent = j.type === 'registrer';
      ut.unshift({
        ...j.rad,
        uke_start: ukeStart(new Date(j.rad.utfort)),
        status: godkjent ? 'godkjent' : 'venter',
        registrert_av: godkjent ? j.av : null,
        behandlet_av: godkjent ? j.av : null,
        behandlet: godkjent ? j.rad.utfort : null,
        kommentar: null,
        ikkeSendt: true,
      });
    } else if (j.type === 'behandle') {
      ut = ut.map((r) =>
        r.id === j.utforelseId && r.status === 'venter'
          ? { ...r, status: j.godkjenn ? 'godkjent' : 'avvist', kommentar: j.kommentar, behandlet_av: j.av, behandlet: j.tid, ikkeSendt: true }
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
  const { session } = useAuth();
  const meg = session?.user.id ?? '';

  return {
    kryssAv(barnId: string, oppgave: Oppgave, merknad: string | null, nyttForsokAv: string | null = null) {
      leggIKo({
        jobbId: randomUUID(),
        type: 'kryss',
        rad: {
          id: randomUUID(),
          familie_id: familieId,
          barn_id: barnId,
          oppgave_id: oppgave.id,
          merknad: merknad?.trim() || null,
          belop_ore: oppgave.belop_ore,
          utfort: new Date().toISOString(),
          nytt_forsok_av: nyttForsokAv,
        },
      });
    },
    registrer(barnId: string, oppgave: Oppgave, merknad: string | null, utfort: Date) {
      leggIKo({
        jobbId: randomUUID(),
        type: 'registrer',
        av: meg,
        rad: {
          id: randomUUID(),
          familie_id: familieId,
          barn_id: barnId,
          oppgave_id: oppgave.id,
          merknad: merknad?.trim() || null,
          belop_ore: oppgave.belop_ore,
          utfort: utfort.toISOString(),
          nytt_forsok_av: null,
        },
      });
    },
    behandle(utforelseId: string, godkjenn: boolean, kommentar: string | null = null) {
      leggIKo({
        jobbId: randomUUID(),
        type: 'behandle',
        utforelseId,
        godkjenn,
        kommentar: kommentar?.trim() || null,
        av: meg,
        tid: new Date().toISOString(),
      });
    },
    angre(utforelseId: string) {
      leggIKo({ jobbId: randomUUID(), type: 'angre', utforelseId });
    },
  };
}

/** Ukesummer for alle barn og alle uker (historikk). */
export function useUkeoppgjor() {
  const familieId = useFamilieId();
  return useQuery({
    queryKey: ['ukeoppgjor', familieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ukeoppgjor')
        .select('*')
        .eq('familie_id', familieId)
        .order('uke_start', { ascending: false });
      if (error) throw error;
      return data as Ukeoppgjor[];
    },
  });
}

export function useMarkerBetalt() {
  const qc = useQueryClient();
  const familieId = useFamilieId();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (v: { barnId: string; ukeStart: string; belopOre: number }) => {
      const { error } = await supabase.from('utbetalinger').insert({
        familie_id: familieId,
        barn_id: v.barnId,
        uke_start: v.ukeStart,
        belop_ore: v.belopOre,
        utbetalt_av: session!.user.id,
      });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ukeoppgjor', familieId] }),
  });
}

export function useAngreBetalt() {
  const qc = useQueryClient();
  const familieId = useFamilieId();
  return useMutation({
    mutationFn: async (v: { barnId: string; ukeStart: string }) => {
      const { error } = await supabase.from('utbetalinger').delete().eq('barn_id', v.barnId).eq('uke_start', v.ukeStart);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ukeoppgjor', familieId] }),
  });
}

/** Henter nye data når noen i familien krysser av eller godkjenner, og når køen er sendt. */
export function useSanntid() {
  const familieId = useFamilieId();
  const qc = useQueryClient();
  useEffect(() => {
    const oppdater = () => {
      qc.invalidateQueries({ queryKey: ['utforelser', familieId] });
      qc.invalidateQueries({ queryKey: ['ukeoppgjor', familieId] });
    };
    vedSendt(oppdater);
    const kanal = supabase
      .channel(`utforelser-${familieId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utforelser', filter: `familie_id=eq.${familieId}` }, oppdater)
      .subscribe();
    return () => {
      vedSendt(() => {});
      void supabase.removeChannel(kanal);
    };
  }, [familieId, qc]);
}
