import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/data/auth';
import { velgBilde } from '@/data/bilder';
import {
  opprettInvitasjon,
  useArkiverBarn,
  useBarn,
  useFamilieId,
  useLagreBarn,
  useLagreVoksen,
  useMeg,
  useVoksne,
} from '@/data/familie';
import { useProfil } from '@/data/profil';
import { avregistrerVarsler } from '@/data/varsler';
import type { Barn } from '@/data/typer';
import { feiltekst } from '@/lib/firebase';
import { Avatar, Chip, Chips, Felt, Feilmelding, Knapp, Kort, Laster, Pille, Rad, Seksjon, Skjerm, T } from '@/ui/komponenter';
import { avstand, profilFarger, useFarger } from '@/ui/tema';

export default function Mer() {
  const meg = useMeg();
  const barn = useBarn();
  const voksne = useVoksne();
  const { loggUt, bruker } = useAuth();
  const familieId = useFamilieId();
  const { aktiv, lastBarn, settLastBarn, bytt } = useProfil();
  const [redigerBarn, setRedigerBarn] = useState<Partial<Barn> | null>(null);

  if (barn.isPending || voksne.isPending) return <Laster />;
  const erInnloggetVoksen = aktiv?.type === 'voksen' && aktiv.id === bruker?.uid;

  return (
    <>
      <Skjerm>
        <T v="tittel">{meg.data?.familie.navn}</T>

        <Seksjon>Barn</Seksjon>
        {barn.data?.map((b) => (
          <Rad key={b.id} onPress={() => setRedigerBarn(b)}>
            <Avatar navn={b.navn} farge={b.farge} bilde={b.bilde} />
            <T fet stil={{ flex: 1 }}>
              {b.navn}
            </T>
            <T dempet>Endre</T>
          </Rad>
        ))}
        <Knapp tittel="+ Legg til barn" variant="myk" onPress={() => setRedigerBarn({ farge: profilFarger[(barn.data?.length ?? 0) % profilFarger.length] })} />

        <Seksjon>Voksne</Seksjon>
        {voksne.data?.map((v) => (
          <Rad key={v.id}>
            <Avatar navn={v.visningsnavn} bilde={v.bilde} />
            <T fet stil={{ flex: 1 }}>
              {v.visningsnavn}
            </T>
            {aktiv?.id === v.id ? <Pille tekst="Deg" type="info" /> : null}
          </Rad>
        ))}
        <Invitasjon />

        <Seksjon>Min profil</Seksjon>
        {aktiv?.type === 'voksen' ? <MinProfil brukerId={aktiv.id} kanEndre={erInnloggetVoksen} /> : null}

        <Seksjon>Denne enheten</Seksjon>
        <Kort>
          <T fet>Lås enheten til ett barn</T>
          <T dempet v="liten">
            Da vises bare dette barnet på forsiden, og det kreves voksen-PIN for å bytte profil. Passer på barnets egen iPad.
          </T>
          <Chips>
            <Chip tekst="Av" valgt={!lastBarn} onPress={() => settLastBarn(null)} />
            {barn.data?.map((b) => (
              <Chip key={b.id} tekst={b.navn} valgt={lastBarn === b.id} onPress={() => settLastBarn(b.id)} />
            ))}
          </Chips>
        </Kort>
        <T dempet v="liten">
          Innlogget som {bruker?.email}
        </T>
        <Knapp
          tittel="Logg ut av denne enheten"
          variant="nei"
          onPress={async () => {
            bytt();
            settLastBarn(null);
            await avregistrerVarsler(familieId);
            await loggUt();
            router.replace('/');
          }}
        />
      </Skjerm>
      {redigerBarn ? <BarnSkjema start={redigerBarn} onLukk={() => setRedigerBarn(null)} /> : null}
    </>
  );
}

