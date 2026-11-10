// Ikoner for oppgaver. Vi bruker emoji: de er gratis, finnes på alle telefoner og er
// lette å kjenne igjen for barn som ikke kan lese ennå. Unngå sammensatte emoji (ZWJ),
// de vises ikke likt på alle enheter.

export const IKONGRUPPER: { navn: string; ikoner: string[] }[] = [
  { navn: 'Rydde og vaske', ikoner: ['🧹', '🧽', '🧼', '🪣', '🧺', '🫧', '🗑️', '♻️', '🪟', '🚿', '🛁', '🚽', '🧻', '🪥'] },
  { navn: 'Kjøkken og mat', ikoner: ['🍽️', '🍴', '🥄', '🥣', '🍳', '🥪', '🥗', '🍎', '🥕', '🥛', '🍞', '🧁', '🛒', '🧊'] },
  { navn: 'Rommet og klær', ikoner: ['🛏️', '👕', '👖', '🧦', '👟', '🧥', '🧤', '👗', '🧸', '🧩', '🎒', '🪑', '💡', '🧷'] },
  { navn: 'Dyr og planter', ikoner: ['🐕', '🐈', '🐟', '🐇', '🐦', '🐹', '🦴', '🪴', '🌻', '🌱', '💧', '🌳', '🐴', '🐔'] },
  { navn: 'Ute', ikoner: ['🚗', '🚲', '❄️', '⛄', '🍂', '🍁', '🌷', '🏡', '📦', '📬', '📰', '🪵', '🛝', '☔'] },
  { navn: 'Skole og meg selv', ikoner: ['📚', '✏️', '🎨', '🎹', '🎸', '⚽', '🏊', '🦷', '😴', '⏰', '🤝', '👶', '❤️', '⭐'] },
];

export const STANDARD_IKON = '⭐';
