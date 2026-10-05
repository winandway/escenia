// Arma UNA portada de impacto a mano, eligiendo la foto y cada palabra (las de
// todo el video salen solas con portadas.ts). Recorta a la persona de su foto,
// la monta sobre un fondo de color con una cifra enorme y un remate, y la sube
// al panel como la miniatura de esa pieza.
// Uso (desde estacion/):
//   npx tsx src/portada.ts 27 --foto web-b0f0de3fdf0554ad.jpg --etiqueta "PRINCE ROYCE" \
//     --cifra 15 --linea NOMINACIONES --remate "*CERO* PREMIOS" --objeto web-3ca740db57aa9151.jpg \
//     --tachado --mostrar 0.62 --guion 8
//   npx tsx src/portada.ts 27 --pieza short-2 --foto web-ca52a876643389cd.jpg --etiqueta "ROMEO SANTOS" …
// --pieza: «largo» (horizontal; es lo que sale si no se dice) o «short-N» (vertical).
// En el remate, lo que va entre asteriscos sale en amarillo. --acercar 1.2 agranda a la persona.
// --mostrar 0.62 enseña solo la parte de arriba del objeto (deja fuera la base del trofeo).
// La foto y el objeto son archivos que el trabajo ya tiene (cache/public/t<n>/fotos/).
// Sin --guion no se sube: queda en out/t<n>/portada-<pieza>.png para mirarla.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { encuadre, MEDIDAS_PORTADA } from "@compartido/portada";
import { carpetasDeTrabajo, recortar, renderizarPortada } from "./portadas";
import type { PropsPortada } from "./remotion/props";
import { empaquetar } from "./render";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const numero = Number(process.argv[2]);
  const foto = opcion("--foto");
  if (!Number.isInteger(numero) || !foto)
    throw new Error(
      "Uso: npx tsx src/portada.ts <trabajo> --foto <archivo.jpg> --cifra … --linea … --remate … [--pieza short-2]",
    );
  const clave = opcion("--pieza") ?? "largo";
  const indice = Number(/^short-(\d+)$/.exec(clave)?.[1] ?? 0);
  if (clave !== "largo" && !indice) throw new Error("--pieza es «largo» o «short-N».");
  const formato = indice ? "vertical" : "horizontal";
  const carpetas = carpetasDeTrabajo(numero);
  await mkdir(path.join(carpetas.publica, "portada"), { recursive: true });

  const recorte = await recortar(
    path.join(carpetas.publica, "fotos", foto),
    path.join(carpetas.publica, "portada", `sujeto-${clave}.png`),
  );
  // Con la cara a la vista, la persona se coloca sola; si no se ve ninguna, va centrada en su lado.
  const cara = recorte.caras[0] ?? { x: 0.35, y: 0.08, ancho: 0.3, alto: 0.2 };
  const sitio = encuadre(formato, recorte, cara, Number(opcion("--acercar")) || 1);
  const archivoObjeto = opcion("--objeto");
  const objeto = archivoObjeto
    ? await recortar(
        path.join(carpetas.publica, "fotos", archivoObjeto),
        path.join(carpetas.publica, "portada", "objeto.png"),
      )
    : null;

  const props: PropsPortada = {
    formato,
    sujeto: { ruta: `portada/sujeto-${clave}.png`, ...sitio },
    fondoFoto: null,
    objeto: objeto
      ? {
          ruta: "portada/objeto.png",
          ancho: objeto.ancho,
          alto: objeto.alto,
          tachado: process.argv.includes("--tachado"),
          mostrar: Number(opcion("--mostrar")) || 1,
        }
      : null,
    etiqueta: opcion("--etiqueta") ?? "",
    cifra: opcion("--cifra") ?? "",
    linea: opcion("--linea") ?? "",
    remate: opcion("--remate") ?? "",
    chips: (opcion("--chips") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 3),
    fondo: [opcion("--color") ?? "#d00000", opcion("--color-oscuro") ?? "#14000a"],
    acento: opcion("--acento") ?? "#ffd60a",
  };
  const serveUrl = await empaquetar(carpetas.publica);
  const salida = path.join(carpetas.trabajo, `portada-${clave}.png`);
  const guion = Number(opcion("--guion"));
  const subir = Number.isInteger(guion) && guion > 0;
  await renderizarPortada(
    serveUrl,
    props,
    salida,
    subir ? { guion, pieza: indice ? "short" : "largo", indice } : null,
  );
  const medidas = MEDIDAS_PORTADA[formato];
  console.log(`Portada (${medidas.ancho}×${medidas.alto}): ${salida}`);
  if (subir) console.log(`Subida al panel como la miniatura de «${clave}» del guion ${guion}.`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
