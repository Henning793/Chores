import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { useAuth } from '@/data/auth';
import { feiltekst } from '@/lib/firebase';
import { Chip, Chips, Felt, Feilmelding, Knapp, Skjerm, T } from '@/ui/komponenter';
import { avstand, useFarger } from '@/ui/tema';

WebBrowser.maybeCompleteAuthSession();

const googleKonfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};
const harGoogle = !!(googleKonfig.webClientId || googleKonfig.iosClientId || googleKonfig.androidClientId);

export default function LoggInn() {
  const f = useFarger();
  const { loggInn, opprettBruker, glemtPassord } = useAuth();
  const [modus, setModus] = useState<'logg-inn' | 'ny'>('logg-inn');
  const [epost, setEpost] = useState('');
  const [passord, setPassord] = useState('');
  const [opptatt, setOpptatt] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const gyldigEpost = /^\S+@\S+\.\S+$/.test(epost.trim());

  async function kjor(fn: () => Promise<void>) {
    setFeil(null);
    setMelding(null);
    setOpptatt(true);
    try {
      await fn();
    } catch (e) {
      setFeil(feiltekst(e));
    } finally {
      setOpptatt(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Skjerm utenTopp={false} stil={{ justifyContent: 'center', flexGrow: 1, maxWidth: 440 }}>
        <View style={{ alignItems: 'center', gap: avstand.s, marginBottom: avstand.xl }}>
          <Text style={{ fontSize: 56 }}>🪙</Text>
          <T v="visning">Ukepenger</T>
          <T dempet>For hele familien</T>
        </View>

        <Chips>
          <Chip tekst="Logg inn" valgt={modus === 'logg-inn'} onPress={() => setModus('logg-inn')} />
          <Chip tekst="Ny bruker" valgt={modus === 'ny'} onPress={() => setModus('ny')} />
        </Chips>
        <Felt
          etikett="E-post"
          value={epost}
          onChangeText={setEpost}
          placeholder="din@epost.no"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Felt
          etikett={modus === 'ny' ? 'Velg passord (minst 6 tegn)' : 'Passord'}
          value={passord}
          onChangeText={setPassord}
          secureTextEntry
          autoComplete={modus === 'ny' ? 'new-password' : 'current-password'}
          textContentType={modus === 'ny' ? 'newPassword' : 'password'}
        />
        <Knapp
          tittel={modus === 'ny' ? 'Opprett bruker' : 'Logg inn'}
          deaktivert={!gyldigEpost || passord.length < 6}
          laster={opptatt}
          onPress={() => kjor(() => (modus === 'ny' ? opprettBruker(epost, passord) : loggInn(epost, passord)))}
        />
        {modus === 'logg-inn' ? (
          <Knapp
            tittel="Glemt passord?"
            variant="myk"
            liten
            deaktivert={!gyldigEpost || opptatt}
            onPress={() =>
              kjor(async () => {
                await glemtPassord(epost);
                setMelding(`Vi har sendt en lenke for nytt passord til ${epost.trim()}.`);
              })
            }
          />
        ) : null}

        {harGoogle ? <GoogleKnapp opptatt={opptatt} kjor={kjor} /> : null}

        {melding ? <T farge={f.ok}>{melding}</T> : null}
        <Feilmelding tekst={feil} />
      </Skjerm>
    </KeyboardAvoidingView>
  );
}

function GoogleKnapp({ opptatt, kjor }: { opptatt: boolean; kjor: (fn: () => Promise<void>) => Promise<void> }) {
  const { loggInnMedGoogle } = useAuth();
  const [foresporsel, svar, start] = Google.useIdTokenAuthRequest(googleKonfig);

  useEffect(() => {
    if (svar?.type === 'success' && svar.params.id_token) {
      void kjor(() => loggInnMedGoogle(svar.params.id_token));
    }
  }, [svar, kjor, loggInnMedGoogle]);

  return (
    <>
      <T dempet sentrert v="liten">
        eller
      </T>
      <Knapp tittel="Fortsett med Google" variant="kant" deaktivert={!foresporsel || opptatt} onPress={() => void start()} />
    </>
  );
}
