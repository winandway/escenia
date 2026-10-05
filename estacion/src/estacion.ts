// La Estación: pregunta al panel cada 30 s si hay trabajo, produce el video
// en la Mac y reporta. Los MP4 se quedan aquí; al panel suben solo la voz y
// los subtítulos.
import { config } from "./config";
import { buscarProduccionSinEntregar, guardarProduccion, huellaDeGuion, marcarEntregada } from "./entrega";
import { atenderGrabacion, materialDeGrabacion } from "./grabaciones";
import { panel } from "./panel";
import { armarPortadas, guardarTextos, textosDeLaPublicacion } from "./portadas";
import { catalogoMusica } from "./musica";
import { producir } from "./produccion";
import { sincronizarSonidos } from "./sonidos";
import { marcaDeCanal } from "@compartido/marcas";
import { buscarTematica, estiloDeTematica } from "@compartido/tematicas";

const ESPERA_MS = 30_000;
const ESPERA_ERROR_MS = 60_000;

async function unaVuelta(): Promise<boolean> {
  const trabajo = await panel.siguiente();
  if (!trabajo) return false;
  console.log(`[${hora()}] Trabajo #${trabajo.id}: «${trabajo.contenido.titulo}»`);
  let ultimo = { paso: "tomado", progreso: 0 };
  const avisar = (paso: string, progreso: number) => {
    console.log(`  ${progreso}% ${paso}`);
    ultimo = { paso, progreso };
    return panel
      .avance(trabajo.id, paso, progreso)
      .catch((e) => console.warn("  (no se pudo avisar al panel)", e));
  };
  // Señal de vida durante los pasos largos (empaquetar, render): repite el último
  // avance cada 45 s para que el panel no dé la Estación por apagada.
  const latido = setInterval(() => {
    void panel.avance(trabajo.id, ultimo.paso, ultimo.progreso).catch(() => {});
  }, 45_000);
  try {
    // Si este mismo guion ya se armó completo y lo único que falló fue subirlo,
    // se retoma la entrega: no se produce ni se gasta otra vez (C-ENTREGA-1).
    const huella = huellaDeGuion(trabajo.contenido);
    const previa = await buscarProduccionSinEntregar(huella);
    let producidoEn = trabajo.id;
    let r: Awaited<ReturnType<typeof producir>>;
    if (previa) {
      producidoEn = previa.numero;
      r = previa.resultado;
      console.log(`  Se retoma la entrega del video ya armado en el trabajo #${previa.numero}.`);
      await avisar("retomando el video que ya estaba armado", 97);
    } else {
      // La música y los efectos que Richard subió desde el panel (C-SONIDOS-1). Si el
      // panel no responde, se produce con lo que ya hay en la Mac, y se dice.
      await sincronizarSonidos()
        .then((x) => {
          if (x.bajados.length) console.log(`  Sonidos nuevos del panel: ${x.bajados.join(", ")}`);
          if (x.apartados.length) console.log(`  Sonidos quitados en el panel: ${x.apartados.join(", ")}`);
        })
        .catch((e) =>
          console.warn(
            `  (no se pudo traer la biblioteca de sonidos: ${e instanceof Error ? e.message : e}; se usa lo que hay en la Mac)`,
          ),
        );
      // Formato Presentador: el guion salió de una grabación de Richard. Se prepara su voz y su
      // imagen, y la producción las usa en vez de la voz generada.
      const material = trabajo.grabacion
        ? await materialDeGrabacion(trabajo.grabacion, trabajo.contenido, `t${trabajo.id}`, (texto) =>
            avisar(texto, 3),
          )
        : null;
      r = await producir(
        `t${trabajo.id}`,
        trabajo.contenido,
        trabajo.producto,
        avisar,
        trabajo.plantilla,
        (servicio, detalle, costo) => panel.gasto(trabajo.id, servicio, detalle, costo).catch(() => {}),
        trabajo.canal,
        // El canal de la temática decide la marca del video (logo, colores, cierre).
        marcaDeCanal(buscarTematica(trabajo.tematica_id)?.canal),
        // Y la temática, su diseño: clásico, con las personas dibujadas o con diagramas de neón.
        // En una grabación, el diseño de atrás es el que Richard eligió al subirla.
        trabajo.grabacion?.formato ?? estiloDeTematica(trabajo.tematica_id),
        material,
      );
      await guardarProduccion(trabajo.id, huella, r);
      if (r.costoVozUsd > 0)
        await panel.gasto(trabajo.id, "elevenlabs", `voz guion ${trabajo.guion_id}`, r.costoVozUsd);
    }
    await avisar("subiendo el video al panel", 98);
    let ultimoPct = 0;
    await panel.subirVideo(
      trabajo.guion_id,
      "16x9",
      r.rutaMp4,
      { duracion_seg: r.duracionSeg, voz_de_prueba: r.vozDePrueba },
      (pct) => {
        if (pct >= ultimoPct + 25) {
          ultimoPct = pct;
          void avisar(`subiendo el video al panel ${pct}%`, 98);
        }
      },
    );
    for (const [k, s] of r.shorts.entries()) {
      await avisar(`subiendo el short ${k + 1} de ${r.shorts.length} al panel`, 98);
      await panel.subirVideo(trabajo.guion_id, "9x16", s.ruta, {
        duracion_seg: s.duracionSeg,
        voz_de_prueba: r.vozDePrueba,
      });
    }
    if (r.rutaMiniatura)
      await panel
        .subirArchivo(trabajo.guion_id, "miniatura", "png", r.rutaMiniatura)
        .catch((e) =>
          console.warn(`  (no se pudo subir la miniatura: ${e instanceof Error ? e.message : e})`),
        );
    await avisar("subiendo voz y subtítulos al panel", 99);
    await panel.subirArchivo(trabajo.guion_id, "voz", "mp3", r.rutaVoz, { voz_de_prueba: r.vozDePrueba });
    await panel.subirArchivo(trabajo.guion_id, "subtitulos", "json", r.rutaSubtitulos, {
      creditos: r.creditos,
    });
    await panel.hecho(trabajo.id, [
      {
        formato: "16x9",
        ruta_local: r.rutaMp4,
        bytes: r.bytes,
        duracion_seg: r.duracionSeg,
        voz_de_prueba: r.vozDePrueba,
      },
      ...r.shorts.map((s) => ({
        formato: "9x16" as const,
        ruta_local: s.ruta,
        bytes: s.bytes,
        duracion_seg: s.duracionSeg,
        voz_de_prueba: r.vozDePrueba,
      })),
    ]);
    await marcarEntregada(producidoEn);
    if (r.shorts.length)
      console.log(
        `  Shorts: ${r.shorts.map((s) => `«${s.titulo}» (${Math.round(s.duracionSeg)} s)`).join(" · ")}`,
      );
    // Textos de YouTube (título, títulos de los shorts, descripción, palabras clave): los escribe el panel.
    // El trabajo ya está «hecho» en el panel: no se avisa avance (daría 409), solo se anota.
    console.log("  100% escribiendo los títulos y palabras clave para YouTube");
    await panel
      .publicacion(
        trabajo.guion_id,
        r.shorts.map((s) => ({
          indice: s.indice,
          titulo_original: s.titulo,
          escena_inicio: s.escenaInicio,
          escena_fin: s.escenaFin,
          duracion_seg: s.duracionSeg,
        })),
      )
      .then(async (respuesta) => {
        console.log("  Textos de YouTube: listos en el panel.");
        // Con los textos llegan los de las miniaturas: se arma la del largo y la de cada Short.
        const textos = textosDeLaPublicacion(respuesta);
        if (!textos) return console.warn("  (el panel no mandó los textos de las miniaturas)");
        await guardarTextos(producidoEn, textos);
        const hechas = await armarPortadas(producidoEn, trabajo.guion_id, textos);
        console.log(`  Miniaturas: ${hechas.length} armadas y subidas al panel.`);
      })
      .catch((e) =>
        console.warn(
          `  (no se pudieron escribir los textos de YouTube ni armar las miniaturas: ${e instanceof Error ? e.message : e})`,
        ),
      );
    console.log(`[${hora()}] Listo: ${r.rutaMp4} (${(r.bytes / 1_048_576).toFixed(0)} MB)`);
    clearInterval(latido);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    clearInterval(latido);
    console.error(`[${hora()}] Falló el trabajo #${trabajo.id}:`, msj);
    await panel.error(trabajo.id, msj).catch(() => {});
  }
  return true;
}

