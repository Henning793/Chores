import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence, initializeAuth, type Auth } from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

// Verdiene settes i .env (se .env.example). Disse nøklene er ment å ligge i appen;
// tilgang styres av sikkerhetsreglene i firestore.rules.
const konfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!konfig.apiKey || !konfig.projectId || !konfig.appId) {
  throw new Error('Mangler Firebase-verdier i .env (se .env.example)');
}

const forsteGang = getApps().length === 0;
export const app = forsteGang ? initializeApp(konfig) : getApp();

// Innloggingen huskes på enheten.
export const auth: Auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

// Long polling er mer stabilt i React Native enn WebChannel-strømmer.
export const db: Firestore = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

/** Firestore og Auth bruker koden «unavailable»/«network-request-failed» når enheten er uten nett. */
export function erNettverksfeil(feil: unknown): boolean {
  const kode = (feil as { code?: string })?.code ?? '';
  const melding = ((feil as { message?: string })?.message ?? '').toLowerCase();
  return (
    kode === 'unavailable' ||
    kode === 'auth/network-request-failed' ||
    kode === 'deadline-exceeded' ||
    melding.includes('offline') ||
    melding.includes('network')
  );
}

const MELDINGER: Record<string, string> = {
  'auth/invalid-email': 'E-postadressen ser ikke riktig ut.',
  'auth/invalid-credential': 'Feil e-post eller passord.',
  'auth/wrong-password': 'Feil e-post eller passord.',
  'auth/user-not-found': 'Feil e-post eller passord.',
  'auth/email-already-in-use': 'Det finnes allerede en bruker med denne e-posten. Logg inn i stedet.',
  'auth/weak-password': 'Passordet må ha minst 6 tegn.',
  'auth/too-many-requests': 'For mange forsøk. Vent litt og prøv igjen.',
  'permission-denied': 'Du har ikke tilgang til dette.',
};

/** Gjør en feil om til en melding som kan vises til brukeren. */
export function feiltekst(feil: unknown): string {
  if (erNettverksfeil(feil)) return 'Ingen nettforbindelse. Prøv igjen når du er på nett.';
  const kode = (feil as { code?: string })?.code;
  if (kode && MELDINGER[kode]) return MELDINGER[kode];
  return (feil as { message?: string })?.message || 'Noe gikk galt. Prøv igjen.';
}
