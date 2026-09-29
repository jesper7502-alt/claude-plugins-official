import { Image, type ColorValue } from 'react-native';

// Flikikonerna ritas som SVG i stället för med ett ikontypsnitt. Typsnitt laddas inte alltid
// på telefoner, och då visas bara en tom ruta.
const PATHS = {
  // Checkruta med bock
  tasks: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/>',
  // Kalender med dagar
  planering:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' +
    '<path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" stroke-width="2.6"/>',
  // Klocka med pil bakåt: historik
  genomfort: '<path d="M4.2 12.5A8 8 0 1 0 6.6 6.2"/><path d="M3.8 4.2v4.2H8"/><path d="M12 8v4.3l3 1.8"/>',
};

export type TabIconName = keyof typeof PATHS;

const cache = new Map<string, string>();

function uri(name: TabIconName, color: string): string {
  const key = `${name}|${color}`;
  let u = cache.get(key);
  if (!u) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
      `stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
    u = `data:image/svg+xml;base64,${btoa(svg)}`;
    cache.set(key, u);
  }
  return u;
}

export const tabIcon = (name: TabIconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Image source={{ uri: uri(name, String(color)) }} style={{ width: size, height: size }} accessibilityElementsHidden />;
  };