async function principal() {
  console.log(`Estación ${config.VERSION} → ${config.PANEL_URL}`);
  console.log(
    `Voz: ${config.ELEVENLABS_API_KEY ? `ElevenLabs (mi voz: ${config.ELEVENLABS_VOICE_ID ? "sí" : "FALTA"} · femenina: ${config.ELEVENLABS_VOICE_ID_FEMENINA ? "sí" : "FALTA"})` : "de prueba (sistema)"} · Clips: ${config.PEXELS_API_KEY ? "Pexels" : "fondos de color"} · Imágenes IA: ${config.FAL_KEY ? "fal.ai" : "apagadas"}`,
  );
  console.log(
    `Fotos reales de internet: ${config.SERPER_API_KEY ? "sí (Google Imágenes vía Serper)" : "NO (falta SERPER_API_KEY; solo Wikimedia)"}`,
  );
  const pistas = await catalogoMusica();
  console.log(
    pistas.length
      ? `Música de fondo: ${pistas.length} pista(s) (${pistas.map((p) => p.archivo).join(", ")})`
      : "Música de fondo: NINGUNA (deja las pistas en music-cortinas-libre-de-copy; ver docs/MUSICA.md)",
  );
  console.log("Lista. Esperando trabajos.");
  for (;;) {
    let espera = ESPERA_MS;
    try {
      // Primero los videos ya aprobados; si no hay, las grabaciones que Richard subió.
      const hubo = (await unaVuelta()) || (await atenderGrabacion());
      if (hubo) espera = 1000;
    } catch (e) {
      console.error(`[${hora()}] No se pudo hablar con el panel:`, e instanceof Error ? e.message : e);
      espera = ESPERA_ERROR_MS;
    }
    await new Promise((r) => setTimeout(r, espera));
  }
}

const hora = () => new Date().toLocaleTimeString("es-US", { hour12: false });

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
