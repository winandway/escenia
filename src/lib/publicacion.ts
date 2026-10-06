// Textos para YouTube al terminar un video: título del largo, uno por short,
// descripción y 30 palabras clave. Los escribe la IA a partir del guion y
// quedan guardados en el guion (`contenido.publicacion`) para copiarlos.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  esquemaGuion,
  esquemaPublicacionDeLaIA,
  esquemaPublicacionGenerada,
  ETIQUETAS_EN_INGLES,
  ETIQUETAS_MAXIMAS,
  unirEtiquetas,
  type Guion,
  type Publicacion,
  type ShortPublicado,
} from "@compartido/guion";
import { asegurarModelo, costoTokensUsd, MODELO_POR_DEFECTO } from "@compartido/modelos";
import { nombreDeRotulo } from "@compartido/portada";
import { comercialDeGuion } from "./comerciales";
import { grabacionDeGuion } from "./grabaciones";
import { buscarTematica } from "@compartido/tematicas";
import { guionPorId } from "./consultas";
import type { BaseDatos } from "./db";
import { conEstadoIA } from "./ia-estado";
import { anotarGasto, autorizarGasto } from "./presupuesto";

const ESTIMADO_USD = 0.05;

export function instruccionesPublicacion(): string {
  return [
    "Eres editor de un canal de YouTube en español neutro y sabes de posicionamiento (SEO) en YouTube.",
    "- Español neutro de verdad: nada de regionalismos ni apócopes de un solo país («compu», «celu», «vos», «ordenador», «móvil»); se dice «computadora», «celular», «tú».",
    "Escribes los textos de publicación de un video ya producido. Reglas:",
    `- \`titulo\`: máximo 70 letras, con el nombre de la persona o del tema y una promesa concreta que dé curiosidad; sin mayúsculas sostenidas, sin comillas de relleno, sin emojis.`,
    "- \`shorts[].titulo\`: uno por cada short, máximo 60 letras, cada uno con un gancho DISTINTO sacado de lo que se cuenta en ESAS escenas (un giro, un dato, una frase); sin la palabra «parte», sin numerarlos, sin hashtags. El título de un short solo puede afirmar lo que se dice en el texto de ESE short; no mezcles datos de otra parte del video.",
    "- \`descripcion\`: 3 párrafos cortos que cuenten de qué va el video sin destriparlo, con las palabras clave dichas de forma natural, y al final una línea con 4 o 5 hashtags.",
    `- En total quedan ${ETIQUETAS_MAXIMAS} palabras clave, en dos listas. \`etiquetas\`: exactamente ${ETIQUETAS_MAXIMAS - ETIQUETAS_EN_INGLES}, EN ESPAÑOL, mezcla de: nombre y variantes, género y época, personas y lugares que aparecen, temas del video, y búsquedas típicas DEL TIPO DE VIDEO (biografías: «biografía de…», «historia de…», «documental…»; tecnología: «qué es…», «cómo funciona…», «novedades de…», «vale la pena…»). \`etiquetas_ingles\`: exactamente ${ETIQUETAS_EN_INGLES}, EN INGLÉS, tal como buscaría un latino en Estados Unidos (biografías: «Latin Grammys snub», «bachata documentary»; tecnología: «OpenAI DevDay recap», «AI agents explained»). Sin repetir y sin hashtags.`,
    "- El canal quiere que lo vean los latinos de Estados Unidos: si la historia pasa por una ciudad de allá (Nueva York, El Bronx, Miami, Los Ángeles, Las Vegas), nómbrala en la descripción y en las palabras clave.",
    "- \`portada\` (la del video largo) y \`shorts[].portada\` (una por short): el texto de la MINIATURA, que se lee en un segundo y en chiquito y decide si le dan clic. Son tres líneas que se leen seguidas como un titular que da ganas de saber más («SE ACABÓ / LA IA GRATIS / PAGAS O VES ANUNCIOS»; «15 / NOMINACIONES / CERO PREMIOS»), TODO EN MAYÚSCULAS y sin puntos. Nada de frases raras ni telegráficas («CERO IA GRATIS» no se entiende): tiene que sonar como lo diría una persona. \`grande\`: lo más fuerte, en UNA cifra, UNA palabra o DOS palabras cortas, máximo 9 letras contando el espacio («15», «VETADO», «SE ACABÓ», «ADIÓS»); el cero se escribe «CERO». \`linea\`: 1 a 3 palabras, máximo 15 letras, que completan lo grande («NOMINACIONES», «LA IA GRATIS»); si el golpe es que algo se termina, se prohíbe o se pierde, pon ESA palabra entre virgulillas para que salga TACHADA («LA IA ~GRATIS~»): como mucho una palabra tachada. \`remate\`: 2 a 4 palabras, máximo 20 letras, el golpe final, con la palabra más fuerte entre asteriscos («*CERO* PREMIOS», «*PAGAS* O VES ANUNCIOS»). \`marcas\`: hasta 3 nombres de productos, apps o empresas que la gente reconoce y de los que habla el video, escritos como se escriben («ChatGPT», «Gemini»); nunca personas; vacío si no hay ninguno. \`persona\`: a quién se ve en la miniatura, con el nombre copiado TAL CUAL de la lista «PERSONAS CON FOTO» (vacío si la lista está vacía); la miniatura habla de esa persona. Cada short lleva un texto DISTINTO, sacado de lo que se cuenta en ESE short, y distinto del texto del video largo.",
    "- Nada de datos que no estén en el guion. Nada de clickbait falso: la promesa del título y de la miniatura tiene que cumplirse en el video.",
  ].join("\n");
}

