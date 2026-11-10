import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBarn, useMeg, useVoksne } from '@/data/familie';
import { useProfil } from '@/data/profil';
import { useSanntid, useUtforelser } from '@/data/utforelser';
import { ukeStart } from '@/lib/uke';
import { Avatar, Laster, Seksjon, Skjerm, T, Tom } from '@/ui/komponenter';
import { avstand, radius, useFarger } from '@/ui/tema';

/** «Hvem bruker appen?» Barneprofiler er åpne, voksne krever PIN. */
export default function Hvem() {
  const f = useFarger();
  useSanntid();
  const meg = useMeg();
  const barn = useBarn();
  const voksne = useVoksne();
  const utforelser = useUtforelser();
  const { aktiv, lastBarn, velgBarn, bytt } = useProfil();

  // Går rett til riktig visning hvis en profil allerede er valgt (f.eks. låst barn).
  useFocusEffect(
    useCallback(() => {
      if (aktiv?.type === 'barn') router.push({ pathname: '/barn/[barnId]', params: { barnId: aktiv.id } });
      else if (aktiv?.type === 'voksen') router.push('/voksen');
    }, [aktiv]),
  );

  if (barn.isPending || voksne.isPending) return <Laster />;

  const denneUka = ukeStart();
  const stjerner = (barnId: string) =>
    utforelser.data.filter((u) => u.barn_id === barnId && u.uke_start === denneUka && u.status === 'godkjent').length;
  const venter = utforelser.data.filter((u) => u.status === 'venter').length;
  const synligeBarn = (barn.data ?? []).filter((b) => !lastBarn || b.id === lastBarn);

  return (
    <Skjerm utenTopp={false}>
      <View style={{ gap: 2, marginTop: avstand.l }}>
        <T dempet>{meg.data?.familie.navn}</T>
        <T v="visning">Hvem bruker appen?</T>
      </View>

      <Seksjon>Barn</Seksjon>
      {synligeBarn.length === 0 ? (
        <Tom ikon="👧" tittel="Ingen barn ennå" tekst="Åpne voksenprofilen din og legg til barn under Mer." />
      ) : (
        <View style={styles.rutenett}>
          {synligeBarn.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Bruk appen som ${b.navn}`}
              onPress={() => velgBarn(b.id)}
              style={({ pressed }) => [styles.flis, { backgroundColor: f.flate, borderColor: f.linje, opacity: pressed ? 0.7 : 1 }]}>
              <Avatar navn={b.navn} farge={b.farge} bildeSti={b.bilde_sti} storrelse={88} />
              <T v="tittel">{b.navn}</T>
              <T dempet v="liten">
                ⭐ {stjerner(b.id)} denne uka
              </T>
            </Pressable>
          ))}
        </View>
      )}

      <Seksjon>Voksne</Seksjon>
      <View style={styles.rutenett}>
        {(voksne.data ?? []).map((v) => (
          <Pressable
            key={v.bruker_id}
            accessibilityRole="button"
            accessibilityLabel={`Åpne voksenprofilen til ${v.visningsnavn}`}
            onPress={() => {
              bytt();
              router.push({ pathname: '/pin', params: { voksen: v.bruker_id } });
            }}
            style={({ pressed }) => [styles.flis, styles.flisLiten, { backgroundColor: f.flate, borderColor: f.linje, opacity: pressed ? 0.7 : 1 }]}>
            <Avatar navn={v.visningsnavn} bildeSti={v.bilde_sti} storrelse={48} />
            <T fet>{v.visningsnavn}</T>
            <Text style={{ color: f.dempet, fontSize: 12 }}>🔒 PIN{venter > 0 ? ` · ${venter} venter` : ''}</Text>
          </Pressable>
        ))}
      </View>
    </Skjerm>
  );
}

const styles = StyleSheet.create({
  rutenett: { flexDirection: 'row', flexWrap: 'wrap', gap: avstand.m },
  flis: {
    flexGrow: 1,
    flexBasis: 150,
    maxWidth: 260,
    alignItems: 'center',
    gap: avstand.s,
    padding: avstand.l,
    borderWidth: 1,
    borderRadius: radius.l,
  },
  flisLiten: { padding: avstand.m },
});
