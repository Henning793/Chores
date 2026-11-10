import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/data/auth';
import { useGodtaInvitasjon, useOpprettFamilie } from '@/data/familie';
import { feiltekst } from '@/lib/firebase';
import { Chip, Chips, Felt, Feilmelding, Knapp, Skjerm, T } from '@/ui/komponenter';
import { avstand, useFarger } from '@/ui/tema';

import { INVITASJON_NOKKEL } from '@/lib/konstanter';

/** Henter token ut av en hel invitasjonslenke eller en innlimt kode. */
function lesToken(tekst: string): string {
  const treff = tekst.match(/[?&]t=([a-f0-9]+)/i);
  return (treff ? treff[1] : tekst).trim();
}

export default function Velkommen() {
  const f = useFarger();
  const { bruker, loggUt } = useAuth();
  const opprett = useOpprettFamilie();
  const godta = useGodtaInvitasjon();
  const [modus, setModus] = useState<'opprett' | 'bli-med'>('opprett');
  const [familienavn, setFamilienavn] = useState('');
  const [navn, setNavn] = useState('');
  const [invitasjon, setInvitasjon] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(INVITASJON_NOKKEL)
      .then((t) => {
        if (t) {
          setInvitasjon(t);
          setModus('bli-med');
        }
      })
      .catch(() => {});
  }, []);

  const pinOk = /^\d{4}$/.test(pin) && pin === pin2;
  const klar =
    navn.trim().length > 0 && pinOk && (modus === 'opprett' ? familienavn.trim().length > 0 : invitasjon.trim().length > 0);

  async function fullfor() {
    setFeil(null);
    try {
      if (modus === 'opprett') {
        await opprett.mutateAsync({ familienavn: familienavn.trim(), visningsnavn: navn.trim(), pin });
      } else {
        await godta.mutateAsync({ token: lesToken(invitasjon), visningsnavn: navn.trim(), pin });
        await AsyncStorage.removeItem(INVITASJON_NOKKEL).catch(() => {});
      }
    } catch (e) {
      setFeil(feiltekst(e));
    }
  }

  return (
    <Skjerm stil={{ maxWidth: 480 }}>
      <T dempet>Innlogget som {bruker?.email}</T>
      <Chips>
        <Chip tekst="Opprett ny familie" valgt={modus === 'opprett'} onPress={() => setModus('opprett')} />
        <Chip tekst="Jeg er invitert" valgt={modus === 'bli-med'} onPress={() => setModus('bli-med')} />
      </Chips>

      {modus === 'opprett' ? (
        <Felt etikett="Familiens navn" value={familienavn} onChangeText={setFamilienavn} placeholder="F.eks. Familien Hansen" />
      ) : (
        <Felt
          etikett="Invitasjonslenke"
          value={invitasjon}
          onChangeText={setInvitasjon}
          placeholder="Lim inn lenken du fikk"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      <Felt etikett="Ditt navn i appen" value={navn} onChangeText={setNavn} placeholder="F.eks. Pappa eller Henning" />

      <View style={{ gap: avstand.s }}>
        <T v="tittel">Velg din PIN</T>
        <T dempet>Fire sifre. Du bruker den for å åpne voksenprofilen din, også på barnas enheter.</T>
        <Felt
          etikett="PIN"
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <Felt
          etikett="Gjenta PIN"
          value={pin2}
          onChangeText={(t) => setPin2(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        {pin2.length === 4 && pin !== pin2 ? <T farge={f.nei}>PIN-kodene er ikke like.</T> : null}
      </View>

      <Feilmelding tekst={feil} />
      <Knapp
        tittel={modus === 'opprett' ? 'Opprett familie' : 'Bli med i familien'}
        deaktivert={!klar}
        laster={opprett.isPending || godta.isPending}
        onPress={fullfor}
      />
      <Knapp tittel="Logg ut" variant="myk" onPress={loggUt} />
    </Skjerm>
  );
}
