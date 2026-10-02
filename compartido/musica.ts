// Elige la pista de música de fondo del catálogo local según el estilo que
// pide el guion (`musica`, en inglés). Las pistas se nombran con sus palabras
// clave (ver docs/MUSICA.md): «salsa-1950s-cuban-brass-congas-upbeat.mp3».
// Gana la que comparte más palabras, siempre que coincida en algo más que el
// ánimo (C-MUSICA-2); sin coincidencias, la pista «neutral»; sin catálogo, no
// hay música (y la Estación lo dice).
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
  // El bombo que pide Richard («tum, pum, pum»): se diga como se diga, es «kick» y «beat».
  bombo: "kick",
  kicks: "kick",
  "808": "bass",
  bajo: "bass",
  bassline: "bass",
  beats: "beat",
  trap: "beat",
  phonk: "beat",
  hiphop: "beat",
  boom: "beat",
  pulsing: "pulse",
  requinto: "requinto",
  guira: "guira",
  dominican: "bachata",
  // Los nombres que Richard escribe en español al subir una pista.
  guitarra: "guitar",
  guitarras: "guitar",
  romantica: "romantic",
  romantico: "romantic",
  alegre: "upbeat",
  movida: "upbeat",
  triste: "melancholic",
  lenta: "soft",
  suave: "soft",
  trompetas: "brass",
  tambores: "drums",
  acordeon: "accordion",
  electronica: "electronic",
  reggaeton: "reggaeton",
  regueton: "reggaeton",
  neutra: "neutral",
  ritmo: "beat",
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

// Palabras de ÁNIMO: sirven para desempatar entre pistas del mismo género, pero
// solas no alcanzan. Un video de tecnología que pide algo «upbeat» no puede
// terminar con una salsa debajo solo porque la salsa también es «upbeat».
const ANIMOS = new Set([
  "upbeat",
  "soft",
  "melancholic",
  "tense",
  "triumphant",
  "romantic",
  "warm",
  "playful",
  "driving",
  "curious",
  "minimal",
  "reflective",
  "hopeful",
  "serious",
  "modern",
  "latin",
]);

export type PistaElegida = { archivo: string; puntos: number };

const ES_AUDIO = /\.(mp3|m4a|wav|aac|ogg)$/i;

/**
 * `preferidas`: las pistas de Richard (las que subió o dejó en la Mac). A igual
 * parecido ganan sobre las propias del motor, que son solo la reserva.
 */
export function elegirPista(
  estilo: string,
  archivos: string[],
  preferidas: string[] = [],
): PistaElegida | null {
  const suyas = new Set(preferidas);
  const pistas = archivos.filter((a) => ES_AUDIO.test(a)).sort();
  if (pistas.length === 0) return null;
  const claves = palabrasClave(estilo);
  let mejor: PistaElegida | null = null;
  for (const archivo of pistas) {
    const fichas = palabrasClave(archivo.replace(ES_AUDIO, ""));
    const propias = new Set(fichas);
    const comunes = claves.filter((c) => propias.has(c));
    // Tiene que coincidir en algo de fondo (género, época, instrumento, origen), no solo en el ánimo.
    const parecido = comunes.some((c) => !ANIMOS.has(c)) ? comunes.length : 0;
    // El género es la primera palabra del nombre. Una pista del género pedido gana a
    // cualquiera que solo comparta un instrumento; y entre las del género, gana la de Richard.
    const delGenero = parecido > 0 && fichas[0] !== undefined && claves.includes(fichas[0]);
    const suya = suyas.has(archivo);
    const puntos =
      parecido === 0 ? 0 : parecido + (delGenero ? 10 : 0) + (delGenero && suya ? 5 : 0) + (suya ? 0.5 : 0);
    if (!mejor || puntos > mejor.puntos) mejor = { archivo, puntos };
  }
  if (mejor && mejor.puntos > 0) return mejor;
  const neutras = pistas.filter((a) => /neutral/i.test(a));
  const neutra = neutras.find((a) => suyas.has(a)) ?? neutras[0];
  return neutra ? { archivo: neutra, puntos: 0 } : null;
}
