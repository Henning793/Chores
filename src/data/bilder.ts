import { SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Profilbilder lagres som små JPEG-er (256 × 256) rett i Firestore-dokumentet.
// Da trengs ikke Cloud Storage, som krever betalingsplan på nye Firebase-prosjekter.

/** Lar brukeren velge et bilde fra galleriet. Gir en data-URI, eller null hvis avbrutt. */
export async function velgBilde(): Promise<string | null> {
  const valg = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (valg.canceled || !valg.assets[0]) return null;

  const bilde = await ImageManipulator.manipulate(valg.assets[0].uri).resize({ width: 256, height: 256 }).renderAsync();
  const lagret = await bilde.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!lagret.base64) return null;
  return `data:image/jpeg;base64,${lagret.base64}`;
}
