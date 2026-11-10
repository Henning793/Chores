// React Native-bygget av @firebase/auth har getReactNativePersistence, men pakkens typer
// peker på web-bygget. Metro velger riktig bygg ved kjøring.
import type { Persistence } from '@firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
