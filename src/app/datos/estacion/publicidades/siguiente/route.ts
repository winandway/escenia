// La Estación pregunta: ¿hay un anuncio por armar? Si hay, lo toma (uno a la vez).
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { carpetasDePublicidad, tomarSiguientePublicidad } from "@/lib/publicidades";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  await tocarLatido(db);
  const p = await tomarSiguientePublicidad(db);
  if (!p) return Response.json({ publicidad: null });
  return Response.json({
    publicidad: {
      id: p.id,
      nombre: p.nombre,
      narracion: p.narracion,
      idioma: p.idioma,
      voz: p.voz,
      carpetas: carpetasDePublicidad(p),
      avatar: p.avatar,
      instrucciones: p.instrucciones,
    },
  });
}
