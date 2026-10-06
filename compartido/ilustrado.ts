// Estilo ilustrado: qué planos llevan la figura dibujada y cuándo la figura
// «sigue» en pantalla. Aquí va lo que no depende de la Mac (se puede probar).

export type FiguraDePlano = { ruta: string; ancho: number; alto: number };

type PlanoConFigura = {
  tipo: "foto" | "clip" | "dato" | "imagen";
  foto: { ruta: string } | null;
  texto: string;
  figura: FiguraDePlano | null;
  sigue: boolean;
};

/**
 * ¿Se puede dibujar a la persona de esta foto? Solo si en la foto hay UNA cara. Con dos personas
 * (dos invitados en un escenario), el dibujo se quedaría con una cualquiera y el rótulo diría el
 * nombre de la otra. Sin ninguna cara a la vista, tampoco: no se sabe a quién se dibuja.
 */
export function fotoSirveParaDibujar(recorte: { caras: unknown[] }): boolean {
  return recorte.caras.length === 1;
}

/**
 * ¿Sirve el recorte de un dibujo? Si casi todo el recuadro es «figura», es que
 * no se quitó el fondo: quedaría un rectángulo pegado encima del video.
 */
export function figuraSirve(recorte: { ancho: number; alto: number; lleno?: number }): boolean {
  return recorte.ancho >= 300 && recorte.alto >= 300 && (recorte.lleno ?? 1) <= 0.9;
}

/**
 * Reparte las figuras por los planos, en el orden del video:
 * - la foto con rótulo de una persona dibujada lleva su figura;
 * - un «dato» lleva la figura de la última persona que se mostró (la cifra le
 *   cae encima, en vez de tapar la pantalla), y si esa figura venía del plano
 *   de justo antes, `sigue`: no vuelve a entrar;
 * - un clip o una foto sin figura cortan la racha: lo que venga después entra de nuevo.
 * Antes de que salga la primera persona, los datos se quedan como estaban.
 */
export function repartirFiguras(
  escenas: { planos: PlanoConFigura[] }[],
  figuras: Map<string, FiguraDePlano>,
): void {
  let ultima: FiguraDePlano | null = null;
  for (const escena of escenas) {
    // Al cambiar de escena hay un fundido: la figura siempre vuelve a entrar.
    let enPantalla: FiguraDePlano | null = null;
    for (const plano of escena.planos) {
      plano.figura = null;
      plano.sigue = false;
      if (plano.tipo === "foto") {
        const propia = plano.foto && plano.texto ? (figuras.get(plano.foto.ruta) ?? null) : null;
        plano.figura = propia;
        if (propia) ultima = propia;
        enPantalla = propia;
      } else if (plano.tipo === "dato" && ultima) {
        plano.figura = ultima;
        plano.sigue = enPantalla === ultima;
        enPantalla = ultima;
      } else {
        enPantalla = null;
      }
    }
  }
}

/**
 * Formato «Neón con personajes»: en una escena de personas solo valen los planos que tienen
 * figura dibujada (la persona y los datos que le caen encima). Una foto real o un dato suelto
 * romperían el fondo de neón, así que se quitan: ese tramo se queda con la lámina de neón.
 * Devuelve cuántos planos se quitaron.
 */
export function dejarSoloFiguras(
  escenas: { planos: PlanoConFigura[] }[],
  /** Qué otros planos se conservan además de los que tienen figura (en un comercial, las imágenes del cliente y los datos). */
  conservar: (plano: PlanoConFigura) => boolean = () => false,
): number {
  let quitados = 0;
  for (const escena of escenas) {
    const antes = escena.planos.length;
    escena.planos = escena.planos.filter((p) => p.figura || conservar(p));
    quitados += antes - escena.planos.length;
    // Si se fue el plano que traía la figura, el que queda primero es el que la hace entrar.
    const primero = escena.planos[0];
    if (primero) primero.sigue = false;
  }
  return quitados;
}
