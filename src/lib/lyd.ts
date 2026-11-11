import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/** Lyd ved feiring er på som standard og lagres per enhet. */
const NOKKEL = 'enhet.lyd';
let lydPa = true;
const lyttere = new Set<() => void>();

AsyncStorage.getItem(NOKKEL)
  .then((v) => {
    if (v === 'av') {
      lydPa = false;
      lyttere.forEach((l) => l());
    }
  })
  .catch(() => {});

export function settLyd(pa: boolean) {
  lydPa = pa;
  lyttere.forEach((l) => l());
  AsyncStorage.setItem(NOKKEL, pa ? 'pa' : 'av').catch(() => {});
}

export function useLyd(): boolean {
  return useSyncExternalStore(
    (lytt) => {
      lyttere.add(lytt);
      return () => {
        lyttere.delete(lytt);
      };
    },
    () => lydPa,
  );
}

let spiller: AudioPlayer | null = null;

/** Kort «pling». Gjør ingenting hvis lyden er slått av eller ikke kan spilles. */
export function pling() {
  if (!lydPa) return;
  try {
    spiller ??= createAudioPlayer(require('@/assets/lyd/pling.wav'));
    spiller.seekTo(0);
    spiller.play();
  } catch {
    // Lyd er pynt; feil skal aldri stoppe appen.
  }
}

/** Liten vibrasjon. Ikke tilgjengelig i web-appen. */
export function dunk(type: 'pang' | 'landet') {
  if (Platform.OS === 'web') return;
  (type === 'pang'
    ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  ).catch(() => {});
}
