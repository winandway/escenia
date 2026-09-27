// Elige el id de voz de ElevenLabs según quién narra el guion. Si el guion
// pide una voz que no está configurada, falla con un mensaje claro ANTES de
// gastar: nunca cae en silencio a la otra voz (candado C-VOZ-1).
import type { Voz } from "./guion";

export type IdsDeVoz = { richard?: string; femenina?: string };

export const VARIABLE_DE_VOZ: Record<Voz, string> = {
  richard: "ELEVENLABS_VOICE_ID",
  femenina: "ELEVENLABS_VOICE_ID_FEMENINA",
};

export function elegirIdDeVoz(narrador: Voz, ids: IdsDeVoz): string {
  const id = (ids[narrador] ?? "").trim();
  if (id) return id;
  throw new Error(
    `El guion pide la voz «${narrador}» pero falta ${VARIABLE_DE_VOZ[narrador]} en estacion/.env. Ponla y reinicia la Estación, o cambia la voz del guion en el panel.`,
  );
}
