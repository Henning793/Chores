import { Alert, Platform } from 'react-native';

/** Spør før noe som ikke kan angres. Alert virker ikke i nettleseren, så der brukes confirm. */
export function bekreft(tittel: string, tekst: string, knapp: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${tittel}\n\n${tekst}`));
  return new Promise((svar) =>
    Alert.alert(tittel, tekst, [
      { text: 'Avbryt', style: 'cancel', onPress: () => svar(false) },
      { text: knapp, style: 'destructive', onPress: () => svar(true) },
    ], { cancelable: true, onDismiss: () => svar(false) }),
  );
}
