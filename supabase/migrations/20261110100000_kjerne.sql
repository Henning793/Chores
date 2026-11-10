-- Kjernefunksjoner etter godkjent design (v1).

-- Forslag til merknad per oppgave, f.eks. {"Stuen","Rommet mitt"} for «Ryddet».
alter table public.oppgaver add column forslag text[] not null default '{}';

-- En voksen registrerer en oppgave direkte for et barn. Lagres som godkjent med en gang.
-- p_id lages på enheten, så samme registrering sendt to ganger (offline) lagres bare én gang.
create or replace function public.registrer_utforelse(
  p_id uuid, p_barn uuid, p_oppgave uuid, p_merknad text, p_utfort timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare b public.barn; o public.oppgaver;
begin
  select * into b from public.barn where id = p_barn;
  select * into o from public.oppgaver where id = p_oppgave;
  if b.id is null or o.id is null or b.familie_id <> o.familie_id or not public.er_medlem(b.familie_id) then
    raise exception 'Ingen tilgang';
  end if;
  insert into public.utforelser (id, familie_id, barn_id, oppgave_id, merknad, belop_ore, utfort,
                                 status, registrert_av, behandlet_av, behandlet)
  values (p_id, b.familie_id, p_barn, p_oppgave, nullif(trim(p_merknad), ''), o.belop_ore,
          coalesce(p_utfort, now()), 'godkjent', auth.uid(), auth.uid(), now())
  on conflict (id) do nothing;
end $$;

-- Barnet og oppgaven må tilhøre samme familie som raden.
create or replace function public.sjekk_utforelse_familie()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.barn where id = new.barn_id and familie_id = new.familie_id)
     or not exists (select 1 from public.oppgaver where id = new.oppgave_id and familie_id = new.familie_id) then
    raise exception 'Barn og oppgave må tilhøre familien';
  end if;
  return new;
end $$;

create trigger utforelser_familie
  before insert on public.utforelser
  for each row execute function public.sjekk_utforelse_familie();

-- Hvilke voksne har satt PIN (uten å avsløre hashen).
create or replace function public.voksne_med_pin(p_familie uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.bruker_id from public.voksen_pin p
  join public.voksne v on v.bruker_id = p.bruker_id
  where v.familie_id = p_familie and public.er_medlem(p_familie)
$$;

-- Sanntid: appen oppdaterer lister når noe krysses av eller godkjennes.
alter publication supabase_realtime add table public.utforelser;

-- Profilbilder. Privat bøtte, mappe per familie: <familie_id>/<fil>.jpg
insert into storage.buckets (id, name, public) values ('profilbilder', 'profilbilder', false)
on conflict (id) do nothing;

create policy "familie leser profilbilder" on storage.objects for select
  using (bucket_id = 'profilbilder' and public.er_medlem(((storage.foldername(name))[1])::uuid));
create policy "familie laster opp profilbilder" on storage.objects for insert
  with check (bucket_id = 'profilbilder' and public.er_medlem(((storage.foldername(name))[1])::uuid));
create policy "familie sletter profilbilder" on storage.objects for delete
  using (bucket_id = 'profilbilder' and public.er_medlem(((storage.foldername(name))[1])::uuid));
