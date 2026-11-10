import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

/** Midlertidig lenke til et profilbilde i den private bøtta. */
export function useBildeUrl(sti: string | null | undefined) {
  return useQuery({
    queryKey: ['bilde', sti],
    enabled: !!sti,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('profilbilder').createSignedUrl(sti!, 60 * 60 * 24 * 7);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/** Lar brukeren velge et bilde fra galleriet og laster det opp. Gir stien, eller null hvis avbrutt. */
export async function velgOgLastOppBilde(familieId: string): Promise<string | null> {
  const valg = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  });
  if (valg.canceled || !valg.assets[0]) return null;

  const fil = valg.assets[0];
  const data = await (await fetch(fil.uri)).arrayBuffer();
  const sti = `${familieId}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('profilbilder')
    .upload(sti, data, { contentType: fil.mimeType ?? 'image/jpeg' });
  if (error) throw error;
  return sti;
}
