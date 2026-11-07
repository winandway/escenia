// Abre una conversación del Podcast IA (docs/PODCAST.md, C-PODCAST-1): revisa los dos topes (minutos del
// día y gasto), pide a ElevenLabs la URL firmada y devuelve lo que el estudio pasa al agente (el prompt
// hecho SOLO con la ficha, el primer mensaje y la voz). La clave de ElevenLabs nunca sale del servidor.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import {
  FALTA_CONECTAR,
  TopeDelPodcast,
  conexionDelPodcast,
  fichaPorId,
  iniciarConversacion,
} from "@/lib/podcast";
import { PresupuestoAgotado } from "@/lib/presupuesto";
import { soloRichard } from "@/lib/solo-richard";
import { fichaLista, idDeVozInvitado } from "@compartido/podcast";

export const dynamic = "force-dynamic";

const esquema = z.object({ fichaId: z.coerce.number().int().positive("Elige la ficha del invitado.") });
const sinCache = { "cache-control": "no-store" };

export async function POST(req: Request) {
  const { env, db } = await contexto();
  const rechazo = await soloRichard(req, db);
  if (rechazo) return rechazo;
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Elige la ficha." }, { status: 400 });
  const ficha = await fichaPorId(db, parseo.data.fichaId);
  if (!ficha) return Response.json({ error: "Esa ficha no existe o está archivada." }, { status: 404 });
  const falta = fichaLista(ficha);
  if (falta) return Response.json({ error: falta }, { status: 409 });
  const conexion = await conexionDelPodcast(db, env);
  if (!conexion) return Response.json({ error: FALTA_CONECTAR, falta: "conexion" }, { status: 503 });
  try {
    idDeVozInvitado(ficha.voz, conexion.voces);
  } catch (e) {
    return Response.json(
      { error: `${FALTA_CONECTAR} ${e instanceof Error ? e.message : ""}`.trim(), falta: "voz" },
      { status: 503 },
    );
  }
  try {
    return Response.json(await iniciarConversacion(db, conexion, ficha), { headers: sinCache });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo abrir la conversación.";
    const estado = e instanceof TopeDelPodcast ? 429 : e instanceof PresupuestoAgotado ? 402 : 502;
    if (estado === 502) console.error("[podcast]", mensaje);
    return Response.json({ error: mensaje }, { status: estado, headers: sinCache });
  }
}
