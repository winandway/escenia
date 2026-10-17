// Richard pide un anuncio (Publicidad en Short): el texto, la voz del banco, las carpetas de imágenes
// del cliente y la persona que habla. Queda en la fila y la Estación lo toma sola.
import { contexto } from "@/lib/entorno";
import { carpetasDeImagenes } from "@/lib/imagenes";
import { puedeSubir } from "@/lib/permiso-subida";
import { crearPublicidad } from "@/lib/publicidades";
import { esquemaPublicidadNueva } from "@compartido/publicidad";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  const parseo = esquemaPublicidadNueva.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  const existentes = new Set((await carpetasDeImagenes(db)).map((c) => c.carpeta));
  const faltan = parseo.data.carpetas.filter((c) => !existentes.has(c));
  if (faltan.length)
    return Response.json(
      { error: `No hay imágenes en la carpeta «${faltan[0]}». Súbelas primero en Imágenes.` },
      { status: 400 },
    );
  const id = await crearPublicidad(db, parseo.data);
  return Response.json({ ok: true, id });
}
