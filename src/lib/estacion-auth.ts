// Autenticación de la Estación (la Mac) contra el panel: un secreto compartido
// en la cabecera Authorization. Comparación sin filtrar tiempo.
import { igualesSinFiltrarTiempo } from "./clave";

export function estacionAutorizada(cabecera: string | null, secreto: string): boolean {
  if (!cabecera?.startsWith("Bearer ")) return false;
  const enc = new TextEncoder();
  return igualesSinFiltrarTiempo(enc.encode(cabecera.slice(7)), enc.encode(secreto));
}

export function respuestaNoAutorizada(): Response {
  return Response.json({ error: "No autorizado." }, { status: 401 });
}
