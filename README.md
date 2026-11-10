# Ukepenger

App for familier der barn krysser av oppgaver de har gjort hjemme, voksne godkjenner,
og godkjente oppgaver blir til ukepenger (mandag til søndag). iPhone, Android og iPad.

> **Status:** Designet er godkjent (10. nov 2026). Første versjon har innlogging, familie, PIN, profilvelger,
> avkrysning, godkjenning, registrering, ukeoppgjør og offline-kø. Pushvarsler og sparemål kommer neste.

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
    logg-inn.tsx          E-postkode eller Google
    velkommen.tsx         Opprett familie eller bli med via invitasjon, velg PIN
    invitasjon.tsx        Åpnes fra invitasjonslenken
    index.tsx             «Hvem bruker appen?» (profilvelger)
    pin.tsx               PIN for voksenprofil
    barn/[barnId]/        Barnets visning: oppgaver og mine uker
    voksen/               Godkjenn, registrer, ukeoppgjør, oppgaver, mer (barn, voksne, invitasjon, PIN, lås)
  data/                   Supabase-spørringer, innlogging, profiler, offline-kø
  lib/                    Supabase-klient, kroner/øre, uker i norsk tid
  ui/                     Felles komponenter og farger
supabase/
  migrations/             SQL-migrasjoner
  functions/              Edge Functions (pushvarsel, kommer)
docs/                     Design og beslutninger
```

## Kom i gang

```bash
npm install
cp .env.example .env      # fyll inn Supabase-URL og publishable-nøkkel
npx expo start
```

Appen bruker native moduler (sikker lagring, bildevelger), så på telefon trengs en
development build: `npx eas-cli@latest build --profile development`, eller `npx expo run:ios` på Mac.

## Sette opp Supabase

1. Opprett et prosjekt (region `eu-north-1` eller `eu-west-1`).
2. Kjør migrasjonene: `npx supabase link --project-ref <id>` og `npx supabase db push`.
3. **Authentication → Email:** behold e-post på. I malen «Magic Link» må koden være med, f.eks.
   `Koden din er {{ .Token }}`, siden appen ber om sekssifret kode.
4. **Authentication → URL Configuration:** legg til `ukepenger://**` under Redirect URLs.
5. **Google (valgfritt):** slå på Google-leverandøren og legg inn klient-ID og hemmelighet fra Google Cloud.
6. Kopier prosjekt-URL og publishable-nøkkel til `.env`.

## Sjekker

```bash
npm run typecheck
npm run lint
```

## Viktige valg

- Beløp lagres i **øre** som heltall.
- Uker følger **norsk tid** og starter **mandag**. Ukesummer beregnes fra utførte oppgaver,
  så ingenting nullstilles og all historikk beholdes.
- Barn har **ikke** egne brukere. Enheten er logget inn med en voksen sin konto, og man velger profil på forsiden.
- Hver voksen har sin egen **PIN** (lagret som hash på serveren, slik at den fungerer på alle familiens enheter).
- Avkrysning, godkjenning og registrering legges i en **kø på enheten** og sendes når nettet er tilbake.
- Beløpet **låses når barnet krysser av**. Endrer du beløpet, gjelder det bare nye avkrysninger.
- Invitasjonslenker er gyldige i **2 timer**.

Se [docs/design.md](docs/design.md) og [docs/design.html](docs/design.html) for skjermflyt og datamodell.
