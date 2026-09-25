// Contraseña del panel: se guarda SOLO su huella (PBKDF2-SHA256), nunca el texto.
// Formato: pbkdf2$<iteraciones>$<sal base64url>$<huella base64url>
// Se genera con `npm run clave`.

const ITERACIONES = 100_000; // tope de PBKDF2 en el runtime de Workers
const enc = new TextEncoder();

export async function huellaDeClave(
  clave: string,
  sal?: Uint8Array,
  iteraciones = ITERACIONES,
): Promise<string> {
  const s = sal ?? crypto.getRandomValues(new Uint8Array(16));
  const bits = await derivar(clave, s, iteraciones);
  return `pbkdf2$${iteraciones}$${b64url(s)}$${b64url(bits)}`;
}

export async function claveCorrecta(clave: string, guardada: string): Promise<boolean> {
  const partes = guardada.split("$");
  if (partes.length !== 4 || partes[0] !== "pbkdf2") return false;
  const iteraciones = Number(partes[1]);
  if (!Number.isInteger(iteraciones) || iteraciones < 10_000 || iteraciones > 1_000_000) return false;
  const sal = desdeB64url(partes[2] ?? "");
  const esperada = desdeB64url(partes[3] ?? "");
  const obtenida = await derivar(clave, sal, iteraciones);
  return igualesSinFiltrarTiempo(obtenida, esperada);
}

async function derivar(clave: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const llave = await crypto.subtle.importKey("raw", enc.encode(clave), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal as BufferSource, iterations: iteraciones },
    llave,
    256,
  );
  return new Uint8Array(bits);
}

export function igualesSinFiltrarTiempo(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return dif === 0;
}

export async function sha256Hex(texto: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(texto));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function desdeB64url(texto: string): Uint8Array {
  const base = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base + "=".repeat((4 - (base.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
