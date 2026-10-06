// La Estación pregunta qué imágenes hay (en unas carpetas) para bajarlas a la Mac.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { imagenesActivas } from "@/lib/imagenes";

export const dynamic = "force-dynamic";

const esquema = z.object({ carpetas: z.array(z.string().trim().min(1)).max(20).default([]) });

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const parseo = esquema.safeParse(await req.json().catch(() => ({})));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const todas = await imagenesActivas(db);
  const pedidas = new Set(parseo.data.carpetas);
  return Response.json({
    imagenes: todas
      .filter((i) => pedidas.size === 0 || pedidas.has(i.carpeta))
      .map((i) => ({ id: i.id, carpeta: i.carpeta, nombre: i.nombre, tipo: i.tipo, bytes: i.bytes })),
  });
}
