-- UTKAST: grunnskjema for Ukepenger. Ikke kjørt mot noen database ennå.
-- Beløp lagres i øre (heltall) for å unngå avrundingsfeil. 25 kr = 2500.
-- Uker følger norsk tid (Europe/Oslo) og starter mandag.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Familie og voksne
-- ---------------------------------------------------------------------------

create table public.familier (
  id          uuid primary key default gen_random_uuid(),
  navn        text not null check (char_length(navn) between 1 and 60),
  opprettet   timestamptz not null default now()
);

-- En voksen = en Supabase Auth-bruker. Alle voksne i en familie er likestilte.
create table public.voksne (
  bruker_id   uuid not null references auth.users (id) on delete cascade,
  familie_id  uuid not null references public.familier (id) on delete cascade,
  visningsnavn text not null check (char_length(visningsnavn) between 1 and 40),
  bilde_sti   text,                       -- sti i Storage-bøtta "profilbilder"
  opprettet   timestamptz not null default now(),
  primary key (bruker_id, familie_id)
);
create index on public.voksne (familie_id);

-- PIN lagres som bcrypt-hash, aldri i klartekst. Tabellen leses ikke direkte av appen;
-- PIN settes og sjekkes via funksjonene sett_pin / sjekk_pin.
-- Lagres på serveren fordi en annen voksen må kunne låse opp sin profil på f.eks. sønnens iPad.
create table public.voksen_pin (
  bruker_id   uuid primary key references auth.users (id) on delete cascade,
  pin_hash    text not null,
  feil_forsok int  not null default 0,
  last_til    timestamptz,                -- midlertidig sperre etter for mange feil
  endret      timestamptz not null default now()
);

-- Invitasjonslenke gyldig i 2 timer. Kun hash av token lagres.
create table public.invitasjoner (
  id          uuid primary key default gen_random_uuid(),
  familie_id  uuid not null references public.familier (id) on delete cascade,
  token_hash  text not null unique,
  opprettet_av uuid not null references auth.users (id) on delete cascade,
  opprettet   timestamptz not null default now(),
  utloper     timestamptz not null default now() + interval '2 hours',
  brukt       timestamptz,
  brukt_av    uuid references auth.users (id)
);

-- ---------------------------------------------------------------------------
-- Barn, oppgaver og utførte oppgaver
-- ---------------------------------------------------------------------------

create table public.barn (
  id          uuid primary key default gen_random_uuid(),
  familie_id  uuid not null references public.familier (id) on delete cascade,
  navn        text not null check (char_length(navn) between 1 and 40),
  bilde_sti   text,
  farge       text not null default '#4F7CFF',
  rekkefolge  int  not null default 0,
  opprettet   timestamptz not null default now(),
  arkivert    timestamptz
);
create index on public.barn (familie_id);

-- Oppgaver er felles for familien, ikke knyttet til ett barn.
create table public.oppgaver (
  id          uuid primary key default gen_random_uuid(),
  familie_id  uuid not null references public.familier (id) on delete cascade,
  tittel      text not null check (char_length(tittel) between 1 and 60),
  beskrivelse text,
  ikon        text,                       -- emoji eller ikonnavn
  belop_ore   int  not null check (belop_ore >= 0 and belop_ore <= 100000),
  rekkefolge  int  not null default 0,
  opprettet   timestamptz not null default now(),
  arkivert    timestamptz               -- arkiveres i stedet for å slettes, så historikk består
);
create index on public.oppgaver (familie_id);

create type public.utforelse_status as enum ('venter', 'godkjent', 'avvist');

-- Én rad per gang et barn har gjort en oppgave. Samme oppgave kan gjøres mange ganger per dag.
create table public.utforelser (
  id            uuid primary key default gen_random_uuid(),  -- lages på enheten (offline)
  familie_id    uuid not null references public.familier (id) on delete cascade,
  barn_id       uuid not null references public.barn (id) on delete cascade,
  oppgave_id    uuid not null references public.oppgaver (id),
  merknad       text check (char_length(merknad) <= 120),     -- f.eks. "stuen", "rommet mitt"
  belop_ore     int  not null check (belop_ore >= 0),         -- kopi av oppgavens beløp da den ble utført
  utfort        timestamptz not null default now(),           -- tidspunkt på enheten
  uke_start     date not null,                                -- mandag i uka, settes av trigger
  status        public.utforelse_status not null default 'venter',
  registrert_av uuid references auth.users (id),              -- satt når en voksen registrerte direkte
  behandlet_av  uuid references auth.users (id),
  behandlet     timestamptz,
  kommentar     text check (char_length(kommentar) <= 280),   -- begrunnelse ved avvisning
  nytt_forsok_av uuid references public.utforelser (id),      -- peker til avvist utførelse som prøves igjen
  opprettet     timestamptz not null default now(),
  endret        timestamptz not null default now()
);
create index on public.utforelser (familie_id, status);
create index on public.utforelser (barn_id, uke_start);

