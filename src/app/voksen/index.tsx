import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBarn } from '@/data/familie';
import { useUker } from '@/data/uker';
import { useUtforelser } from '@/data/utforelser';
import { kr } from '@/lib/penger';
import { ukeStart } from '@/lib/uke';
import { Barneoppgaver } from '@/skjermer/Barneoppgaver';
import { FullfortOppgave } from '@/skjermer/FullfortOppgave';
import { Godkjenn } from '@/skjermer/Godkjenn';
import { Ukeoppgjor } from '@/skjermer/Ukeoppgjor';
import { Avatar, Bryter, Laster } from '@/ui/komponenter';
import { avstand, useFarger } from '@/ui/tema';

type Fane = 'godkjenn' | 'oppgaver' | 'uker';

/** «Barna»: alt som handler om barna. Barna øverst, så Godkjenn · Oppgaver · Uker. */
export default function Barna() {
  const f = useFarger();
  const barn = useBarn();
  const { uker } = useUker();
  const utforelser = useUtforelser();
  const [fane, setFane] = useState<Fane>('godkjenn');
  const [fullfort, setFullfort] = useState<{ barnId?: string } | null>(null);

  if (barn.isPending) return <Laster />;

  const denne = ukeStart();
  const tjent = (barnId: string) => uker.find((u) => u.barnId === barnId && u.ukeStart === denne)?.tjentOre ?? 0;
  const venter = utforelser.data.filter((u) => u.status === 'venter').length;

  return (
    <View style={{ flex: 1, backgroundColor: f.bg }}>
      <View style={[styles.topp, { backgroundColor: f.barnRom }]}>
        {barn.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barna}>
            {barn.data.map((b) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={`${b.navn}, ${kr(tjent(b.id))} denne uka. Før opp en fullført oppgave.`}
                onPress={() => setFullfort({ barnId: b.id })}
                style={({ pressed }) => [styles.barn, { opacity: pressed ? 0.7 : 1 }]}>
                <Avatar navn={b.navn} farge={b.farge} bilde={b.bilde} storrelse={44} />
                <Text style={{ color: f.tekst, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                  {b.navn}
                </Text>
                <Text style={{ color: f.barnRomTekst, fontWeight: '700', fontSize: 12, fontVariant: ['tabular-nums'] }}>
                  {kr(tjent(b.id))}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <Bryter
          verdi={fane}
          onEndre={setFane}
          valg={[
            { verdi: 'godkjenn', tekst: 'Godkjenn', antall: venter },
            { verdi: 'oppgaver', tekst: 'Oppgaver' },
            { verdi: 'uker', tekst: 'Uker' },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {fane === 'godkjenn' ? <Godkjenn onFullfort={() => setFullfort({})} /> : null}
        {fane === 'oppgaver' ? <Barneoppgaver /> : null}
        {fane === 'uker' ? <Ukeoppgjor /> : null}
      </View>
      {fullfort ? <FullfortOppgave barnId={fullfort.barnId} onLukk={() => setFullfort(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topp: { paddingHorizontal: avstand.l, paddingBottom: avstand.m, gap: avstand.m },
  barna: { gap: avstand.l, paddingRight: avstand.l },
  barn: { alignItems: 'center', gap: 2, minWidth: 56 },
});
