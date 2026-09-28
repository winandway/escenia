// La Estación pregunta: ¿hay trabajo? Si hay, lo toma (uno a la vez) y recibe
// el guion completo. También deja su latido para que el panel sepa que vive.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { guionPorId, productoPorId, type FilaTrabajo, ajuste } from "@/lib/consultas";
import { esquemaGuion } from "@compartido/guion";
import { CANALES, clavesDeCanal } from "@compartido/canales";
import { buscarTematica } from "@compartido/tematicas";

export const dynamic = "force-dynamic";

const esquemaCuerpo = z.object({ version: z.string().max(40).default("") });

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const cuerpo = esquemaCuerpo.safeParse(await req.json().catch(() => ({})));
  if (!cuerpo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });

  await tocarLatido(db, cuerpo.data.version);

  // Un trabajo «tomado» hace más de 2 horas se considera perdido y vuelve a la cola.
  await db.ejecutar(
    `UPDATE trabajos SET estado = 'pendiente', paso = 'reintento tras corte', tomado_en = NULL
     WHERE estado = 'tomado' AND tomado_en < datetime('now', '-2 hours')`,
  );

  const pendiente = await db.uno<FilaTrabajo>(
    "SELECT * FROM trabajos WHERE estado = 'pendiente' ORDER BY id ASC LIMIT 1",
  );
  if (!pendiente) return Response.json({ trabajo: null });

  const tomado = await db.ejecutar(
    `UPDATE trabajos SET estado = 'tomado', tomado_en = datetime('now'), intentos = intentos + 1, paso = 'tomado', progreso = 0, error = '', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'pendiente'`,
    [pendiente.id],
  );
  if (tomado.cambios === 0) return Response.json({ trabajo: null });

  const guion = await guionPorId(db, pendiente.guion_id);
  if (!guion || guion.estado !== "aprobado") {
    await db.ejecutar(
      "UPDATE trabajos SET estado = 'cancelado', error = 'El guion ya no está aprobado.' WHERE id = ?",
      [pendiente.id],
    );
    return Response.json({ trabajo: null });
  }
  const contenido = esquemaGuion.parse(JSON.parse(guion.contenido));
  const producto = guion.producto_id ? await productoPorId(db, guion.producto_id) : null;
  const tematica = buscarTematica(guion.tematica_id);
  const canalId = tematica?.canal ?? "canal-ia";
  const claves = clavesDeCanal(canalId);
  const canal = {
    nombre: await ajuste(db, claves.nombre, CANALES[canalId].porDefecto.nombre),
    usuario: await ajuste(db, claves.usuario, CANALES[canalId].porDefecto.usuario),
  };

  return Response.json({
    trabajo: {
      id: pendiente.id,
      guion_id: guion.id,
      tipo: pendiente.tipo,
      tematica_id: guion.tematica_id,
      plantilla: tematica?.plantilla ?? "TechExplainer",
      contenido,
      producto: producto ? { nombre: producto.nombre, url: producto.url } : null,
      canal,
    },
  });
}
