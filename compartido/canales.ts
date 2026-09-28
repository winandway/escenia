// Los dos canales de YouTube y las claves de `ajustes` donde viven su nombre y
// su @ (el cierre de los shorts los muestra). Se editan en Ajustes del panel.
import type { Canal } from "./tematicas";

export type DatosCanal = { nombre: string; usuario: string };

export const CANALES: Record<Canal, { clave: string; etiqueta: string; porDefecto: DatosCanal }> = {
  "canal-ia": { clave: "canal_ia", etiqueta: "Canal de IA", porDefecto: { nombre: "", usuario: "" } },
  "caprichoso-tv": {
    clave: "canal_caprichoso",
    etiqueta: "Caprichoso TV",
    porDefecto: { nombre: "Caprichoso TV", usuario: "@caprichosotv" },
  },
};

export function clavesDeCanal(canal: Canal): { nombre: string; usuario: string } {
  const c = CANALES[canal].clave;
  return { nombre: `${c}_nombre`, usuario: `${c}_usuario` };
}
