// «Tus casos» en la web: el navegador recuerda los enlaces de los casos que abrió (no hay cuentas).
// Si el navegador no deja guardar (modo privado), la página funciona igual.
const LLAVE = "escenia:casos";

export function leerCasosLocales(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(LLAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((c): c is string => typeof c === "string").slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function anotarCasoLocal(codigo: string): void {
  try {
    const lista = [codigo, ...leerCasosLocales().filter((c) => c !== codigo)].slice(0, 30);
    window.localStorage.setItem(LLAVE, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: el enlace del caso sigue sirviendo.
  }
}
