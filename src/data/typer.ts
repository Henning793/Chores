// Dokumenttyper i Firestore. Alt ligger under familier/{familieId}/...
// Beløp er i øre (heltall). Tidspunkter lagres som ISO-tekst, uker som mandagens dato (YYYY-MM-DD, norsk tid).

export type Familie = { id: string; navn: string; opprettetAv: string };

export type Voksen = {
  id: string; // = Firebase Auth uid
  visningsnavn: string;
  /** Lite JPEG-bilde som data-URI, eller null. */
  bilde: string | null;
  pinSalt: string;
  pinHash: string;
};

export type Barn = {
  id: string;
  navn: string;
  bilde: string | null;
  farge: string;
  rekkefolge: number;
  arkivert: string | null;
};

export type Oppgave = {
  id: string;
  tittel: string;
  beskrivelse: string | null;
  ikon: string | null;
  belopOre: number;
  forslag: string[];
  /** Minutter før samme barn kan krysse av oppgaven igjen. Mangler = 5. */
  pauseMin?: number;
  rekkefolge: number;
  arkivert: string | null;
};

export type Status = 'venter' | 'godkjent' | 'avvist';

export type Utforelse = {
  id: string;
  barnId: string;
  oppgaveId: string;
  merknad: string | null;
  /** Kopi av oppgavens beløp da den ble krysset av. */
  belopOre: number;
  utfort: string;
  ukeStart: string;
  status: Status;
  registrertAv: string | null;
  behandletAv: string | null;
  behandlet: string | null;
  kommentar: string | null;
  nyttForsokAv: string | null;
  /** Bare på enheten: ligger i køen og er ikke sendt ennå. */
  ikkeSendt?: boolean;
};

/** Ukesum per barn. Dokument-ID: `${barnId}_${ukeStart}`. Oppdateres når noe godkjennes. */
export type Ukesum = {
  id: string;
  barnId: string;
  ukeStart: string;
  tjentOre: number;
  antallGodkjent: number;
  utbetaltOre: number | null;
  utbetalt: string | null;
  utbetaltAv: string | null;
};

export type Gjentakelse = 'dag' | 'uke' | 'maned' | 'ar';

/** Felles gjøremål for de voksne. Dokument: familier/{id}/gjoremal/{id}. Barna ser dem aldri. */
export type Gjoremal = {
  id: string;
  tittel: string;
  beskrivelse: string | null;
  /** Fristdato (YYYY-MM-DD, norsk tid) eller null. */
  frist: string | null;
  /** Klokkeslett (HH:MM) eller null for «hele dagen». */
  fristKl: string | null;
  gjentas: Gjentakelse | null;
  fullfort: string | null;
  fullfortAv: string | null;
  opprettet: string;
  opprettetAv: string;
  /** Satt når en gjentakende oppgave er fullført og neste kopi er laget. */
  nesteId: string | null;
};
