// Elige el id de voz de ElevenLabs según quién narra el guion. Si el guion
// pide una voz que no está configurada, falla con un mensaje claro ANTES de
// gastar: nunca cae en silencio a la otra voz (candado C-VOZ-1).
import type { Voz } from "./guion";
import type { ModeloVoz } from "./modelos";

export type IdsDeVoz = { richard?: string; femenina?: string; venezolana?: string };

export const VARIABLE_DE_VOZ: Record<Voz, string> = {
  richard: "ELEVENLABS_VOICE_ID",
  femenina: "ELEVENLABS_VOICE_ID_FEMENINA",
  venezolana: "ELEVENLABS_VOICE_ID_VENEZOLANA",
};

/**
 * El modelo con que se lee cada voz. La venezolana se diseñó con Voice Design v3 (17 oct 2026) y se
 * lee con Eleven v3: con el modelo rápido pierde el acento. Las demás, con el de siempre.
 */
const MODELO_PROPIO: Partial<Record<Voz, ModeloVoz>> = { venezolana: "eleven_v3" };

export function modeloDeVoz(narrador: Voz, deSiempre: string): string {
  return MODELO_PROPIO[narrador] ?? deSiempre;
}

export function elegirIdDeVoz(narrador: Voz, ids: IdsDeVoz): string {
  const id = (ids[narrador] ?? "").trim();
  if (id) return id;
  throw new Error(
    `El guion pide la voz «${narrador}» pero falta ${VARIABLE_DE_VOZ[narrador]} en estacion/.env. Ponla y reinicia la Estación, o cambia la voz del guion en el panel.`,
  );
}
