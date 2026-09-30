// La MARCA de un canal en el video: logo, colores, letra y lema. Un canal con
// marca se reconoce en cualquier cuadro (logo fijo, títulos con letra de código,
// cierre propio). Un canal sin marca sale con el aspecto neutro de siempre.
import type { Canal } from "./tematicas";

export const IDS_DE_MARCA = ["full-codigo"] as const;
export type IdMarca = (typeof IDS_DE_MARCA)[number];

export type Marca = {
  id: IdMarca;
  /** Carpeta del logo dentro de `estacion/recursos/marcas/`. */
  carpeta: string;
  lema: string;
  acento: string;
  secundario: string;
};

export const MARCAS: Record<IdMarca, Marca> = {
  "full-codigo": {
    id: "full-codigo",
    carpeta: "full-codigo",
    lema: "Tecnología, IA y desarrollo sin rodeos",
    // El verde y el morado del logo del canal.
    acento: "#10f08c",
    secundario: "#8b5cf6",
  },
};

const MARCA_DE_CANAL: Record<Canal, IdMarca | null> = {
  "canal-ia": "full-codigo",
  "caprichoso-tv": null,
};

/** La marca con la que sale un video de ese canal, o null si el canal no tiene. */
export function marcaDeCanal(canal: Canal | undefined): Marca | null {
  const id = canal ? MARCA_DE_CANAL[canal] : null;
  return id ? MARCAS[id] : null;
}
