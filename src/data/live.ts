import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDocs, onSnapshot, type DocumentData, type Query, type QueryDocumentSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

/** Gjør et Firestore-dokument om til et objekt med id. */
export function medId<T>(d: QueryDocumentSnapshot<DocumentData>): T {
  return { id: d.id, ...d.data() } as T;
}

/**
 * Leser en Firestore-spørring og holder den oppdatert med en lytter.
 * Resultatet ligger i TanStack Query-hurtiglageret, som lagres på enheten, så appen
 * viser siste kjente data også uten nett.
 */
export function useLive<T>(nokkel: readonly unknown[], sporring: Query<DocumentData> | null) {
  const qc = useQueryClient();
  const nokkelTekst = JSON.stringify(nokkel);

  const resultat = useQuery({
    queryKey: nokkel,
    enabled: !!sporring,
    staleTime: Infinity,
    queryFn: async () => (await getDocs(sporring!)).docs.map((d) => medId<T>(d)),
  });

  useEffect(() => {
    if (!sporring) return;
    return onSnapshot(
      sporring,
      (s) => qc.setQueryData(nokkel, s.docs.map((d) => medId<T>(d))),
      (feil) => console.warn('Lytter feilet', nokkelTekst, feil),
    );
    // Spørringen er bestemt av nøkkelen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nokkelTekst]);

  return resultat;
}
