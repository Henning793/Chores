# Ukepenger

App for familier der barn krysser av oppgaver de har gjort hjemme, voksne godkjenner,
og godkjente oppgaver blir til ukepenger (mandag til søndag). iPhone, Android og iPad.

> **Status:** Prosjektoppsett og designforslag. Funksjonaliteten bygges først når designet er godkjent.

## Teknologi

- **App:** React Native med Expo (SDK 58) og Expo Router, TypeScript
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Innlogging:** e-post med engangskode og Google (Apple senere)
- **Varsler:** Expo Push Notifications
- **Distribusjon:** EAS Build til TestFlight (iOS) og intern testing (Google Play)

## Mappestruktur

```
src/
  app/                    Skjermer (Expo Router, filbasert navigasjon)
    (auth)/               Logg inn, opprett familie, godta invitasjon
    index.tsx             «Hvem bruker appen?» (profilvelger)
    pin.tsx               PIN for voksenprofil
    barn/[barnId]/        Barnets visning: oppgaver, historikk, sparemål
    voksen/               Voksenvisning: godkjenning, registrering, oppgaver, barn, uker, innstillinger
  components/             Gjenbrukbare UI-komponenter
  features/               Logikk per område (auth, profiler, oppgaver, godkjenning, uker, gamification, offline)
  lib/supabase.ts         Supabase-klient
  types/database.ts       Genererte databasetyper
supabase/
  migrations/             SQL-migrasjoner (utkast)
  functions/              Edge Functions (pushvarsel ved ny oppgave)
docs/                     Design og beslutninger
```

## Kom i gang

```bash
npm install
cp .env.example .env      # fyll inn Supabase-URL og publishable-nøkkel
npx expo start
```

Databasen settes opp med Supabase CLI:

```bash
npx supabase link --project-ref <prosjekt-id>
npx supabase db push
```

## Viktige valg

- Beløp lagres i **øre** som heltall.
- Uker følger **norsk tid** og starter **mandag**. Ukesummer beregnes fra utførte oppgaver,
  så ingenting nullstilles og all historikk beholdes.
- Barn har **ikke** egne brukere. Enheten er logget inn med en voksen sin konto, og man velger profil på forsiden.
- Hver voksen har sin egen **PIN** (lagret som hash på serveren, slik at den fungerer på alle familiens enheter).
- Invitasjonslenker er gyldige i **2 timer**.

Se [docs/design.md](docs/design.md) og [docs/design.html](docs/design.html) for skjermflyt og datamodell.
