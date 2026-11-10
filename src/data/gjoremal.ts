// Gjøremål: felles liste for de voksne i familien. Barnevisningen henter den aldri.

import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';
import { collection, doc, query, writeBatch } from 'firebase/firestore';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/data/auth';
import { useFamilieId } from '@/data/familie';
import { useLive } from '@/data/live';
import type { Gjoremal } from '@/data/typer';
import { db } from '@/lib/firebase';
import { fristTekst, nesteFrist, varselTidspunkt } from '@/lib/frist';

const loggFeil = (e: unknown) => console.warn('Lagring av gjøremål feilet', e);

export function useGjoremal() {
  const familieId = useFamilieId();
  const q = useMemo(() => query(collection(db, 'familier', familieId, 'gjoremal')), [familieId]);
  return useLive<Gjoremal>(['gjoremal', familieId], q);
}

export type NyttGjoremal = Pick<Gjoremal, 'tittel' | 'beskrivelse' | 'frist' | 'fristKl' | 'gjentas'>;

/** Alle skrivinger går rett til Firestore, som viser endringen med en gang og synker når det er nett. */
export function useGjoremalHandlinger() {
  const familieId = useFamilieId();
  const { bruker } = useAuth();
  const uid = bruker?.uid ?? '';
  const samling = collection(db, 'familier', familieId, 'gjoremal');

  return {
    lagre(id: string | undefined, v: NyttGjoremal) {
      const b = writeBatch(db);
      if (id) b.update(doc(samling, id), { ...v });
      else
        b.set(doc(samling), {
          ...v,
          fullfort: null,
          fullfortAv: null,
          opprettet: new Date().toISOString(),
          opprettetAv: uid,
          nesteId: null,
        });
      b.commit().catch(loggFeil);
    },

    /** Kryss av eller angre. En gjentakende oppgave får en ny kopi med neste frist når den krysses av. */
    veksle(g: Gjoremal, alle: Gjoremal[]) {
      const b = writeBatch(db);
      const ref = doc(samling, g.id);
      if (!g.fullfort) {
        const endring: Partial<Gjoremal> = { fullfort: new Date().toISOString(), fullfortAv: uid };
        if (g.gjentas && !g.nesteId) {
          const neste = doc(samling);
          b.set(neste, {
            tittel: g.tittel,
            beskrivelse: g.beskrivelse,
            frist: nesteFrist(g.frist, g.gjentas),
            fristKl: g.fristKl,
            gjentas: g.gjentas,
            fullfort: null,
            fullfortAv: null,
            opprettet: new Date().toISOString(),
            opprettetAv: uid,
            nesteId: null,
          });
          endring.nesteId = neste.id;
        }
        b.update(ref, endring);
      } else {
        const endring: Partial<Gjoremal> = { fullfort: null, fullfortAv: null };
        // Angrer du, fjernes kopien som ble laget, så lenge ingen har krysset av den.
        const neste = g.nesteId ? alle.find((x) => x.id === g.nesteId) : undefined;
        if (g.nesteId && (!neste || !neste.fullfort)) {
          if (neste) b.delete(doc(samling, neste.id));
          endring.nesteId = null;
        }
        b.update(ref, endring);
      }
      b.commit().catch(loggFeil);
    },

    slett(id: string) {
      const b = writeBatch(db);
      b.delete(doc(samling, id));
      b.commit().catch(loggFeil);
    },

    /** Sletter alle fullførte for godt. */
    fjernFullforte(alle: Gjoremal[]) {
      const fullforte = alle.filter((g) => g.fullfort);
      for (let i = 0; i < fullforte.length; i += 450) {
        const b = writeBatch(db);
        fullforte.slice(i, i + 450).forEach((g) => b.delete(doc(samling, g.id)));
        b.commit().catch(loggFeil);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Varsel før fristen. Gratisplanen har ingen server som kan sende på et tidspunkt,
// så hver voksens telefon planlegger varslene selv når lista endres.
// ---------------------------------------------------------------------------

const stottet = Platform.OS !== 'web';
const KANAL = 'gjoremal';
let sistPlanlagt = '';

async function planleggVarsler(liste: Gjoremal[]) {
  const na = Date.now();
  const kommende = liste
    .filter((g) => !g.fullfort)
    .map((g) => ({ g, tid: varselTidspunkt(g) }))
    .filter((x): x is { g: Gjoremal; tid: Date } => !!x.tid && x.tid.getTime() > na)
    .sort((a, b) => a.tid.getTime() - b.tid.getTime())
    .slice(0, 50); // Android tillater et begrenset antall planlagte varsler.

  const signatur = JSON.stringify(kommende.map((x) => [x.g.id, x.g.tittel, x.tid.getTime()]));
  if (signatur === sistPlanlagt) return;

  let tillatelse = await Notifications.getPermissionsAsync();
  if (tillatelse.status !== 'granted' && tillatelse.canAskAgain && kommende.length > 0) {
    tillatelse = await Notifications.requestPermissionsAsync();
  }
  if (tillatelse.status !== 'granted') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KANAL, { name: 'Frister for gjøremål', importance: AndroidImportance.HIGH });
  }

  const planlagte = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    planlagte
      .filter((p) => p.content.data?.type === 'gjoremal')
      .map((p) => Notifications.cancelScheduledNotificationAsync(p.identifier)),
  );
  for (const { g, tid } of kommende) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: g.tittel,
        body: `Frist ${fristTekst(g.frist!, g.fristKl).toLowerCase()}`,
        sound: 'default',
        data: { type: 'gjoremal', lenke: '/voksen/gjoremal' },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: tid, channelId: KANAL },
    });
  }
  sistPlanlagt = signatur;
}

/** Holder varslene på denne telefonen i takt med lista. Brukes i voksenvisningen. */
export function useFristvarsler(liste: Gjoremal[] | undefined) {
  useEffect(() => {
    if (!stottet || !liste) return;
    planleggVarsler(liste).catch((e) => console.warn('Kunne ikke planlegge varsler', e));
  }, [liste]);
}
