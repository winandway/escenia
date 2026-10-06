// Pide un comercial desde la Mac (lo mismo que el formulario del panel). Uso (desde estacion/):
//   npx tsx src/pedir-comercial.ts --nombre "Andreea · logos" --texto guion.txt --idioma en
//       --voz femenina --carpetas "Logos Andreea,Capturas Andreea" [--instrucciones "…"]
import { readFile } from "node:fs/promises";
import { esquemaComercialNuevo } from "@compartido/comerciales";
import { panel } from "./panel";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const archivoTexto = opcion("--texto");
  if (!archivoTexto) throw new Error("Falta --texto <archivo con el texto que lee la voz>");
  const datos = esquemaComercialNuevo.parse({
    nombre: opcion("--nombre") ?? "",
    narracion: await readFile(archivoTexto, "utf8"),
    idioma: opcion("--idioma") ?? "es",
    voz: opcion("--voz") ?? "femenina",
    instrucciones: opcion("--instrucciones") ?? "",
    carpetas: (opcion("--carpetas") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  });
  const r = await panel.pedirComercial(datos);
  console.log(`Comercial #${r.id} pedido. La Estación lo toma sola.`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