-- Utbetaling registreres per barn per uke (forslag, se designet).
create table public.utbetalinger (
  id          uuid primary key default gen_random_uuid(),
  familie_id  uuid not null references public.familier (id) on delete cascade,
  barn_id     uuid not null references public.barn (id) on delete cascade,
  uke_start   date not null,
  belop_ore   int  not null check (belop_ore >= 0),
  utbetalt    timestamptz not null default now(),
  utbetalt_av uuid not null references auth.users (id),
  unique (barn_id, uke_start)
);

-- ---------------------------------------------------------------------------
-- Gamification
-- ---------------------------------------------------------------------------

create table public.sparemal (
  id          uuid primary key default gen_random_uuid(),
  familie_id  uuid not null references public.familier (id) on delete cascade,
  barn_id     uuid not null references public.barn (id) on delete cascade,
  tittel      text not null check (char_length(tittel) between 1 and 60),
  bilde_sti   text,
  mal_ore     int  not null check (mal_ore > 0),
  opprettet   timestamptz not null default now(),
  nadd        timestamptz,
  arkivert    timestamptz
);

-- Merker barnet har låst opp. Selve merkene (nøkler, navn, regler) defineres i appen.
create table public.barn_merker (
  barn_id     uuid not null references public.barn (id) on delete cascade,
  familie_id  uuid not null references public.familier (id) on delete cascade,
  merke       text not null,              -- f.eks. 'forste_oppgave', 'fem_pa_rad'
  oppnadd     timestamptz not null default now(),
  primary key (barn_id, merke)
);

-- ---------------------------------------------------------------------------
-- Pushvarsler
-- ---------------------------------------------------------------------------

