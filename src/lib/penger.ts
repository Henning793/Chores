/** Formaterer øre som kroner, f.eks. 2500 -> "25 kr", 2550 -> "25,50 kr". */
export function kr(ore: number | null | undefined): string {
  const v = (ore ?? 0) / 100;
  const tekst = Number.isInteger(v)
    ? v.toLocaleString('nb-NO')
    : v.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${tekst} kr`;
}

/** Leser kronebeløp skrevet av en bruker ("25", "25,50", "25.5") og gir øre, eller null. */
export function tilOre(tekst: string): number | null {
  const renset = tekst.replace(/\s|kr/gi, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(renset)) return null;
  return Math.round(parseFloat(renset) * 100);
}
