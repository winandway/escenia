// Cambia una foto de un trabajo ya producido por otra (buscada de nuevo o una
// que el video ya tiene), en TODOS los sitios donde sale. Es el arreglo típico
// después de revisar los cuadros: «esta foto no sirve». Después se corre
// rearmar.ts para volver a armar el video con la misma voz.
// Uso (desde estacion/):
//   npx tsx src/cambiar-foto.ts 27 web-fb24bfc277836b5b.jpg "Romeo Santos concierto 2024"
//   npx tsx src/cambiar-foto.ts 27 web-da8b76f3d7c0b587.jpg --usar web-000c2b02f2d7daff.jpg
//   (añade --lugar si la foto nueva es de un sitio y no de una persona)
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { enfoquesDe } from "./enfoque";
import { buscarFoto } from "./fotos";
import type { PropsVideo } from "./remotion/props";
import { ilustrarPlanos } from "./ilustrado";

type FotoVideo = NonNullable<PropsVideo["escenas"][number]["foto"]>;

async function principal() {
  const numero = Number(process.argv[2]);
  const vieja = process.argv[3] ?? "";
  const resto = process.argv.slice(4);
  if (!Number.isInteger(numero) || !vieja || resto.length === 0)
    throw new Error(
      'Uso: npx tsx src/cambiar-foto.ts <trabajo> <foto-vieja.jpg> "<búsqueda nueva>" | --usar <otra.jpg> [--lugar]',
    );
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, `t${numero}`);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, `t${numero}`);
  const rutaProps = path.join(carpetaTrabajo, "props.json");
  const props = JSON.parse(await readFile(rutaProps, "utf8")) as PropsVideo;
  const todas = (): FotoVideo[] =>
    props.escenas.flatMap((e) => [
      ...(e.foto ? [e.foto] : []),
      ...e.fotos,
      ...e.planos.flatMap((p) => (p.foto ? [p.foto] : [])),
    ]);
  const aCambiar = todas().filter((f) => path.basename(f.ruta) === vieja);
  if (aCambiar.length === 0) throw new Error(`Ese trabajo no usa la foto ${vieja}.`);

  let nueva: FotoVideo;
  if (resto[0] === "--usar") {
    const otra = todas().find((f) => path.basename(f.ruta) === resto[1]);
    if (!otra) throw new Error(`Ese trabajo no tiene la foto ${resto[1]}.`);
    nueva = { ...otra };
  } else {
    const deLugar = resto.includes("--lugar");
    const busqueda = resto.filter((x) => x !== "--lugar").join(" ");
    const f = await buscarFoto([busqueda], carpetaPublica, { persona: !deLugar });
    if (!f) throw new Error(`No apareció ninguna foto para «${busqueda}».`);
    const enfoque = (await enfoquesDe([path.join(carpetaPublica, f.ruta)])).get(
      path.join(carpetaPublica, f.ruta),
    );
    nueva = { ruta: f.ruta, ancho: f.ancho, alto: f.alto, enfoque: enfoque ?? null };
    console.log(`  crédito: ${f.credito}`);
    // El crédito de la foto nueva queda anotado con los demás del trabajo.
    const rutaResultado = path.join(carpetaTrabajo, "resultado.json");
    try {
      const guardado = JSON.parse(await readFile(rutaResultado, "utf8")) as {
        resultado: { creditos: string[] };
      };
      if (!guardado.resultado.creditos.includes(f.credito)) {
        guardado.resultado.creditos.push(f.credito);
        await writeFile(rutaResultado, JSON.stringify(guardado, null, 1));
        await writeFile(path.join(carpetaTrabajo, "creditos.txt"), guardado.resultado.creditos.join("\n"));
      }
    } catch {
      console.warn("  (este trabajo no tiene resultado.json: el crédito no se anotó)");
    }
  }
  for (const f of aCambiar) Object.assign(f, nueva);
  // El fondo difuminado de una escena también puede ser esa foto.
  for (const e of props.escenas)
    if (e.fondoFoto && path.basename(e.fondoFoto) === vieja) e.fondoFoto = nueva.ruta;
  // Estilo ilustrado: la figura dibujada era de la foto vieja. Se dibuja la nueva y se reparten otra vez.
  if (props.estilo === "ilustrado") {
    const r = await ilustrarPlanos(
      props.escenas,
      carpetaPublica,
      async (detalle, costo) => console.log(`  ${detalle}: $${costo.toFixed(2)}`),
      () => {},
    );
    console.log(
      `  personas dibujadas: ${r.dibujadas}${r.fallidas ? ` · ${r.fallidas} quedaron con su foto` : ""}`,
    );
  }
  await writeFile(rutaProps, JSON.stringify(props, null, 2));
  console.log(`${vieja} → ${path.basename(nueva.ruta)} en ${aCambiar.length} sitio(s).`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
