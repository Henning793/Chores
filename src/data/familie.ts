import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/data/auth';
import type { Barn, Familie, Oppgave, Voksen } from '@/data/typer';
import { supabase } from '@/lib/supabase';

async function hent<T>(sporring: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await sporring;
  if (error) throw error;
  return data as T;
}

/** Den innloggede voksne og familien hen tilhører (null hvis ingen familie ennå). */
export function useMeg() {
  const { session } = useAuth();
  const brukerId = session?.user.id;
  return useQuery({
    queryKey: ['meg', brukerId],
    enabled: !!brukerId,
    queryFn: async () => {
      const rader = await hent<(Voksen & { familier: Familie })[]>(
        supabase.from('voksne').select('*, familier(*)').eq('bruker_id', brukerId!).limit(1),
      );
      const rad = rader[0];
      return rad ? { voksen: rad as Voksen, familie: rad.familier } : null;
    },
  });
}

/** Familie-ID for innlogget bruker. Kaster hvis brukt før familien er lastet. */
export function useFamilieId(): string {
  const { data } = useMeg();
  if (!data) throw new Error('Familien er ikke lastet');
  return data.familie.id;
}

export function useBarn() {
  const familieId = useFamilieId();
  return useQuery({
    queryKey: ['barn', familieId],
    queryFn: () =>
      hent<Barn[]>(
        supabase.from('barn').select('*').eq('familie_id', familieId).is('arkivert', null).order('rekkefolge').order('opprettet'),
      ),
  });
}

export function useVoksne() {
  const familieId = useFamilieId();
  return useQuery({
    queryKey: ['voksne', familieId],
    queryFn: () => hent<Voksen[]>(supabase.from('voksne').select('*').eq('familie_id', familieId).order('opprettet')),
  });
}

/** ID-er til voksne som har satt PIN. */
export function useVoksneMedPin() {
  const familieId = useFamilieId();
  return useQuery({
    queryKey: ['voksne-med-pin', familieId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('voksne_med_pin', { p_familie: familieId });
      if (error) throw error;
      return (data as string[]) ?? [];
    },
  });
}

export function useOppgaver() {
  const familieId = useFamilieId();
  return useQuery({
    queryKey: ['oppgaver', familieId],
    queryFn: () =>
      hent<Oppgave[]>(
        supabase.from('oppgaver').select('*').eq('familie_id', familieId).is('arkivert', null).order('rekkefolge').order('opprettet'),
      ),
  });
}

// ---------------------------------------------------------------------------
// Endringer (krever nett)
// ---------------------------------------------------------------------------

export function useOpprettFamilie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { familienavn: string; visningsnavn: string; pin: string }) => {
      const { error } = await supabase.rpc('opprett_familie', { p_navn: v.familienavn, p_visningsnavn: v.visningsnavn });
      if (error) throw error;
      const { error: pinFeil } = await supabase.rpc('sett_pin', { p_pin: v.pin });
      if (pinFeil) throw pinFeil;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meg'] }),
  });
}

export function useGodtaInvitasjon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { token: string; visningsnavn: string; pin: string }) => {
      const { error } = await supabase.rpc('godta_invitasjon', { p_token: v.token, p_visningsnavn: v.visningsnavn });
      if (error) throw error;
      const { error: pinFeil } = await supabase.rpc('sett_pin', { p_pin: v.pin });
      if (pinFeil) throw pinFeil;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meg'] }),
  });
}

export function useLagreBarn() {
  const qc = useQueryClient();
  const familieId = useFamilieId();
  return useMutation({
    mutationFn: async (b: Partial<Barn> & { navn: string }) => {
      const rad = { ...b, familie_id: familieId };
      const { error } = b.id
        ? await supabase.from('barn').update(rad).eq('id', b.id)
        : await supabase.from('barn').insert(rad);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barn', familieId] }),
  });
}

export function useArkiverBarn() {
  const qc = useQueryClient();
  const familieId = useFamilieId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('barn').update({ arkivert: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barn', familieId] }),
  });
}

export function useLagreOppgave() {
  const qc = useQueryClient();
  const familieId = useFamilieId();
  return useMutation({
    mutationFn: async (o: Partial<Oppgave> & { tittel: string; belop_ore: number }) => {
      const rad = { ...o, familie_id: familieId };
      const { error } = o.id
        ? await supabase.from('oppgaver').update(rad).eq('id', o.id)
        : await supabase.from('oppgaver').insert(rad);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oppgaver', familieId] }),
  });
}

export function useArkiverOppgave() {
  const qc = useQueryClient();
  const familieId = useFamilieId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('oppgaver').update({ arkivert: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oppgaver', familieId] }),
  });
}

export function useLagreVoksen() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const familieId = useFamilieId();
  return useMutation({
    mutationFn: async (v: { visningsnavn?: string; bilde_sti?: string | null }) => {
      const { error } = await supabase.from('voksne').update(v).eq('bruker_id', session!.user.id).eq('familie_id', familieId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voksne', familieId] });
      qc.invalidateQueries({ queryKey: ['meg'] });
    },
  });
}

export async function settPin(pin: string): Promise<void> {
  const { error } = await supabase.rpc('sett_pin', { p_pin: pin });
  if (error) throw error;
}

export async function opprettInvitasjon(familieId: string): Promise<string> {
  const { data, error } = await supabase.rpc('opprett_invitasjon', { p_familie: familieId });
  if (error) throw error;
  return data as string;
}