export function mensajePublicacion(
  guion: Guion,
  tematica: string,
  shorts: ShortPublicado[],
  /** El idioma del video: en un comercial en inglés, los títulos y la miniatura van en inglés. */
  idioma: "es" | "en" = "es",
  /** Formato Canción: el guion es la LETRA que él canta; título y miniatura, como los de un video musical. */
  cancion = false,
): string {
  const escenas = guion.escenas
    .map((e, i) => `${i + 1}. [${e.parte}] ${e.narracion.trim() || "(sin voz: respiro musical)"}`)
    .join("\n");
  // Cada short lleva SU texto: así el título sale de lo que se cuenta ahí y no de otra parte del video.
  const loQueCuenta = (s: ShortPublicado) => {
    const texto = guion.escenas
      .slice(s.escena_inicio, s.escena_fin + 1)
      .map((e) => e.narracion.trim())
      .filter(Boolean)
      .join(" ");
    return texto.length > 900 ? `${texto.slice(0, 900)}…` : texto;
  };
  // Las personas que salen en el video con su nombre rotulado: solo de ellas hay foto para la miniatura.
  const personasDe = (desde: number, hasta: number) => {
    const nombres = guion.escenas
      .slice(desde, hasta + 1)
      .flatMap((e) => e.visual.planos ?? [])
      .filter((p) => p.tipo === "foto" && p.foto_de !== "lugar" && p.texto)
      .map((p) => nombreDeRotulo(p.texto ?? ""))
      .filter(Boolean);
    return [...new Set(nombres)].join(", ") || "(ninguna)";
  };
  const enIngles =
    idioma === "en"
      ? "IDIOMA: este video es en INGLÉS y es para un cliente. TODO lo que escribas (título, descripción, títulos de shorts, texto de la miniatura, marcas y palabras clave) va en inglés natural de Estados Unidos; las listas `etiquetas` y `etiquetas_ingles` van las dos en inglés. Nada de «suscríbete» ni de canal: no es un video de YouTube de Richard."
      : "";
  const deCancion = cancion
    ? "ES UNA CANCIÓN: el artista del canal se grabó CANTANDO su propia canción, en vivo, con la letra en pantalla (el guion de abajo es la LETRA, con algún error de transcripción). No es una charla ni una biografía. Estas reglas mandan sobre las generales. `titulo`: como el de un video musical: el nombre de la canción con mayúsculas iniciales, el género (bachata, salsa…) y un gancho corto sacado de la letra o del momento («en vivo», «estreno», «con letra»), por ejemplo «Voy Recorriendo Caminos – Bachata en vivo con letra»; nunca «el presentador», «el dueño del canal» ni «un hombre canta». `descripcion`: de qué habla la canción, que la canta el artista del canal en vivo con la letra en pantalla, y al final la LETRA completa, verso por verso. `portada` (la miniatura, VERTICAL): `grande` = UNA palabra de la letra que pegue, de 9 letras como mucho («CAMINOS», «VOLAR»), `linea` = lo que completa la frase, de 16 letras como mucho («SIN FINAL», «TE DEJO»): las dos líneas se leen seguidas como un verso («TE DEJO / VOLAR»); `remate` = el género y el momento con la palabra fuerte entre asteriscos («*BACHATA* EN VIVO»); `marcas`: vacío (el género ya va en el remate); `persona`: «presentador». Palabras clave: el género, «letra», «lyric video», «canción nueva», «música latina», el nombre de la canción y del canal."
    : "";
  const lista = shorts.length
    ? shorts
        .map(
          (s) =>
            `- Short ${s.indice} (escenas ${s.escena_inicio + 1} a ${s.escena_fin + 1}, ${Math.round(s.duracion_seg)} s; título provisional: «${s.titulo_original}»)\n  Lo que se cuenta en ESTE short: ${loQueCuenta(s)}\n  Personas con foto en ESTE short: ${personasDe(s.escena_inicio, s.escena_fin)}`,
        )
        .join("\n")
    : "- (este video no tiene shorts)";
  return [
    enIngles,
    deCancion,
    `TEMÁTICA: ${tematica}`,
    `TÍTULO DE TRABAJO DEL GUION: ${guion.titulo}`,
    `GANCHO: ${guion.gancho}`,
    `ESCENAS DEL VIDEO (lo que se narra):\n${escenas}`,
    `PERSONAS CON FOTO (en todo el video): ${personasDe(0, guion.escenas.length - 1)}`,
    `SHORTS PRODUCIDOS (cada uno es un trozo del video largo):\n${lista}`,
    "Escribe los textos de publicación siguiendo las reglas.",
  ].join("\n\n");
}

