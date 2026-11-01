// La persona sube una captura a su caso (C-AYUDA-2): una imagen por pedido, en crudo, con su nombre en
// «?nombre=». Queda guardada sin mensaje hasta que lo manda; devuelve su número, su nombre y su enlace firmado.
import { ipDelPedido } from "@/lib/app-sesion";
import { idDelCaso, pasaLimite } from "@/lib/ayuda";
import { enlaceDeAdjunto, guardarAdjunto, MAX_BYTES_ADJUNTO, type Almacen } from "@/lib/ayuda-adjuntos";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

const ERRORES = {
  vacio: "The image arrived empty. Try again.",
  grande: "Each image can be up to 10 MB.",
  tipo: "Only JPG, PNG, WEBP or HEIC images.",
  demasiados: "Send your message before adding more images.",
} as const;

export async function POST(req: Request, ctx: RouteContext<"/datos/ayuda/casos/[codigo]/adjuntos">) {
  const { env, db, bucket } = await contexto();
  if (!bucket)
    return Response.json({ error: "Storage is not available.", codigo: "almacen" }, { status: 503 });
  if (!(await pasaLimite(db, `ayuda-subir:${ipDelPedido(req)}`, 30, 600)))
    return Response.json(
      { error: "Too many requests. Try again later.", codigo: "intentos" },
      { status: 429 },
    );
  const casoId = await idDelCaso(db, (await ctx.params).codigo);
  if (!casoId)
    return Response.json({ error: "This case doesn't exist.", codigo: "no_existe" }, { status: 404 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BYTES_ADJUNTO)
    return Response.json({ error: ERRORES.grande, codigo: "grande" }, { status: 413 });
  const nombre = (new URL(req.url).searchParams.get("nombre") ?? "").slice(0, 120);
  const r = await guardarAdjunto(db, bucket as unknown as Almacen, casoId, nombre, await req.arrayBuffer());
  if (!r.ok) return Response.json({ error: ERRORES[r.codigo], codigo: r.codigo }, { status: r.estado });
  return Response.json(
    { id: r.id, nombre: r.nombre, tipo: r.tipo, url: await enlaceDeAdjunto(env.ESTACION_SECRETO, r.id) },
    { status: 201 },
  );
}
