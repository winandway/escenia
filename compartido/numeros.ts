// Números en letras para la voz. La voz clonada (modelo Flash) no convierte
// cifras a palabras en español y las lee mal («1925»), así que se convierten
// antes de mandar el texto: años, cantidades, decimales, porcentajes y dólares.
const UNIDADES = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];
const DECENAS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];
const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function menorDeMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c] ?? "");
  if (r > 0 && r < 30) partes.push(UNIDADES[r] ?? "");
  else if (r >= 30) {
    const d = Math.floor(r / 10);
    const u = r % 10;
    partes.push(u ? `${DECENAS[d]} y ${UNIDADES[u]}` : (DECENAS[d] ?? ""));
  }
  return partes.join(" ");
}

/** «uno» → «un» / «veintiuno» → «veintiún» cuando va delante de un sustantivo o de «mil». */
function apocopar(s: string): string {
  return s.replace(/veintiuno$/, "veintiún").replace(/(^| )uno$/, "$1un");
}

/** Entero en letras (hasta los miles de millones). `apocope`: «veintiún años» en vez de «veintiuno años». */
export function enteroEnLetras(n: number, apocope = false): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) return String(n);
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1e6);
  const miles = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${enteroEnLetras(millones, true)} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocopar(menorDeMil(miles))} mil`);
  if (resto) partes.push(menorDeMil(resto));
  const s = partes.join(" ");
  return apocope ? apocopar(s) : s;
}

// Palabras que siguen a un número sin ser el sustantivo que cuenta («1 de cada 3»).
const SIN_APOCOPE = new Set(["de", "y", "o", "a", "en", "por", "con", "u", "e"]);

function cifraEnLetras(cifra: string, siguiente: string): string {
  const palabraSiguiente = /^\s+(\p{L}+)/u.exec(siguiente)?.[1]?.toLowerCase();
  const apocope = Boolean(palabraSiguiente) && !SIN_APOCOPE.has(palabraSiguiente ?? "");
  // Miles con separador: 250.000 · 1,200,000
  const grupos = cifra.split(/[.,]/);
  const esMiles =
    grupos.length > 1 && /^\d{1,3}$/.test(grupos[0] ?? "") && grupos.slice(1).every((g) => /^\d{3}$/.test(g));
  if (esMiles) return enteroEnLetras(Number(grupos.join("")), apocope);
  // Decimal: 3,5 · 2.75
  const decimal = /^(\d+)[.,](\d{1,2})$/.exec(cifra);
  if (decimal) return `${enteroEnLetras(Number(decimal[1]))} punto ${enteroEnLetras(Number(decimal[2]))}`;
  if (/^\d+$/.test(cifra)) return enteroEnLetras(Number(cifra), apocope);
  return cifra;
}

/** Convierte las cifras sueltas de un texto a palabras en español. No toca lo pegado a letras (v2.5, MP3). */
// Una cifra «suelta» no va pegada a letras ni a otra cifra con punto (v2.5 y MP3 se quedan igual).
const SUELTA = "(?<![\\p{L}\\d])(?<!\\d[.,])";

export function numerosEnLetras(texto: string): string {
  let t = texto;
  // Porcentajes y dólares primero, porque llevan su propia palabra.
  t = t.replace(
    new RegExp(`${SUELTA}(\\d+(?:[.,]\\d+)?)\\s*%`, "gu"),
    (_, c: string) => `${cifraEnLetras(c, "")} por ciento`,
  );
  t = t.replace(/(?:US)?\$\s?(\d[\d.,]*)/gu, (todo: string, c: string) => {
    const [cifra, cola] = partirCola(c);
    if (!cifra) return todo;
    const letras = cifraEnLetras(cifra, "");
    return `${letras === "uno" ? "un dólar" : `${letras} dólares`}${cola}`;
  });
  // Horas: 3:30 → tres y treinta.
  t = t.replace(new RegExp(`${SUELTA}(\\d{1,2}):(\\d{2})(?![\\p{L}\\d])`, "gu"), (_, h: string, m: string) =>
    Number(m) === 0
      ? enteroEnLetras(Number(h))
      : `${enteroEnLetras(Number(h))} y ${enteroEnLetras(Number(m))}`,
  );
  // Rangos de años: 1925-2003 → mil novecientos veinticinco a dos mil tres.
  t = t.replace(new RegExp(`${SUELTA}(\\d{3,4})\\s*[-–]\\s*(\\d{3,4})(?![\\p{L}\\d])`, "gu"), "$1 a $2");
  // Cifras sueltas.
  t = t.replace(
    new RegExp(`${SUELTA}\\d[\\d.,]*(?![\\p{L}])`, "gu"),
    (c: string, pos: number, todo: string) => {
      const [cifra, cola] = partirCola(c);
      return `${cifraEnLetras(cifra, todo.slice(pos + c.length))}${cola}`;
    },
  );
  return t;
}

/** Separa la puntuación final que la cifra arrastró («1925,» → «1925» y «,»). */
function partirCola(c: string): [string, string] {
  const fin = c.replace(/[.,]+$/, "").length;
  return [c.slice(0, fin), c.slice(fin)];
}
