# Optera

(Tidligere kalt Ukepenger. Navnet er byttet bare i det brukerne ser; pakkenavn, Expo-prosjekt og Firebase heter fortsatt ukepenger.)

App for familier der barn krysser av oppgaver de har gjort hjemme, voksne godkjenner,
og godkjente oppgaver blir til ukepenger (mandag til søndag). iPhone, Android og iPad.

> **Status:** Designet er godkjent (10. nov 2026). Første versjon har innlogging, familie, PIN, profilvelger,
> avkrysning, godkjenning, registrering, ukeoppgjør, pushvarsler og offline-kø. Sparemål og merker kommer neste.

## Teknologi

- **App:** React Native med Expo (SDK 58) og Expo Router, TypeScript
- **Backend:** Firebase på gratisplanen (Spark): Authentication og Cloud Firestore
- **Innlogging:** e-post og passord, og Google
- **Varsler:** Expo Push Notifications, sendt fra barnets enhet (ingen Cloud Functions)
- **Distribusjon:** EAS Build til TestFlight (iOS) og intern testing (Google Play)

## Alt holder seg på gratisplanen

| Behov | Løsning | Hvorfor |
| --- | --- | --- |
| Ukeskifte mandag | Ingen jobb trengs. Hver avkrysning har sin uke (mandag, norsk tid), og ukesummen oppdateres når noe godkjennes. | Cloud Functions krever Blaze |
| Invitasjon i 2 timer | Dokument med utløpstid. Sikkerhetsreglene sjekker tid og engangsbruk. | Ingen server trengs |
| PIN | Saltet hash i den voksnes dokument, sjekkes på enheten. Sperres 5 min etter 5 feil. | Fungerer også uten nett |
| Pushvarsel | Barnets enhet sender varselet via Expo når avkrysningen er lagret. | Cloud Functions krever Blaze |
| Profilbilder | Skaleres til 256 × 256 og lagres som lite JPEG i Firestore-dokumentet. | Cloud Storage krever Blaze på nye prosjekter |

Gratiskvoten (50 000 lesinger og 20 000 skrivinger per dag) er langt mer enn en familie bruker.

## Mappestruktur

```
src/
  app/                    Skjermer (Expo Router, filbasert navigasjon)
    logg-inn.tsx          E-post og passord, eller Google
    velkommen.tsx         Opprett familie eller bli med via invitasjon, velg PIN
    invitasjon.tsx        Åpnes fra invitasjonslenken
    index.tsx             «Hvem bruker appen?» (profilvelger)
    pin.tsx               PIN for voksenprofil
    barn/[barnId]/        Barnets visning: oppgaver og mine uker
    voksen/               To rom: Barna (Godkjenn · Oppgaver · Uker, «＋ Fullført oppgave»), Gjøremål (felles liste for voksne) og Mer
  skjermer/               Innholdet i Barna-fanen og skjemaene den åpner
  data/                   Firestore-lesing og -skriving, innlogging, profiler, offline-kø, varsler, bilder
  lib/                    Firebase-oppsett, kroner/øre, uker i norsk tid, PIN
  ui/                     Felles komponenter og farger
firestore.rules           Sikkerhetsregler
test/regler.test.mjs      Tester for sikkerhetsreglene (Firestore-emulator)
docs/                     Design og beslutninger
```

## Datamodell (Firestore)

```
brukere/{uid}                         { familieId }
invitasjoner/{token}                  { familieId, opprettetAv, utloper, brukt, bruktAv }
familier/{familieId}                  { navn, opprettetAv }
  voksne/{uid}                        { visningsnavn, bilde, pinSalt, pinHash }
  barn/{id}                           { navn, bilde, farge, rekkefolge, arkivert }
  oppgaver/{id}                       { tittel, beskrivelse, ikon, belopOre, forslag[], pauseMin, rekkefolge, arkivert }
  utforelser/{id}                     { barnId, oppgaveId, merknad, belopOre, utfort, ukeStart, status, kommentar, ... }
  sperrer/{barnId}_{oppgaveId}        { utforelseId, sist }  pause mellom avkrysninger, sjekkes i reglene
  uker/{barnId}_{ukeStart}            { tjentOre, antallGodkjent, utbetaltOre, utbetalt, utbetaltAv }
  push/{token}                        { token, uid, plattform }
```

## Sette opp Firebase