function Invitasjon() {
  const familieId = useFamilieId();
  const { bruker } = useAuth();
  const [lenke, setLenke] = useState<string | null>(null);
  const [utloper, setUtloper] = useState<number | null>(null);
  const [na, setNa] = useState(() => Date.now());
  const [feil, setFeil] = useState<string | null>(null);
  const [opptatt, setOpptatt] = useState(false);

  useEffect(() => {
    if (!utloper) return;
    const t = setInterval(() => setNa(Date.now()), 30000);
    return () => clearInterval(t);
  }, [utloper]);

  const igjen = utloper ? Math.max(0, utloper - na) : 0;
  const tid = `${Math.floor(igjen / 3600000)} t ${Math.floor((igjen % 3600000) / 60000)} min`;

  async function lag() {
    setFeil(null);
    setOpptatt(true);
    try {
      const inv = await opprettInvitasjon(familieId, bruker!.uid);
      setLenke(Linking.createURL('invitasjon', { queryParams: { t: inv.token } }));
      setUtloper(inv.utloper);
      setNa(Date.now());
    } catch (e) {
      setFeil(feiltekst(e));
    } finally {
      setOpptatt(false);
    }
  }

  if (!lenke || igjen === 0) {
    return (
      <>
        <Knapp tittel="Inviter en voksen" variant="myk" laster={opptatt} onPress={lag} />
        <Feilmelding tekst={feil} />
      </>
    );
  }

  return (
    <Kort>
      <T fet>Del lenken med den du vil invitere</T>
      <T v="liten" dempet selectable>
        {lenke}
      </T>
      <Pille tekst={`Gyldig i ${tid}`} type="venter" />
      <Knapp
        tittel="Del via SMS, e-post …"
        onPress={() =>
          Share.share({
            message: `Bli med i familien vår i Ukepenger-appen. Åpne lenken på telefonen der appen er installert (gyldig i 2 timer): ${lenke}`,
          })
        }
      />
      <T dempet v="liten">
        Lenken kan brukes én gang. Har mottakeren problemer med å åpne den, kan hen lime den inn under «Jeg er invitert» etter innlogging.
      </T>
    </Kort>
  );
}

function MinProfil({ brukerId, kanEndre }: { brukerId: string; kanEndre: boolean }) {
  const voksne = useVoksne();
  const lagre = useLagreVoksen();
  const v = voksne.data?.find((x) => x.id === brukerId);
  const [navn, setNavn] = useState(v?.visningsnavn ?? '');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [melding, setMelding] = useState<string | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  if (!kanEndre) {
    return (
      <T dempet v="liten">
        Navn, bilde og PIN endres på en enhet der du selv er logget inn.
      </T>
    );
  }

  async function kjor(fn: () => Promise<void>, ok: string) {
    setFeil(null);
    setMelding(null);
    try {
      await fn();
      setMelding(ok);
    } catch (e) {
      setFeil(feiltekst(e));
    }
  }

  return (
    <Kort>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: avstand.m }}>
        <Avatar navn={v?.visningsnavn ?? '?'} bilde={v?.bilde} storrelse={56} />
        <Knapp
          tittel="Velg bilde"
          variant="myk"
          liten
          onPress={() =>
            kjor(async () => {
              const bilde = await velgBilde();
              if (bilde) await lagre.mutateAsync({ bilde });
            }, 'Bildet er lagret.')
          }
        />
      </View>
      <Felt etikett="Navn i appen" value={navn} onChangeText={setNavn} maxLength={40} />
      <Knapp
        tittel="Lagre navn"
        variant="myk"
        liten
        deaktivert={!navn.trim() || navn === v?.visningsnavn}
        onPress={() => kjor(() => lagre.mutateAsync({ visningsnavn: navn.trim() }), 'Navnet er lagret.')}
      />
      <T fet>Endre PIN</T>
      <View style={{ flexDirection: 'row', gap: avstand.s }}>
        <Felt
          stil={{ flex: 1 }}
          placeholder="Ny PIN"
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
        />
        <Felt
          stil={{ flex: 1 }}
          placeholder="Gjenta"
          value={pin2}
          onChangeText={(t) => setPin2(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
        />
      </View>
      <Knapp
        tittel="Lagre ny PIN"
        variant="myk"
        liten
        deaktivert={!/^\d{4}$/.test(pin) || pin !== pin2}
        onPress={() =>
          kjor(async () => {
            await lagre.mutateAsync({ pin });
            setPin('');
            setPin2('');
          }, 'Ny PIN er lagret.')
        }
      />
      {melding ? <Pille tekst={melding} type="godkjent" /> : null}
      <Feilmelding tekst={feil} />
    </Kort>
  );
}

