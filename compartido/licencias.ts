// Qué licencias de imagen se aceptan para un video monetizado.
// Wikimedia Commons devuelve el nombre corto (LicenseShortName), por ejemplo
// «CC BY-SA 4.0», «CC BY 3.0», «CC0», «Public domain».
// Se rechaza lo «no comercial» (NC) y lo «sin obras derivadas» (ND): un video
// es una obra derivada comercial.

export function licenciaLibre(nombreCorto: string): boolean {
  const l = nombreCorto.trim().toUpperCase();
  if (!l) return false;
  if (l.includes("NC") || l.includes("ND")) return false;
  if (l === "CC0" || l.startsWith("CC0 ")) return true;
  if (l.startsWith("CC BY")) return true;
  if (l.startsWith("PUBLIC DOMAIN") || l === "PD" || l.startsWith("PD-")) return true;
  return false;
}

/** ¿Hay que citar al autor? (CC0 y dominio público no lo exigen; se cita igual por cortesía.) */
export function exigeCredito(nombreCorto: string): boolean {
  return nombreCorto.trim().toUpperCase().startsWith("CC BY");
}