create table public.push_mottakere (
  expo_token  text primary key,
  bruker_id   uuid not null references auth.users (id) on delete cascade,
  enhet_navn  text,
  oppdatert   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hjelpefunksjoner og triggere
-- ---------------------------------------------------------------------------

-- Mandag i uka for et tidspunkt, i norsk tid.
create or replace function public.uke_start_for(ts timestamptz)
returns date language sql immutable as $$
  select date_trunc('week', ts at time zone 'Europe/Oslo')::date
$$;

create or replace function public.er_medlem(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.voksne where familie_id = f and bruker_id = auth.uid())
$$;

create or replace function public.sett_uke_og_endret()
returns trigger language plpgsql as $$
begin
  new.uke_start := public.uke_start_for(new.utfort);
  new.endret := now();
  return new;
end $$;

create trigger utforelser_uke
  before insert or update on public.utforelser
  for each row execute function public.sett_uke_og_endret();

-- Godkjenn eller avvis. Bare voksne i familien. Låser behandler og tidspunkt.
create or replace function public.behandle_utforelse(p_id uuid, p_godkjenn boolean, p_kommentar text default null)
returns public.utforelser language plpgsql security definer set search_path = public as $$
declare r public.utforelser;
begin
  select * into r from public.utforelser where id = p_id for update;
  if r.id is null or not public.er_medlem(r.familie_id) then
    raise exception 'Fant ikke oppgaven';
  end if;
  if r.status <> 'venter' then
    raise exception 'Oppgaven er allerede behandlet';
  end if;
  update public.utforelser
     set status = case when p_godkjenn then 'godkjent' else 'avvist' end::public.utforelse_status,
         behandlet_av = auth.uid(), behandlet = now(), kommentar = p_kommentar
   where id = p_id
   returning * into r;
  return r;
end $$;

create or replace function public.sett_pin(p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN må være fire sifre'; end if;
  insert into public.voksen_pin (bruker_id, pin_hash)
  values (auth.uid(), crypt(p_pin, gen_salt('bf')))
  on conflict (bruker_id) do update
    set pin_hash = excluded.pin_hash, feil_forsok = 0, last_til = null, endret = now();
end $$;

-- Sjekker PIN for en voksen i samme familie som innlogget bruker
-- (iPaden er logget inn som pappa, men mamma skal kunne låse opp sin profil).
create or replace function public.sjekk_pin(p_bruker uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare r public.voksen_pin; ok boolean;
begin
  if not exists (
    select 1 from public.voksne a join public.voksne b on a.familie_id = b.familie_id
    where a.bruker_id = auth.uid() and b.bruker_id = p_bruker
  ) then return false; end if;

  select * into r from public.voksen_pin where bruker_id = p_bruker for update;
  if r.bruker_id is null then return false; end if;
  if r.last_til is not null and r.last_til > now() then
    raise exception 'For mange forsøk. Prøv igjen om litt.';
  end if;

  ok := r.pin_hash = crypt(p_pin, r.pin_hash);
  update public.voksen_pin
     set feil_forsok = case when ok then 0 else feil_forsok + 1 end,
         last_til = case when not ok and feil_forsok + 1 >= 5 then now() + interval '5 minutes' else null end
   where bruker_id = p_bruker;
  return ok;
end $$;

create or replace function public.opprett_invitasjon(p_familie uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  if not public.er_medlem(p_familie) then raise exception 'Ingen tilgang'; end if;
  t := encode(gen_random_bytes(24), 'hex');
  insert into public.invitasjoner (familie_id, token_hash, opprettet_av)
  values (p_familie, encode(digest(t, 'sha256'), 'hex'), auth.uid());
  return t;  -- brukes i lenken, f.eks. ukepenger://invitasjon?t=<token>
end $$;

create or replace function public.godta_invitasjon(p_token text, p_visningsnavn text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare i public.invitasjoner;
begin
  select * into i from public.invitasjoner
   where token_hash = encode(digest(p_token, 'sha256'), 'hex') for update;
  if i.id is null or i.brukt is not null or i.utloper < now() then
    raise exception 'Invitasjonen er ugyldig eller utløpt';
  end if;
  insert into public.voksne (bruker_id, familie_id, visningsnavn)
  values (auth.uid(), i.familie_id, p_visningsnavn)
  on conflict do nothing;
  update public.invitasjoner set brukt = now(), brukt_av = auth.uid() where id = i.id;
  return i.familie_id;
end $$;

create or replace function public.opprett_familie(p_navn text, p_visningsnavn text)
returns uuid language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  insert into public.familier (navn) values (p_navn) returning id into f;
  insert into public.voksne (bruker_id, familie_id, visningsnavn) values (auth.uid(), f, p_visningsnavn);
  return f;
end $$;

-- ---------------------------------------------------------------------------
-- Ukeoversikt (historikk). Beregnes fra utførelser, så ingenting må "nullstilles" på mandag.
-- ---------------------------------------------------------------------------

create or replace view public.ukeoppgjor with (security_invoker = true) as
select
  u.familie_id,
  u.barn_id,
  u.uke_start,
  sum(u.belop_ore) filter (where u.status = 'godkjent')  as tjent_ore,
  count(*)         filter (where u.status = 'godkjent')  as antall_godkjent,  -- = stjerner
  count(*)         filter (where u.status = 'venter')    as antall_venter,
  p.belop_ore  as utbetalt_ore,
  p.utbetalt
from public.utforelser u
left join public.utbetalinger p on p.barn_id = u.barn_id and p.uke_start = u.uke_start
group by u.familie_id, u.barn_id, u.uke_start, p.belop_ore, p.utbetalt;

-- ---------------------------------------------------------------------------
-- Row Level Security: voksne ser og endrer kun egen families data.
-- ---------------------------------------------------------------------------

alter table public.familier      enable row level security;
alter table public.voksne        enable row level security;
alter table public.voksen_pin    enable row level security;  -- ingen policyer: kun via funksjoner
alter table public.invitasjoner  enable row level security;
alter table public.barn          enable row level security;
alter table public.oppgaver      enable row level security;
alter table public.utforelser    enable row level security;
alter table public.utbetalinger  enable row level security;
alter table public.sparemal      enable row level security;
alter table public.barn_merker   enable row level security;
alter table public.push_mottakere enable row level security;

create policy "les egen familie" on public.familier for select using (public.er_medlem(id));
create policy "endre egen familie" on public.familier for update using (public.er_medlem(id));

create policy "les voksne i familien" on public.voksne for select using (public.er_medlem(familie_id));
create policy "endre egen voksenprofil" on public.voksne for update using (bruker_id = auth.uid());

create policy "les invitasjoner" on public.invitasjoner for select using (public.er_medlem(familie_id));

do $$
declare t text;
begin
  foreach t in array array['barn', 'oppgaver', 'utbetalinger', 'sparemal', 'barn_merker'] loop
    execute format('create policy "familie leser" on public.%I for select using (public.er_medlem(familie_id))', t);
    execute format('create policy "familie skriver" on public.%I for insert with check (public.er_medlem(familie_id))', t);
    execute format('create policy "familie endrer" on public.%I for update using (public.er_medlem(familie_id))', t);
    execute format('create policy "familie sletter" on public.%I for delete using (public.er_medlem(familie_id))', t);
  end loop;
end $$;

-- Utførelser: alle i familien kan legge inn (barneprofilen bruker den voksnes innlogging).
-- Status endres kun via behandle_utforelse, derfor ingen generell update-policy.
create policy "familie leser" on public.utforelser for select using (public.er_medlem(familie_id));
create policy "familie legger inn" on public.utforelser for insert
  with check (public.er_medlem(familie_id) and status = 'venter');
create policy "angre egen ventende" on public.utforelser for delete
  using (public.er_medlem(familie_id) and status = 'venter');

create policy "egne push-tokens" on public.push_mottakere for all
  using (bruker_id = auth.uid()) with check (bruker_id = auth.uid());