1. Gå til [console.firebase.google.com](https://console.firebase.google.com) og opprett et prosjekt, f.eks. «ukepenger».
   Google Analytics trengs ikke.
2. **Build → Authentication → Get started → Sign-in method:** slå på **Email/Password**.
   Slå også på **Google** hvis du vil ha Google-innlogging.
3. **Build → Firestore Database → Create database:** velg region `eur3 (europe-west)` og start i
   **production mode**.
4. **Prosjektinnstillinger → Generelt → Dine apper:** legg til en **web-app** (`</>`). Verdiene fra
   `firebaseConfig` ligger i `.env` (prosjektet `chores-55b3c` er allerede lagt inn).
5. Last opp sikkerhetsreglene (prosjektet er satt i `.firebaserc`):
   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules
   ```
6. **Google-innlogging (valgfritt):** i [Google Cloud Console](https://console.cloud.google.com) for samme prosjekt,
   under APIs & Services → Credentials, finnes en «Web client» laget av Firebase. Legg klient-ID-en i
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, og lag iOS- og Android-klienter (bundle-ID `no.ukepenger.app`) for de to andre.

## Pushvarsler

1. `npx eas-cli@latest init` kobler appen til et Expo-prosjekt og legger `extra.eas.projectId` i app-konfigurasjonen.
2. **Android:** last opp en FCM-nøkkel til Expo: `npx eas-cli@latest credentials` → Android → Push Notifications (FCM V1),
   med en tjenestekontonøkkel fra Firebase (Prosjektinnstillinger → Tjenestekontoer → Generer ny privat nøkkel).
3. **iPhone/iPad** bruker web-appen og får ikke pushvarsler.

Varsler sendes til enheter der en voksen har åpnet profilen sin, men ikke til enheten som krysset av.

## Kom i gang

```bash
npm install
npx expo start
```

Appen bruker native moduler (bildevelger, varsler), så den må bygges med EAS for å kjøre på telefon.

## Web-app for iPhone og iPad (gratis)

iPhone og iPad bruker appen fra nettleseren, så det trengs ingen Apple Developer-konto.

1. Repoet → Settings → Pages → Source: **GitHub Actions** (én gang).
2. Hver push til `main` bygger og publiserer appen til https://henning793.github.io/Chores/ (workflow «Publiser web-app»).
3. På iPhone/iPad: åpne adressen i Safari → Del → **Legg til på Hjem-skjerm**. Da åpnes den som en egen app uten adresselinje.

Begrensning: ingen pushvarsler på iPhone/iPad. Avkrysninger vises under Barna → Godkjenn og med tall på fanen når en voksen åpner appen. Varsel før fristen på Gjøremål planlegges lokalt på hver Android-telefon (kl. 09 dagen før, eller én time før når klokkeslett er satt).
Test lokalt med `npx expo start --web`.

## Bygge appen (EAS)

Byggingen startes fra GitHub, så du trenger ikke noe installert lokalt:

1. Lag en token på [expo.dev](https://expo.dev) → Account settings → Access tokens.
2. Legg den inn i GitHub: repoet → Settings → Secrets and variables → Actions → New repository secret,
   med navnet `EXPO_TOKEN`.
3. Gå til Actions → «Bygg app» → Run workflow, og velg plattform og profil.
4. Følg bygget på expo.dev → Projects → ukepenger. Når det er ferdig, åpner du lenken eller QR-koden på telefonen.

Profiler: `preview` er en vanlig testversjon, `development` er for utvikling med `npx expo start`,
og `production` er for Google Play. Vi bygger bare Android; iPhone/iPad bruker web-appen.

## Sjekker

```bash
npm run typecheck
npm run lint
npm run test:regler       # krever Java (Firestore-emulatoren)
```

## Viktige valg

- Beløp lagres i **øre** som heltall.
- Uker følger **norsk tid** og starter **mandag**. All historikk beholdes.
- Barn har **ikke** egne brukere. Enheten er logget inn med en voksen sin konto, og man velger profil på forsiden.
- Hver voksen har sin egen **PIN**.
- Invitasjonslenker er gyldige i **2 timer** og kan brukes én gang.
- Avkrysning, godkjenning og registrering legges i en **kø på enheten** og sendes når nettet er tilbake.
  Hver jobb er en transaksjon som sjekker status først, så ingenting telles dobbelt.
- Beløpet **låses når barnet krysser av**. Endrer du beløpet, gjelder det bare nye avkrysninger.

Se [docs/design.md](docs/design.md) og [docs/design.html](docs/design.html) for skjermflyt og datamodell.