function BarnSkjema({ start, onLukk }: { start: Partial<Barn>; onLukk: () => void }) {
  const f = useFarger();
  const lagre = useLagreBarn();
  const arkiver = useArkiverBarn();
  const [navn, setNavn] = useState(start.navn ?? '');
  const [farge, setFarge] = useState(start.farge ?? profilFarger[0]);
  const [bilde, setBilde] = useState<string | null>(start.bilde ?? null);
  const [feil, setFeil] = useState<string | null>(null);
  const [lasterOpp, setLasterOpp] = useState(false);
  const [bekreftArkiver, setBekreftArkiver] = useState(false);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLukk}>
      <ScrollView style={{ backgroundColor: f.bg }} contentContainerStyle={styles.skjema} keyboardShouldPersistTaps="handled">
        <View style={styles.topp}>
          <T v="tittel">{start.id ? `Endre ${start.navn}` : 'Nytt barn'}</T>
          <Pressable onPress={onLukk} hitSlop={12} accessibilityRole="button">
            <T farge={f.merke} fet>
              Lukk
            </T>
          </Pressable>
        </View>
        <View style={{ alignItems: 'center', gap: avstand.s }}>
          <Avatar navn={navn || '?'} farge={farge} bilde={bilde} storrelse={96} />
          <View style={{ flexDirection: 'row', gap: avstand.s }}>
            <Knapp
              tittel="Velg bilde fra galleri"
              variant="myk"
              liten
              laster={lasterOpp}
              onPress={async () => {
                setFeil(null);
                setLasterOpp(true);
                try {
                  const valgt = await velgBilde();
                  if (valgt) setBilde(valgt);
                } catch (e) {
                  setFeil(feiltekst(e));
                } finally {
                  setLasterOpp(false);
                }
              }}
            />
            {bilde ? <Knapp tittel="Fjern" variant="myk" liten onPress={() => setBilde(null)} /> : null}
          </View>
        </View>
        <Felt etikett="Navn" value={navn} onChangeText={setNavn} maxLength={40} />
        <T v="liten" dempet fet>
          Farge
        </T>
        <View style={{ flexDirection: 'row', gap: avstand.s, flexWrap: 'wrap' }}>
          {profilFarger.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityLabel={`Farge ${p}`}
              accessibilityState={{ selected: farge === p }}
              onPress={() => setFarge(p)}
              style={[styles.farge, { backgroundColor: p, borderColor: farge === p ? f.tekst : 'transparent' }]}
            />
          ))}
        </View>
        <Feilmelding tekst={feil ?? (lagre.error ? feiltekst(lagre.error) : null)} />
        <Knapp
          tittel="Lagre"
          deaktivert={!navn.trim()}
          laster={lagre.isPending}
          onPress={async () => {
            await lagre.mutateAsync({ id: start.id, navn: navn.trim(), farge, bilde: bilde });
            onLukk();
          }}
        />
        {start.id ? (
          bekreftArkiver ? (
            <Kort>
              <T>
                Fjerne {start.navn} fra appen? Historikken beholdes, men {start.navn} vises ikke lenger på forsiden.
              </T>
              <View style={{ flexDirection: 'row', gap: avstand.s }}>
                <Knapp tittel="Avbryt" variant="myk" stil={{ flex: 1 }} onPress={() => setBekreftArkiver(false)} />
                <Knapp
                  tittel="Fjern"
                  variant="nei"
                  stil={{ flex: 1 }}
                  laster={arkiver.isPending}
                  onPress={async () => {
                    await arkiver.mutateAsync(start.id!);
                    onLukk();
                  }}
                />
              </View>
            </Kort>
          ) : (
            <Knapp tittel={`Fjern ${start.navn}`} variant="nei" onPress={() => setBekreftArkiver(true)} />
          )
        ) : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  skjema: { padding: avstand.l, gap: avstand.m, paddingBottom: 60, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topp: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: avstand.s },
  farge: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
});
