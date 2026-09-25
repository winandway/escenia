// ElevenLabs devuelve el tiempo de cada LETRA; Remotion necesita el de cada
// PALABRA. Este convertidor hace ese puente y además dice a qué escena
// pertenece cada palabra y cuándo empieza y termina cada escena.

export type Alineacion = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

/** Mismo formato que `Caption` de @remotion/captions. */
export type Palabra = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

export type TramoEscena = { indice: number; inicioMs: number; finMs: number };

export type ResultadoSubtitulos = { palabras: Palabra[]; escenas: TramoEscena[]; duracionMs: number };

const SEPARADOR_ESCENAS = "\n\n";

/**
 * @param alineacion  lo que devuelve /with-timestamps (campo `alignment`)
 * @param textosEscenas la narración de cada escena, en el mismo orden en que se
 *   unió con "\n\n" para mandarla a ElevenLabs
 */
export function palabrasDesdeAlineacion(
  alineacion: Alineacion,
  textosEscenas: string[],
): ResultadoSubtitulos {
  const {
    characters: letras,
    character_start_times_seconds: inicios,
    character_end_times_seconds: fines,
  } = alineacion;
  if (letras.length !== inicios.length || letras.length !== fines.length) {
    throw new Error("La alineación de ElevenLabs viene incompleta: letras y tiempos no coinciden.");
  }

  // A qué escena pertenece cada posición del texto unido.
  const escenaDeLetra: number[] = [];
  textosEscenas.forEach((texto, i) => {
    for (let k = 0; k < texto.trim().length; k++) escenaDeLetra.push(i);
    if (i < textosEscenas.length - 1)
      for (let k = 0; k < SEPARADOR_ESCENAS.length; k++) escenaDeLetra.push(i);
  });

  const palabras: Palabra[] = [];
  const escenaDePalabra: number[] = [];
  let actual = "";
  let inicio = 0;
  let fin = 0;
  let escena = 0;

  const cerrar = () => {
    if (!actual) return;
    // Remotion pide el espacio ADELANTE de cada palabra salvo la primera.
    const texto = palabras.length === 0 ? actual : ` ${actual}`;
    palabras.push({
      text: texto,
      startMs: ms(inicio),
      endMs: ms(fin),
      timestampMs: ms((inicio + fin) / 2),
      confidence: null,
    });
    escenaDePalabra.push(escena);
    actual = "";
  };

  letras.forEach((letra, i) => {
    if (/\s/.test(letra)) {
      cerrar();
      return;
    }
    if (!actual) {
      inicio = inicios[i] ?? 0;
      escena = escenaDeLetra[i] ?? escenaDeLetra[escenaDeLetra.length - 1] ?? 0;
    }
    actual += letra;
    fin = fines[i] ?? inicio;
  });
  cerrar();

  const duracionMs = ms(fines[fines.length - 1] ?? 0);
  const escenas = tramosPorEscena(escenaDePalabra, palabras, textosEscenas.length, duracionMs);
  return { palabras, escenas, duracionMs };
}

function tramosPorEscena(
  escenaDePalabra: number[],
  palabras: Palabra[],
  total: number,
  duracionMs: number,
): TramoEscena[] {
  const tramos: TramoEscena[] = [];
  for (let i = 0; i < total; i++) {
    const indices = escenaDePalabra.map((e, k) => (e === i ? k : -1)).filter((k) => k >= 0);
    const primera = indices[0];
    if (primera === undefined) continue;
    tramos.push({ indice: i, inicioMs: palabras[primera]?.startMs ?? 0, finMs: 0 });
  }
  // Cada escena dura hasta que empieza la siguiente: así no quedan huecos negros.
  tramos.forEach((t, k) => {
    const siguiente = tramos[k + 1];
    t.finMs = siguiente ? siguiente.inicioMs : duracionMs;
  });
  const primero = tramos[0];
  if (primero) primero.inicioMs = 0;
  return tramos;
}

/**
 * Tiempos aproximados cuando NO hay alineación (voz de prueba del sistema):
 * reparte la duración real del audio en proporción a las letras.
 */
export function alineacionAproximada(texto: string, duracionSeg: number): Alineacion {
  const letras = [...texto];
  const paso = letras.length ? duracionSeg / letras.length : 0;
  return {
    characters: letras,
    character_start_times_seconds: letras.map((_, i) => i * paso),
    character_end_times_seconds: letras.map((_, i) => (i + 1) * paso),
  };
}

const ms = (seg: number) => Math.round(seg * 1000);
