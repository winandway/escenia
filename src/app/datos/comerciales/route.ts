// Richard pide un comercial: el texto del cliente, el idioma, la voz, las carpetas de
// imágenes y sus instrucciones. Queda en la fila y la Estación lo toma sola.
import { contexto } from "@/lib/entorno";
import { crearComercial } from "@/lib/comerciales";
import { carpetasDeImagenes } from "@/lib/imagenes";
import { puedeSubir } from "@/lib/permiso-subida";
import { esquemaComercialNuevo } from "@compartido/comerciales";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  const parseo = esquemaComercialNuevo.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  // Las carpetas tienen que existir y tener algo adentro: un comercial sin imágenes no es un comercial.
  const existentes = new Set((await carpetasDeImagenes(db)).map((c) => c.carpeta));
  const faltan = parseo.data.carpetas.filter((c) => !existentes.has(c));
  if (faltan.length)
    return Response.json(
      { error: `No hay imágenes en la carpeta «${faltan[0]}». Súbelas primero en Imágenes.` },
      { status: 400 },
    );
  const id = await crearComercial(db, parseo.data);
  return Response.json({ ok: true, id });
}
