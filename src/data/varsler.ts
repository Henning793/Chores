// Pushvarsler uten Cloud Functions (gratisplanen):
// Enheter der en voksen åpner profilen sin, registrerer en Expo push-token i familien.
// Når et barns avkrysning er lagret, sender barnets enhet selv varselet via Expo sin push-tjeneste.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { vedKryssSendt, type Jobb } from '@/data/utboks';
import { db } from '@/lib/firebase';
import { kr } from '@/lib/penger';

// Web-versjonen (iPhone/iPad) har ikke pushvarsler; de krever en betalt server.
const stottet = Platform.OS !== 'web';

if (stottet) Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let minToken: string | null = null;

/** Registrerer denne enheten for varsler til den voksne. Stille hvis det ikke går. */
export async function registrerForVarsler(familieId: string, uid: string): Promise<void> {
  try {
    if (!stottet || !Device.isDevice) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return; // settes av `eas init`
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('godkjenning', {
        name: 'Til godkjenning',
        importance: AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    minToken = token;
    await setDoc(doc(db, 'familier', familieId, 'push', encodeURIComponent(token)), {
      token,
      uid,
      plattform: Platform.OS,
      oppdatert: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Kunne ikke registrere for varsler', e);
  }
}

/** Fjerner denne enheten fra varsler (ved utlogging). */
export async function avregistrerVarsler(familieId: string): Promise<void> {
  if (!minToken) return;
  await deleteDoc(doc(db, 'familier', familieId, 'push', encodeURIComponent(minToken))).catch(() => {});
  minToken = null;
}

async function sendVarselOmKryss(jobb: Jobb) {
  if (jobb.type !== 'kryss') return;
  try {
    const f = jobb.familieId;
    const [mottakere, barn, oppgave] = await Promise.all([
      getDocs(collection(db, 'familier', f, 'push')),
      getDoc(doc(db, 'familier', f, 'barn', jobb.rad.barnId)),
      getDoc(doc(db, 'familier', f, 'oppgaver', jobb.rad.oppgaveId)),
    ]);
    const tokens = mottakere.docs.map((d) => d.data().token as string).filter((t) => t && t !== minToken);
    if (tokens.length === 0) return;
    const navn = barn.data()?.navn ?? 'Et barn';
    const tittel = oppgave.data()?.tittel ?? 'en oppgave';
    const merknad = jobb.rad.merknad ? ` (${jobb.rad.merknad})` : '';
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: `${navn}: ${tittel}${merknad}`,
          body: `${kr(jobb.rad.belopOre)} venter på godkjenning.`,
          sound: 'default',
          channelId: 'godkjenning',
          data: { lenke: '/voksen' },
        })),
      ),
    });
  } catch (e) {
    console.warn('Kunne ikke sende varsel', e);
  }
}

/** Kobler varsler til køen og åpner godkjenning når et varsel trykkes. Brukes én gang i roten. */
export function useVarsler() {
  useEffect(() => {
    vedKryssSendt((j) => void sendVarselOmKryss(j));
    if (!stottet) return () => vedKryssSendt(null);
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/');
    });
    return () => {
      vedKryssSendt(null);
      sub.remove();
    };
  }, []);
}
