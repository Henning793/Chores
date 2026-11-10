import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { useAuth } from '@/data/auth';
import { feiltekst } from '@/lib/supabase';
import { Felt, Feilmelding, Knapp, Skjerm, T } from '@/ui/komponenter';
import { avstand } from '@/ui/tema';

export default function LoggInn() {
  const { sendKode, bekreftKode, loggInnMedGoogle } = useAuth();
  const [epost, setEpost] = useState('');
  const [kode, setKode] = useState('');
  const [steg, setSteg] = useState<'epost' | 'kode'>('epost');
  const [opptatt, setOpptatt] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  const gyldigEpost = /^\S+@\S+\.\S+$/.test(epost.trim());

  async function kjor(fn: () => Promise<void>) {
    setFeil(null);
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

        {steg === 'epost' ? (
          <>
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
            <Knapp
              tittel="Send meg en kode"
              deaktivert={!gyldigEpost}
              laster={opptatt}
              onPress={() =>
                kjor(async () => {
                  await sendKode(epost);
                  setSteg('kode');
                })
              }
            />
            <T dempet sentrert v="liten">
              eller
            </T>
            <Knapp tittel="Fortsett med Google" variant="kant" deaktivert={opptatt} onPress={() => kjor(loggInnMedGoogle)} />
            <T dempet sentrert v="liten">
              Ingen passord. Du får en kode på e-post.
            </T>
          </>
        ) : (
          <>
            <T>
              Vi har sendt en kode til <T fet>{epost.trim()}</T>.
            </T>
            <Felt
              etikett="Kode"
              value={kode}
              onChangeText={(t) => setKode(t.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              autoFocus
            />
            <Knapp
              tittel="Logg inn"
              deaktivert={kode.length < 6}
              laster={opptatt}
              onPress={() => kjor(() => bekreftKode(epost, kode))}
            />
            <Knapp
              tittel="Bruk en annen e-post"
              variant="myk"
              onPress={() => {
                setKode('');
                setSteg('epost');
              }}
            />
          </>
        )}
        <Feilmelding tekst={feil} />
      </Skjerm>
    </KeyboardAvoidingView>
  );
}