export async function generarPublicacion(
  db: BaseDatos,
  apiKey: string | undefined,
  guionId: number,
  shorts: ShortPublicado[],
  opciones: { fetch?: typeof fetch } = {},
): Promise<Publicacion> {
  if (!apiKey) throw new Error("Falta la clave de Anthropic en las variables del panel (ANTHROPIC_API_KEY).");
  const fila = await guionPorId(db, guionId);
  if (!fila) throw new Error("Ese guion no existe.");
  const guion = esquemaGuion.parse(JSON.parse(fila.contenido));
  const tematica = buscarTematica(fila.tematica_id)?.nombre ?? fila.tematica_id;
  // Un comercial va en el idioma del cliente.
  const comercial = await comercialDeGuion(db, guionId);
  // Una canción (grabación con formato Canción) lleva título y miniatura de video musical.
  const cancion = (await grabacionDeGuion(db, guionId))?.formato === "cancion";
  const modelo = asegurarModelo(MODELO_POR_DEFECTO);
  await autorizarGasto(db, ESTIMADO_USD);

  const cliente = new Anthropic({ apiKey, fetch: opciones.fetch, maxRetries: 2 });
  const respuesta = await conEstadoIA(db, () =>
    cliente.messages.parse({
      model: modelo,
      max_tokens: 4000,
      thinking: { type: "disabled" },
      system: instruccionesPublicacion(),
      messages: [
        {
          role: "user",
          content: mensajePublicacion(guion, tematica, shorts, comercial?.idioma ?? "es", cancion),
        },
      ],
      output_config: { format: zodOutputFormat(esquemaPublicacionDeLaIA) },
    }),
  );
  await anotarGasto(
    db,
    "claude",
    `textos de YouTube: ${guion.titulo}`,
    costoTokensUsd(modelo, respuesta.usage.input_tokens, respuesta.usage.output_tokens),
  );
  if (!respuesta.parsed_output) throw new Error("La IA devolvió los textos con formato inválido.");
  // La IA puede mandar palabras clave de más: se dejan las que caben, no se rechaza el trabajo.
  const cruda = esquemaPublicacionDeLaIA.parse(respuesta.parsed_output);
  const generada = esquemaPublicacionGenerada.parse({
    titulo: cruda.titulo,
    descripcion: cruda.descripcion,
    portada: cruda.portada,
    shorts: cruda.shorts,
    etiquetas: unirEtiquetas(cruda.etiquetas, cruda.etiquetas_ingles),
  });
  const publicacion: Publicacion = {
    ...generada,
    generado_en: new Date().toISOString(),
    shorts_producidos: shorts,
  };
  await db.ejecutar(`UPDATE guiones SET contenido = ?, actualizado_en = datetime('now') WHERE id = ?`, [
    JSON.stringify({ ...guion, publicacion }),
    guionId,
  ]);
  return publicacion;
}
