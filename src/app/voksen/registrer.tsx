import { useState } from 'react';

import { useBarn, useOppgaver } from '@/data/familie';
import { useUtforelseHandlinger } from '@/data/utforelser';
import { kr } from '@/lib/penger';
import { dagFor, leggTilDager } from '@/lib/uke';
import { Chip, Chips, Felt, Knapp, Laster, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { useFarger } from '@/ui/tema';

const DAGER = [
  { tekst: 'I dag', tilbake: 0 },
  { tekst: 'I går', tilbake: 1 },
  { tekst: '2 dager siden', tilbake: 2 },
];

export default function Registrer() {
  const f = useFarger();
  const barn = useBarn();
  const oppgaver = useOppgaver();
  const { registrer } = useUtforelseHandlinger();
  const [barnId, setBarnId] = useState<string | null>(null);
  const [oppgaveId, setOppgaveId] = useState<string | null>(null);
  const [tilbake, setTilbake] = useState(0);
  const [merknad, setMerknad] = useState('');
  const [melding, setMelding] = useState<string | null>(null);

  if (barn.isPending || oppgaver.isPending) return <Laster />;
  if (!barn.data?.length || !oppgaver.data?.length) {
    return (
      <Skjerm>
        <Tom ikon="➕" tittel="Legg til barn og oppgaver først" tekst="Barn legger du til under Mer, oppgaver under Oppgaver." />
      </Skjerm>
    );
  }

  const oppgave = oppgaver.data.find((o) => o.id === oppgaveId);
  const b = barn.data.find((x) => x.id === barnId);

  function lagre() {
    if (!oppgave || !b) return;
    let tid = new Date();
    if (tilbake > 0) {
      // Klokka 12 norsk tid den valgte dagen, så den havner i riktig uke.
      tid = new Date(`${leggTilDager(dagFor(), -tilbake)}T12:00:00+01:00`);
    }
    registrer(b.id, oppgave, merknad || null, tid);
    setMelding(`Registrert: ${oppgave.tittel} for ${b.navn}, ${kr(oppgave.belop_ore)}.`);
    setOppgaveId(null);
    setMerknad('');
  }

  return (
    <Skjerm>
      <T dempet>For når barnet glemte å krysse av selv. Lagres som godkjent med en gang.</T>
      <Seksjon>Hvem?</Seksjon>
      <Chips>
        {barn.data.map((x) => (
          <Chip key={x.id} tekst={x.navn} valgt={barnId === x.id} onPress={() => setBarnId(x.id)} />
        ))}
      </Chips>
      <Seksjon>Hva?</Seksjon>
      <Chips>
        {oppgaver.data.map((o) => (
          <Chip
            key={o.id}
            tekst={`${o.ikon ?? ''} ${o.tittel}`.trim()}
            valgt={oppgaveId === o.id}
            onPress={() => {
              setOppgaveId(o.id);
              setMerknad('');
            }}
          />
        ))}
      </Chips>
      {oppgave?.forslag.length ? (
        <Chips>
          {oppgave.forslag.map((s) => (
            <Chip key={s} tekst={s} valgt={merknad === s} onPress={() => setMerknad(merknad === s ? '' : s)} />
          ))}
        </Chips>
      ) : null}
      <Felt value={merknad} onChangeText={setMerknad} placeholder="Merknad (valgfritt)" maxLength={120} />
      <Seksjon>Når?</Seksjon>
      <Chips>
        {DAGER.map((d) => (
          <Chip key={d.tilbake} tekst={d.tekst} valgt={tilbake === d.tilbake} onPress={() => setTilbake(d.tilbake)} />
        ))}
      </Chips>
      <Knapp
        tittel={oppgave ? `Registrer som godkjent · ${kr(oppgave.belop_ore)}` : 'Registrer som godkjent'}
        variant="ok"
        deaktivert={!oppgave || !b}
        onPress={lagre}
      />
      {melding ? <T farge={f.ok} fet>{melding}</T> : null}
    </Skjerm>
  );
}
