// La conexión con el panel de Escenia. El token de la sesión vive en el llavero del teléfono
// (expo-secure-store), nunca la contraseña. Un 401 cierra la sesión y manda a entrar otra vez.
import * as SecureStore from "expo-secure-store";

export const PANEL = process.env.EXPO_PUBLIC_PANEL_URL ?? "https://escenia.sitios.dev";
const LLAVE_TOKEN = "escenia.token";
const LLAVE_CUENTA = "escenia.cuenta";

export type Cuenta = "richard" | "demo";
export class ErrorDeApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo: string = "",
  ) {
    super(message);
  }
}

let token: string | null = null;
let alSalir: (() => void) | null = null;

export async function cargarSesion(): Promise<{ token: string; cuenta: Cuenta } | null> {
  const [t, c] = await Promise.all([
    SecureStore.getItemAsync(LLAVE_TOKEN),
    SecureStore.getItemAsync(LLAVE_CUENTA),
  ]);
  token = t;
  return t && (c === "richard" || c === "demo") ? { token: t, cuenta: c } : null;
}

export async function guardarSesion(t: string, cuenta: Cuenta) {
  token = t;
  await SecureStore.setItemAsync(LLAVE_TOKEN, t);
  await SecureStore.setItemAsync(LLAVE_CUENTA, cuenta);
}

export async function borrarSesion() {
  token = null;
  await SecureStore.deleteItemAsync(LLAVE_TOKEN);
  await SecureStore.deleteItemAsync(LLAVE_CUENTA);
}

export const cabeceras = (): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});
export const alCerrarSesion = (f: () => void) => {
  alSalir = f;
};

export async function pedir<T>(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown } = {},
): Promise<T> {
  let r: Response;
  try {
    r = await fetch(PANEL + ruta, {
      method: opciones.metodo ?? "GET",
      headers: {
        ...cabeceras(),
        ...(opciones.cuerpo === undefined ? {} : { "content-type": "application/json" }),
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  } catch {
    throw new ErrorDeApi("", 0, "red");
  }
  const j = (await r.json().catch(() => ({}))) as { error?: string; codigo?: string } & T;
  if (r.status === 401 && token && ruta !== "/datos/app/entrar") {
    await borrarSesion();
    alSalir?.();
  }
  if (!r.ok) throw new ErrorDeApi(j.error ?? "", r.status, j.codigo ?? "");
  return j;
}
