// Avisos al iPhone (C-APP-IOS-4): con permiso, la app guarda en el panel la dirección de avisos de este
// teléfono; la Mac la usa para avisar «Tu video está listo». Al tocar el aviso se abre ese proyecto.
// Sin permiso o sin red, la app funciona igual.
import * as Notifications from "expo-notifications";
import { pedir } from "./api";
import type { Idioma } from "./logica";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let tokenDeEsteTelefono: string | null = null;

export async function registrarAvisos(idioma: Idioma): Promise<void> {
  try {
    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return;
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== "string" || !data) return;
    tokenDeEsteTelefono = data;
    await pedir("/datos/app/avisos", { metodo: "POST", cuerpo: { token: data, idioma } });
  } catch {
    // Sin avisos la app funciona igual.
  }
}

export async function quitarAvisos(): Promise<void> {
  if (!tokenDeEsteTelefono) return;
  await pedir("/datos/app/avisos", { metodo: "DELETE", cuerpo: { token: tokenDeEsteTelefono } }).catch(
    () => undefined,
  );
  tokenDeEsteTelefono = null;
}

/** El proyecto que trae un aviso tocado (la Mac lo manda en «body»). */
export function proyectoDelAviso(r: Notifications.NotificationResponse | null): number | null {
  const id = (r?.notification.request.content.data as { encargoId?: unknown } | undefined)?.encargoId;
  return typeof id === "number" && id > 0 ? id : null;
}

/**
 * La dirección de avisos de este iPhone para un caso de ayuda (C-AYUDA-1): así la Mac le avisa cuando
 * soporte responde, también sin cuenta. Pide el permiso la primera vez; sin permiso, el caso sigue igual.
 */
export async function direccionParaAyuda(): Promise<string | undefined> {
  try {
    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return undefined;
    const { data } = await Notifications.getDevicePushTokenAsync();
    return typeof data === "string" && data ? data : undefined;
  } catch {
    return undefined;
  }
}

/** El caso de ayuda que trae un aviso tocado (la Mac lo manda en «body»). */
export function casoDelAviso(r: Notifications.NotificationResponse | null): string | null {
  const caso = (r?.notification.request.content.data as { caso?: unknown } | undefined)?.caso;
  return typeof caso === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(caso) ? caso : null;
}
