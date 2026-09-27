// Elige la pista de música de fondo del catálogo local según el estilo que
// pide el guion (`musica`, en inglés). Las pistas se nombran con sus palabras
// clave (ver docs/MUSICA.md): «salsa-1950s-cuban-brass-congas-upbeat.mp3».
// Gana la que comparte más palabras; sin coincidencias, la pista «neutral»;
// sin catálogo, no hay música (y la Estación lo dice).
const SINONIMOS: Record<string, string> = {
  "50s": "1950s",
  fifties: "1950s",
  "60s": "1960s",
  sixties: "1960s",
  "70s": "1970s",
  seventies: "1970s",
  "80s": "1980s",
  eighties: "1980s",
  "90s": "1990s",
  nineties: "1990s",
  trumpet: "brass",
  trumpets: "brass",
  horns: "brass",
  trombone: "brass",
  trombones: "brass",
  cuba: "cuban",
  havana: "cuban",
  latino: "latin",
  latina: "latin",
  cinematic: "orchestral",
  orchestra: "orchestral",
  strings: "strings",
  violin: "strings",
  violins: "strings",
  cello: "strings",
  calm: "soft",
  gentle: "soft",
  quiet: "soft",
  mellow: "soft",
  happy: "upbeat",
  cheerful: "upbeat",
  festive: "upbeat",
  joyful: "upbeat",
  lively: "upbeat",
  energetic: "upbeat",
  sad: "melancholic",
  melancholy: "melancholic",
  nostalgic: "melancholic",
  sorrowful: "melancholic",
  dramatic: "tense",
  suspense: "tense",
  suspenseful: "tense",
  mystery: "tense",
  mysterious: "tense",
  dark: "tense",
  tech: "electronic",
  technology: "electronic",
  synth: "electronic",
  synths: "electronic",
  futuristic: "electronic",
  digital: "electronic",
  guitars: "guitar",
  pianos: "piano",
  drum: "drums",
  percussion: "drums",
  conga: "congas",
  bongo: "bongos",
  epic: "triumphant",
  heroic: "triumphant",
};

const RUIDO = new Set([
  "and",
  "with",
  "the",
  "a",
  "an",
  "of",
  "in",
  "for",
  "to",
  "music",
  "instrumental",
  "background",
  "track",
  "song",
  "style",
  "no",
  "vocals",
  "de",
  "con",
  "y",
  "el",
  "la",
  "musica",
  "fondo",
]);

/** Palabras clave normalizadas (sin acentos, con sinónimos unificados, sin relleno). */
export function palabrasClave(texto: string): string[] {
  const vistas = new Set<string>();
  for (const cruda of texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)) {
    if (!cruda) continue;
    const w = SINONIMOS[cruda] ?? cruda;
    if (!RUIDO.has(w)) vistas.add(w);
  }
  return [...vistas];
}

export type PistaElegida = { archivo: string; puntos: number };

const ES_AUDIO = /\.(mp3|m4a|wav|aac|ogg)$/i;

export function elegirPista(estilo: string, archivos: string[]): PistaElegida | null {
  const pistas = archivos.filter((a) => ES_AUDIO.test(a)).sort();
  if (pistas.length === 0) return null;
  const claves = palabrasClave(estilo);
  let mejor: PistaElegida | null = null;
  for (const archivo of pistas) {
    const propias = new Set(palabrasClave(archivo.replace(ES_AUDIO, "")));
    const puntos = claves.filter((c) => propias.has(c)).length;
    if (!mejor || puntos > mejor.puntos) mejor = { archivo, puntos };
  }
  if (mejor && mejor.puntos > 0) return mejor;
  const neutra = pistas.find((a) => /neutral/i.test(a));
  return neutra ? { archivo: neutra, puntos: 0 } : null;
}
