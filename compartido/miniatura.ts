// Textos de la miniatura (portada) del video: el nombre grande y un gancho
// corto, sacados del título del guion («Celia Cruz: la niña que…»).
export function textosMiniatura(titulo: string): { nombre: string; gancho: string } {
  const [antes, ...resto] = titulo.split(/[:—–]/);
  const nombre = (antes ?? titulo).trim();
  const gancho = recortar(resto.join(" ").trim(), 60);
  return { nombre: recortar(nombre, 28), gancho };
}

function recortar(s: string, max: number): string {
  const limpio = s.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).replace(/\s+\S*$/u, "")}…`;
}
