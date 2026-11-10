import { useColorScheme } from 'react-native';

const lys = {
  bg: '#F3F6FB',
  flate: '#FFFFFF',
  tekst: '#18243D',
  dempet: '#5B6880',
  linje: '#DCE3EF',
  merke: '#2F5BEA',
  merkeMyk: '#E3EAFF',
  mynt: '#FFC43D',
  myntTekst: '#6B4A00',
  ok: '#1E9E6A',
  okMyk: '#DDF5EA',
  nei: '#D9534F',
  neiMyk: '#FBE3E2',
  vent: '#B7791F',
  ventMyk: '#FFF1D6',
  paMerke: '#FFFFFF',
  /** Bakgrunn og tekst for «Barna»-rommet (gult). Gjøremål bruker merke/merkeMyk (blått). */
  barnRom: '#FFF1C9',
  barnRomTekst: '#6B4A00',
};

const mork: typeof lys = {
  bg: '#0E1422',
  flate: '#172036',
  tekst: '#E8EDF8',
  dempet: '#9AA7C0',
  linje: '#2A3652',
  merke: '#7C9BFF',
  merkeMyk: '#22305A',
  mynt: '#FFCF5C',
  myntTekst: '#3D2A00',
  ok: '#4CC994',
  okMyk: '#173A2D',
  nei: '#F07B77',
  neiMyk: '#432224',
  vent: '#F0B65A',
  ventMyk: '#3B2E14',
  paMerke: '#0E1422',
  barnRom: '#3A3016',
  barnRomTekst: '#FFCF5C',
};

export type Farger = typeof lys;

export function useFarger(): Farger {
  return useColorScheme() === 'dark' ? mork : lys;
}

export const avstand = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
export const radius = { s: 10, m: 14, l: 20 } as const;

/** Farger barn kan få på profilen sin. */
export const profilFarger = ['#F28C38', '#8B5CF6', '#2F5BEA', '#1E9E6A', '#E0457B', '#0EA5B7'];
