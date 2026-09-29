// La app instalada en el teléfono (C-APP-1): a dónde va al abrirse.
// En el teléfono lo que más se usa es el calendario, así que la app abre ahí.

export const INICIO_DE_LA_APP = "/calendario";
/** Marca de esta sesión de la app: ya se la llevó al calendario una vez. */
export const MARCA_DE_INICIO = "escenia:llevada-al-calendario";

/**
 * Qué hacer al cargar una pantalla:
 * - `ir`: a dónde mandar (solo al abrir la app instalada en la portada);
 * - `marcar`: si esta sesión ya no debe volver a ser llevada al calendario.
 * Tocar «Guiones» después, dentro de la app, tiene que quedarse en Guiones.
 * En «/entrar» no se marca: después de poner la contraseña se cae en la
 * portada y ahí sí se lleva al calendario.
 */
export function alAbrirLaApp(p: { instalada: boolean; ruta: string; yaLlevada: boolean }): {
  ir: string | null;
  marcar: boolean;
} {
  if (!p.instalada || p.yaLlevada) return { ir: null, marcar: false };
  if (p.ruta === "/entrar") return { ir: null, marcar: false };
  if (p.ruta === "/") return { ir: INICIO_DE_LA_APP, marcar: true };
  return { ir: null, marcar: true };
}
