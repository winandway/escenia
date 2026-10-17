// El banco de voces del panel: hace una muestra corta de cada voz configurada y la sube, para que en
// los formularios se pueda oír antes de elegirla. Cuesta unos 2 centavos por voz.
// Uso (desde estacion/): npx tsx src/muestras-voces.ts [richard|femenina|venezolana …]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { VOCES, type Voz } from "@compartido/guion";
import { config } from "./config";
import { panel } from "./panel";
import { generarVoz } from "./voz";

/** Lo que dice cada voz en su muestra: corto, natural y de lo que suele leer. */
export const TEXTO_MUESTRA: Record<Voz, string> = {
  richard:
    "Hola, soy la voz de tus videos. Así sueno contando una historia: claro, cercano y sin prisa, para que nadie se pierda.",
  femenina:
    "Hola, esta es la voz femenina del banco. Así sueno leyendo el texto de un comercial, con un tono claro y profesional.",
  venezolana:
    "¡Hola! ¿Se te va la luz en casa? Mira esto: así sueno vendiendo un producto, alegre y natural. ¡Pídelo hoy mismo!",
};

async function principal() {
  const pedidas = process.argv.slice(2).filter((v): v is Voz => (VOCES as readonly string[]).includes(v));
  const voces = pedidas.length ? pedidas : [...VOCES];
  const carpeta = path.join(config.CARPETA_SALIDA, "muestras-voces");
  await mkdir(carpeta, { recursive: true });
  let total = 0;
  for (const voz of voces) {
    try {
      const r = await generarVoz(
        [{ texto: TEXTO_MUESTRA[voz] }],
        path.join(carpeta, voz),
        async () => {},
        voz,
        "es",
      );
      await panel.subirMuestraVoz(voz, r.rutaMp3);
      total += r.costoUsd;
      console.log(`${voz}: ${(r.duracionMs / 1000).toFixed(1)} s · $${r.costoUsd.toFixed(4)} · subida`);
    } catch (e) {
      console.error(`${voz}: no salió (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  console.log(`Total: $${total.toFixed(4)}`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
