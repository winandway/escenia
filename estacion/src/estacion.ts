// La Estación: pregunta al panel cada 30 s si hay trabajo, produce el video
// en la Mac y reporta. Los MP4 se quedan aquí; al panel suben solo la voz y
// los subtítulos.
import { config } from "./config";
import { panel } from "./panel";
import { producir } from "./produccion";

const ESPERA_MS = 30_000;
const ESPERA_ERROR_MS = 60_000;

async function unaVuelta(): Promise<boolean> {
  const trabajo = await panel.siguiente();
  if (!trabajo) return false;
  console.log(`[${hora()}] Trabajo #${trabajo.id}: «${trabajo.contenido.titulo}»`);
  const avisar = (paso: string, progreso: number) => {
    console.log(`  ${progreso}% ${paso}`);
    return panel
      .avance(trabajo.id, paso, progreso)
      .catch((e) => console.warn("  (no se pudo avisar al panel)", e));
  };
  try {
    const r = await producir(
      `t${trabajo.id}`,
      trabajo.contenido,
      trabajo.producto,
      avisar,
      trabajo.plantilla,
      (servicio, detalle, costo) => panel.gasto(trabajo.id, servicio, detalle, costo).catch(() => {}),
    );
    if (r.costoVozUsd > 0)
      await panel.gasto(trabajo.id, "elevenlabs", `voz guion ${trabajo.guion_id}`, r.costoVozUsd);
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
    ]);
    console.log(`[${hora()}] Listo: ${r.rutaMp4} (${(r.bytes / 1_048_576).toFixed(0)} MB)`);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`[${hora()}] Falló el trabajo #${trabajo.id}:`, msj);
    await panel.error(trabajo.id, msj).catch(() => {});
  }
  return true;
}

async function principal() {
  console.log(`Estación ${config.VERSION} → ${config.PANEL_URL}`);
  console.log(
    `Voz: ${config.ELEVENLABS_API_KEY ? "ElevenLabs" : "de prueba (sistema)"} · Clips: ${config.PEXELS_API_KEY ? "Pexels" : "fondos de color"} · Imágenes IA: ${config.FAL_KEY ? "fal.ai" : "apagadas"}`,
  );
  console.log("Lista. Esperando trabajos.");
  for (;;) {
    let espera = ESPERA_MS;
    try {
      const hubo = await unaVuelta();
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
