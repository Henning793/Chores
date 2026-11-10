import { StyleSheet, Text, View } from 'react-native';

/**
 * Midlertidig skjerm. Erstattes når designet er godkjent.
 */
export function Plassholder({ tittel, beskrivelse }: { tittel: string; beskrivelse?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.tittel}>{tittel}</Text>
      {beskrivelse ? <Text style={styles.beskrivelse}>{beskrivelse}</Text> : null}
      <Text style={styles.merknad}>Bygges etter at designet er godkjent.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  tittel: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  beskrivelse: { fontSize: 16, textAlign: 'center', opacity: 0.8 },
  merknad: { fontSize: 13, opacity: 0.5, marginTop: 16 },
});
