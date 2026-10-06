// La Estación pregunta: ¿hay un comercial por armar? Si hay, lo toma (uno a la vez).
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { carpetasDe, tomarSiguienteComercial } from "@/lib/comerciales";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  await tocarLatido(db);
  const c = await tomarSiguienteComercial(db);
  if (!c) return Response.json({ comercial: null });
  return Response.json({
    comercial: {
      id: c.id,
      nombre: c.nombre,
      narracion: c.narracion,
      idioma: c.idioma,
      voz: c.voz,
      instrucciones: c.instrucciones,
      carpetas: carpetasDe(c),
      formato: c.formato,
    },
  });
}
