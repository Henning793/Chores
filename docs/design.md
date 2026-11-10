# Design (v1, godkjent 10. nov 2026)

Fullt designforslag med skjermflyt, skisser og datamodell: [design.html](design.html)
(også publisert som side: https://claude.ai/artifact/12aL3pNuL4SiDcHGe8D8Bx).

## Valgte standarder (godkjent)

1. **Utbetaling:** «Marker som betalt» per barn per uke i Ukeoppgjør. Ingen løpende saldo.
2. **iPad:** Barneprofiler er åpne. Valgfri innstilling «Lås enheten til ett barn» krever voksen-PIN for å bytte.
3. **Gamification:** Én stjerne per godkjent oppgave, sparemål, «dager på rad» og merker.
4. **Beløp:** Låses når barnet krysser av. Endring gjelder bare nye avkrysninger.
5. **Offline:** Avkrysning og godkjenning fungerer uten nett og synkes senere.

## Endringer etter godkjenning

- **10. nov 2026: Firebase i stedet for Supabase**, for å holde alt gratis. Konsekvenser:
  - Innlogging med **e-post og passord** (og Google) i stedet for e-postkode, siden Firebase ikke har innlogging med kode.
  - Pushvarsel sendes fra barnets enhet, siden Cloud Functions krever betalingsplan.
  - Profilbilder lagres som små bilder i databasen, siden Cloud Storage krever betalingsplan.
  - PIN sjekkes på enheten mot en saltet hash som bare familiens voksne kan lese.
