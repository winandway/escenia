// Cambia la música de fondo de un trabajo ya producido: baja lo último de la
// biblioteca de Sonidos del panel, elige la pista por el estilo que se le diga
// (igual que en una producción normal) y la deja lista para volver a armar el
// video con la misma voz (rearmar.ts).
// Uso (desde estacion/):
//   npx tsx src/cambiar-musica.ts 27 "Dominican bachata, romantic guitar, bongos and güira"
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { prepararMusica } from "./musica";
import type { PropsVideo } from "./remotion/props";
import { sincronizarSonidos } from "./sonidos";

async function principal() {
  const numero = Number(process.argv[2]);
  const estilo = process.argv.slice(3).join(" ").trim();
  if (!Number.isInteger(numero) || !estilo)
    throw new Error('Uso: npx tsx src/cambiar-musica.ts <trabajo> "<estilo de la música, en inglés>"');
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, `t${numero}`);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, `t${numero}`);

  const cambios = await sincronizarSonidos();
  if (cambios.bajados.length) console.log(`  bajado del panel: ${cambios.bajados.join(", ")}`);
  const musica = await prepararMusica(estilo, carpetaPublica);
  if (!musica) throw new Error(`No hay ninguna pista que encaje con «${estilo}».`);

  const rutaProps = path.join(carpetaTrabajo, "props.json");
  const props = JSON.parse(await readFile(rutaProps, "utf8")) as PropsVideo;
  props.musica = { ruta: musica.ruta, duracionSeg: musica.duracionSeg };
  await writeFile(rutaProps, JSON.stringify(props, null, 2));

  // El crédito de la música vieja se cambia por el de la nueva.
  const rutaResultado = path.join(carpetaTrabajo, "resultado.json");
  const guardado = JSON.parse(await readFile(rutaResultado, "utf8")) as { resultado: { creditos: string[] } };
  guardado.resultado.creditos = [
    musica.credito,
    ...guardado.resultado.creditos.filter((c) => !c.startsWith("Música de fondo:")),
  ];
  await writeFile(rutaResultado, JSON.stringify(guardado, null, 1));
  await writeFile(path.join(carpetaTrabajo, "creditos.txt"), guardado.resultado.creditos.join("\n"));
  console.log(
    `Música del trabajo ${numero}: ${musica.archivo} (${Math.round(musica.duracionSeg)} s). Falta volver a armar.`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
