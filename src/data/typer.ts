// Radtyper som speiler tabellene i supabase/migrations.

export type Familie = { id: string; navn: string };

export type Voksen = {
  bruker_id: string;
  familie_id: string;
  visningsnavn: string;
  bilde_sti: string | null;
};

export type Barn = {
  id: string;
  familie_id: string;
  navn: string;
  bilde_sti: string | null;
  farge: string;
  rekkefolge: number;
  arkivert: string | null;
};

export type Oppgave = {
  id: string;
  familie_id: string;
  tittel: string;
  beskrivelse: string | null;
  ikon: string | null;
  belop_ore: number;
  forslag: string[];
  rekkefolge: number;
  arkivert: string | null;
};

export type Status = 'venter' | 'godkjent' | 'avvist';

export type Utforelse = {
  id: string;
  familie_id: string;
  barn_id: string;
  oppgave_id: string;
  merknad: string | null;
  belop_ore: number;
  utfort: string;
  uke_start: string;
  status: Status;
  registrert_av: string | null;
  behandlet_av: string | null;
  behandlet: string | null;
  kommentar: string | null;
  nytt_forsok_av: string | null;
  /** Bare på enheten: ligger i køen og er ikke sendt ennå. */
  ikkeSendt?: boolean;
};

export type Ukeoppgjor = {
  familie_id: string;
  barn_id: string;
  uke_start: string;
  tjent_ore: number | null;
  antall_godkjent: number;
  antall_venter: number;
  utbetalt_ore: number | null;
  utbetalt: string | null;
};
