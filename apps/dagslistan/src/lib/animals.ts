// Tecknade djuransikten som SVG. Ritade i en 100×100-ruta, centrerade så att de ryms i en rund avatar.
// Sidan är webb-only, så bilderna visas som data-URI i <Image> utan extra paket.

const INK = '#1F2A44';
const PINK = '#EE97A8';

const eyes = (y = 52, dx = 11, r = 4) =>
  `<circle cx="${50 - dx}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${50 + dx}" cy="${y}" r="${r}" fill="${INK}"/>`;
const smile = (y: number) =>
  `<path d="M50 ${y} Q46 ${y + 5} 42 ${y + 3} M50 ${y} Q54 ${y + 5} 58 ${y + 3}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const cheeks = (y = 62) => `<circle cx="32" cy="${y}" r="4.5" fill="${PINK}" opacity=".55"/><circle cx="68" cy="${y}" r="4.5" fill="${PINK}" opacity=".55"/>`;

const DRAWINGS: Record<string, string> = {
  cat: `
    <path d="M22 44 L27 14 L45 32 Z" fill="#F4C49B"/><path d="M78 44 L73 14 L55 32 Z" fill="#F4C49B"/>
    <path d="M27 36 L29 21 L38 31 Z" fill="${PINK}"/><path d="M73 36 L71 21 L62 31 Z" fill="${PINK}"/>
    <circle cx="50" cy="56" r="30" fill="#F4C49B"/>
    ${eyes()}<path d="M46 61 L54 61 L50 66 Z" fill="${PINK}"/>${smile(66)}
    <path d="M24 60 L36 62 M24 67 L36 66 M76 60 L64 62 M76 67 L64 66" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`,
  dog: `
    <circle cx="50" cy="56" r="29" fill="#EBCDA8"/>
    <ellipse cx="23" cy="50" rx="10" ry="20" fill="#B98A5E" transform="rotate(18 23 50)"/>
    <ellipse cx="77" cy="50" rx="10" ry="20" fill="#B98A5E" transform="rotate(-18 77 50)"/>
    <ellipse cx="62" cy="44" rx="8" ry="7" fill="#D9B284"/>
    <ellipse cx="50" cy="67" rx="14" ry="10" fill="#F8EBDA"/>
    ${eyes(52)}<ellipse cx="50" cy="62" rx="5.5" ry="4" fill="${INK}"/>${smile(66)}`,
  fox: `
    <path d="M21 46 L25 14 L44 32 Z" fill="#EE9657"/><path d="M79 46 L75 14 L56 32 Z" fill="#EE9657"/>
    <path d="M26 36 L28 21 L37 30 Z" fill="${INK}" opacity=".75"/><path d="M74 36 L72 21 L63 30 Z" fill="${INK}" opacity=".75"/>
    <circle cx="50" cy="56" r="30" fill="#EE9657"/>
    <path d="M22 58 Q38 60 50 82 Q62 60 78 58 Q74 84 50 86 Q26 84 22 58 Z" fill="#FFF3E8"/>
    ${eyes(52)}<circle cx="50" cy="66" r="4" fill="${INK}"/>`,
  bear: `
    <circle cx="27" cy="32" r="11" fill="#C49A74"/><circle cx="73" cy="32" r="11" fill="#C49A74"/>
    <circle cx="27" cy="32" r="5.5" fill="#E7C9A8"/><circle cx="73" cy="32" r="5.5" fill="#E7C9A8"/>
    <circle cx="50" cy="56" r="30" fill="#C49A74"/>
    <ellipse cx="50" cy="66" rx="14" ry="11" fill="#EBD3B8"/>
    ${eyes(50)}<ellipse cx="50" cy="61" rx="5.5" ry="4" fill="${INK}"/>${smile(65)}`,
  panda: `
    <circle cx="27" cy="31" r="11" fill="${INK}"/><circle cx="73" cy="31" r="11" fill="${INK}"/>
    <circle cx="50" cy="56" r="30" fill="#FFFFFF"/>
    <ellipse cx="38" cy="52" rx="7.5" ry="9.5" fill="${INK}" transform="rotate(25 38 52)"/>
    <ellipse cx="62" cy="52" rx="7.5" ry="9.5" fill="${INK}" transform="rotate(-25 62 52)"/>
    <circle cx="39" cy="51" r="2.6" fill="#FFFFFF"/><circle cx="61" cy="51" r="2.6" fill="#FFFFFF"/>
    <ellipse cx="50" cy="64" rx="4.5" ry="3.2" fill="${INK}"/>${smile(67)}`,
  rabbit: `
    <ellipse cx="39" cy="22" rx="8" ry="20" fill="#F4F1F8"/><ellipse cx="61" cy="22" rx="8" ry="20" fill="#F4F1F8"/>
    <ellipse cx="39" cy="23" rx="3.8" ry="14" fill="${PINK}"/><ellipse cx="61" cy="23" rx="3.8" ry="14" fill="${PINK}"/>
    <circle cx="50" cy="60" r="27" fill="#F4F1F8"/>
    ${eyes(56, 10)}${cheeks(66)}<ellipse cx="50" cy="64" rx="4" ry="3" fill="${PINK}"/>${smile(67)}`,
  mouse: `
    <circle cx="26" cy="36" r="15" fill="#C3C9D8"/><circle cx="74" cy="36" r="15" fill="#C3C9D8"/>
    <circle cx="26" cy="36" r="8.5" fill="${PINK}"/><circle cx="74" cy="36" r="8.5" fill="${PINK}"/>
    <circle cx="50" cy="60" r="26" fill="#C3C9D8"/>
    ${eyes(57, 10)}<circle cx="50" cy="67" r="4" fill="${PINK}"/>
    <path d="M28 66 L40 67 M28 72 L40 70 M72 66 L60 67 M72 72 L60 70" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`,
  owl: `
    <path d="M24 38 L26 18 L40 30 Z" fill="#A98467"/><path d="M76 38 L74 18 L60 30 Z" fill="#A98467"/>
    <circle cx="50" cy="56" r="30" fill="#A98467"/>
    <ellipse cx="50" cy="72" rx="16" ry="12" fill="#D8C3AE"/>
    <circle cx="38" cy="51" r="11" fill="#FFFFFF"/><circle cx="62" cy="51" r="11" fill="#FFFFFF"/>
    <circle cx="38" cy="51" r="5" fill="${INK}"/><circle cx="62" cy="51" r="5" fill="${INK}"/>
    <path d="M45 60 L55 60 L50 68 Z" fill="#F0A14E"/>`,
  frog: `
    <circle cx="33" cy="38" r="12" fill="#8DCB8A"/><circle cx="67" cy="38" r="12" fill="#8DCB8A"/>
    <ellipse cx="50" cy="60" rx="32" ry="24" fill="#8DCB8A"/>
    <circle cx="33" cy="37" r="7.5" fill="#FFFFFF"/><circle cx="67" cy="37" r="7.5" fill="#FFFFFF"/>
    <circle cx="33" cy="38" r="3.8" fill="${INK}"/><circle cx="67" cy="38" r="3.8" fill="${INK}"/>
    ${cheeks(64)}<path d="M36 66 Q50 76 64 66" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  pig: `
    <path d="M24 40 L26 18 L42 30 Z" fill="#E88BA0"/><path d="M76 40 L74 18 L58 30 Z" fill="#E88BA0"/>
    <circle cx="50" cy="56" r="30" fill="#F7B8C5"/>
    ${eyes(50)}<ellipse cx="50" cy="64" rx="12" ry="9" fill="#EE97A8"/>
    <ellipse cx="46" cy="64" rx="2.2" ry="3" fill="${INK}"/><ellipse cx="54" cy="64" rx="2.2" ry="3" fill="${INK}"/>`,
  lion: `
    <circle cx="50" cy="54" r="38" fill="#DB9447"/>
    <circle cx="30" cy="32" r="7" fill="#F5CE8C"/><circle cx="70" cy="32" r="7" fill="#F5CE8C"/>
    <circle cx="50" cy="56" r="26" fill="#F5CE8C"/>
    <ellipse cx="50" cy="66" rx="12" ry="9" fill="#FCEBCB"/>
    ${eyes(52, 10)}<path d="M45 61 L55 61 L50 66 Z" fill="#8A5A3B"/>${smile(66)}`,
  koala: `
    <circle cx="24" cy="40" r="16" fill="#B3BAC8"/><circle cx="76" cy="40" r="16" fill="#B3BAC8"/>
    <circle cx="24" cy="40" r="9" fill="#E6E9F0"/><circle cx="76" cy="40" r="9" fill="#E6E9F0"/>
    <circle cx="50" cy="57" r="28" fill="#B3BAC8"/>
    ${eyes(52, 12, 3.8)}<ellipse cx="50" cy="62" rx="7.5" ry="10" fill="#3A4256"/>`,
};

export const ANIMALS: { key: string; name: string }[] = [
  { key: 'cat', name: 'Katt' },
  { key: 'dog', name: 'Hund' },
  { key: 'fox', name: 'Räv' },
  { key: 'bear', name: 'Björn' },
  { key: 'panda', name: 'Panda' },
  { key: 'rabbit', name: 'Kanin' },
  { key: 'mouse', name: 'Mus' },
  { key: 'owl', name: 'Uggla' },
  { key: 'frog', name: 'Groda' },
  { key: 'pig', name: 'Gris' },
  { key: 'lion', name: 'Lejon' },
  { key: 'koala', name: 'Koala' },
];

export const isAnimal = (key: string | undefined): key is string => !!key && key in DRAWINGS;

const cache = new Map<string, string>();

/** Djurets bild som data-URI, klar att använda som `source.uri` i <Image>. */
export function animalUri(key: string): string {
  let uri = cache.get(key);
  if (!uri) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${DRAWINGS[key]}</svg>`;
    // base64 i stället för URL-kodning: React Native Web lägger bilden i CSS url(), där parenteser i SVG:n annars bryter adressen.
    uri = `data:image/svg+xml;base64,${btoa(svg)}`;
    cache.set(key, uri);
  }
  return uri;
}
