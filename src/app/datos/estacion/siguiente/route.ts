// La Estación pregunta: ¿hay trabajo? Si hay, lo toma (uno a la vez) y recibe
// el guion completo. También deja su latido para que el panel sepa que vive.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { devolverTrabajosPerdidos, guionValido, tocarLatido } from "@/lib/estacion-estado";
import { guionPorId, productoPorId, type FilaTrabajo, ajuste } from "@/lib/consultas";
import { carpetasDe, comercialDeGuion } from "@/lib/comerciales";
import { grabacionDeGuion } from "@/lib/grabaciones";
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

  // Un trabajo «tomado» hace más de 2 horas, o tomado y sin arrancar en 3 minutos, vuelve a la cola.
  await devolverTrabajosPerdidos(db);

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
  const valido = guionValido(guion.contenido);
  if (!valido.guion) {
    // Un guion que no pasa el esquema no puede producirse: el trabajo queda en error con el motivo
    // (antes la ruta tumbaba con un 500 y el trabajo se quedaba «tomado» para siempre).
    await db.ejecutar(
      "UPDATE trabajos SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ?",
      [valido.error, pendiente.id],
    );
    return Response.json({ trabajo: null });
  }
  const contenido = valido.guion;
  const producto = guion.producto_id ? await productoPorId(db, guion.producto_id) : null;
  const tematica = buscarTematica(guion.tematica_id);
  const canalId = tematica?.canal ?? "canal-ia";
  const claves = clavesDeCanal(canalId);
  const canal = {
    nombre: await ajuste(db, claves.nombre, CANALES[canalId].porDefecto.nombre),
    usuario: await ajuste(db, claves.usuario, CANALES[canalId].porDefecto.usuario),
  };

  const grabacion = await grabacionDeGuion(db, guion.id);
  const comercial = await comercialDeGuion(db, guion.id);

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
      // Formato Presentador: este guion salió de una grabación de Richard (va él en cámara).
      grabacion: grabacion
        ? { id: grabacion.id, formato: grabacion.formato, archivo: grabacion.archivo, bytes: grabacion.bytes }
        : null,
      // Comercial de un cliente: sin marca de canal ni Shorts, con sus imágenes y en su idioma.
      comercial: comercial
        ? {
            id: comercial.id,
            idioma: comercial.idioma,
            carpetas: carpetasDe(comercial),
            formato: comercial.formato,
          }
        : null,
    },
  });
}
