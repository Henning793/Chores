import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';

// PIN-en beskytter voksenprofilen mot barna på en delt enhet. Den lagres som saltet SHA-256
// i den voksnes dokument, som bare voksne i familien kan lese. Uten Cloud Functions (gratisplanen)
// sjekkes den på enheten; derfor fungerer den også uten nett.

export async function pinHash(uid: string, salt: string, pin: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, `${salt}:${uid}:${pin}`);
}

export async function lagPin(uid: string, pin: string): Promise<{ pinSalt: string; pinHash: string }> {
  const salt = randomUUID();
  return { pinSalt: salt, pinHash: await pinHash(uid, salt, pin) };
}

export const gyldigPin = (pin: string) => /^\d{4}$/.test(pin);
