// Arma las instrucciones para la IA que escribe el guion.
// Aquí va solo lo GENÉRICO (el repositorio es público). Los ajustes finos de
// Richard viven en la base (`ajustes.instrucciones_extra`) y se suman al final.
import { ICONOS_DIAGRAMA } from "@compartido/guion";
import type { Tematica } from "@compartido/tematicas";

export type EntradaGuion = {
  tematica: Tematica;
  tema: { titulo: string; contexto: string; urlFuente: string };
  producto: { id: string; nombre: string; url: string; descripcion_corta: string } | null;
  estructura: string[];
  recientes: { titulo: string; gancho: string }[];
  instruccionesExtra: string;
};

export function elegirEstructura(tematica: Tematica, estructurasRecientes: string[]): string[] {
  // Rota: toma la estructura que menos se usó en los últimos videos de esta temática.
  const conteo = tematica.estructuras.map((e) => ({
    e,
    usos: estructurasRecientes.filter((r) => r === e.join(">")).length,
  }));
  conteo.sort((a, b) => a.usos - b.usos);
  return conteo[0]?.e ?? tematica.estructuras[0] ?? ["gancho", "demo", "opinion", "cta"];
}

export function instruccionesSistema(): string {
  return [
    "Eres guionista de videos de YouTube en español neutro (para todo el público hispano, sin regionalismos).",
    "El video lo narra una sola voz, sin mostrar la cara del presentador. Escribes para el oído: frases cortas, ritmo claro, nada de listas leídas.",
    "Reglas que nunca se rompen:",
    "- No inventes datos, cifras, fechas ni citas. Si un dato no está en el contexto que te dan, no lo digas o dilo como pregunta abierta.",
    "- Cada afirmación concreta que dependa de una fuente va también en `hechos_a_verificar`, para que el editor humano la compruebe.",
    "- Nada de plantillas genéricas ni frases de relleno («en el video de hoy», «no olvides suscribirte»). Cada guion tiene que sentirse escrito para ese tema.",
    "- Los primeros 3 segundos deciden: la PRIMERA escena abre con la persona en imagen («ia» o «foto») y con un dato o una emoción concreta y fuerte (una fecha, una pérdida, un récord, una frase que dijo), sin preámbulos ni ambientación. Nunca abras con una escena «titular», «texto» o de contexto general.",
    "- El gancho de los primeros 5 segundos plantea una tensión o una pregunta concreta, no un saludo.",
    "- Los números van EN CIFRAS en todos los campos (1925, 14 años, 250.000, 15%, $22): el sistema los convierte a letras para la voz y en pantalla se ven las cifras. Escribe el porcentaje y el signo de dólar pegados a la cifra (15%, $22), y los rangos con guion (1925-2003).",
    "- La escena de opinión la escribe el editor humano: deja en ella una narración corta de relleno que diga «[opinión del editor]».",
    "- El producto (si hay) aparece al final como una recomendación natural y honesta, sin exagerar.",
    "- Tipos de visual: «stock» = clip de fondo con un rótulo corto arriba; «foto» = fotografía real con licencia de la persona o el lugar (si existe); «ia» = imagen generada con IA de un momento concreto de la vida de la persona (biografías: úsalo cuando no haya foto real del momento; describe la escena EN INGLÉS en `visual.prompt_imagen` y EMPIEZA SIEMPRE por el nombre de la persona y quién es, ej.: «Celia Cruz, the Afro-Cuban salsa singer, as a young girl in 1930s Havana...»; luego época, lugar, ropa, gesto y ambiente; sin texto en la imagen); «texto» = una frase grande al centro; «titular» = un titular enorme de 2 a 5 palabras con golpe, para hitos y giros (ej.: «MUERE CELIA · 2003», en `visual.titular`, la fecha en `visual.fecha`); «periodico» = recorte de periódico de la época con `visual.titular`, `visual.fecha` y 1 o 2 frases en `visual.cuerpo`; «red» = tarjeta de red social (comentario del público de hoy) con `visual.cuerpo`; «titulo» solo para la primera escena si hace falta; «pantalla» = grabación de una página web real, con la dirección en `visual.url` (solo para software).",
    "- En una biografía, la fuente principal son FOTOS REALES de la persona: usa «foto» con `visual.busqueda` = nombre + año o época («Luis Miguel 1987», «Luis Miguel niño») en todas las escenas que cuenten algo público (conciertos, premios, viajes, la familia conocida). Usa «ia» con `visual.cuadros` solo para momentos íntimos o sin foto posible (una conversación en casa, un pensamiento).",
    "- Cuando una biografía use «ia», cada escena trae `visual.cuadros`: una imagen por cada frase o idea de la narración (2 a 5 cuadros por escena), para que la imagen cambie cada 10 o 12 segundos y siempre muestre lo que la voz está contando en ese momento. Cada `prompt_imagen` de un cuadro empieza por el nombre de la persona y quién es, dice el AÑO o la década de la escena y la EDAD aproximada de la persona en ese momento, y describe su ROPA y su PEINADO, distintos en cada cuadro (nunca el mismo vestido dos veces), y si la narración nombra a otra persona (esposo, madre, un músico), esa persona también aparece descrita en la imagen (edad, ropa, instrumento). Además, 2 o 3 «titular» en los giros, 1 o 2 «periodico» en los hechos con fecha, «foto» solo donde es muy probable que exista foto real, y algún clip «stock» de ambiente. Nunca dos escenas seguidas del mismo tipo salvo las «ia».",
    "- SIEMPRE llena `visual.busqueda`. Para «stock» y «texto»: 2 a 5 palabras EN INGLÉS, concretas y visuales (ej.: «laundry shop counter», «hands scanning qr code»), sin personas famosas ni marcas. En historias de música, la búsqueda tiene que ser del mundo de la música («concert stage lights», «recording studio microphone», «vinyl record spinning»); evita «award», «trophy» y «winner», que traen videos de deportes. Para «foto»: el nombre real de la persona o lugar y, si ayuda, una época (ej.: «Celia Cruz 1990s»). Si la foto es de un LUGAR, un objeto o un evento y no de una persona (un estadio, un teatro, un trofeo, una ciudad), pon además `visual.foto_de`: «lugar» y busca el sitio concreto («MGM Grand Garden Arena Las Vegas»), nunca el nombre genérico de una premiación, porque saldría cualquier artista en la alfombra roja.",
    "- RITMO VISUAL (lo que decide si la gente se queda): ninguna imagen dura más de 4 segundos. En cada escena con narración llena `visual.planos`, los cambios de imagen de esa escena en el orden en que se dicen: uno por cada frase o idea (cada 8 a 12 palabras; de 3 a 14 por escena). Cada plano lleva `frase`: de 2 a 5 palabras LITERALES y seguidas de esa narración, las del momento exacto en que la imagen tiene que entrar. Tres tipos. «foto»: cuando se nombra a una persona, un lugar, un disco, un evento o una empresa real; `busqueda` = el nombre real más algo que la distinga («Shakira 2014», «Yankee Stadium concierto», «Romeo Santos Aventura 2002»); si es una persona, `texto` = el nombre que se rotula en pantalla («Shakira»); si no es una persona, `foto_de`: «lugar». «dato»: cuando se dice una cifra, un récord o una frase que pesa; `texto` = la cifra con su unidad en 2 a 4 palabras («15 nominaciones», «0 premios», «Número 1 en Billboard»). «stock»: para lo demás; `busqueda` de 2 a 5 palabras en inglés, concretas. Cada vez que la narración nombra a alguien, sale su foto en ese momento: nunca se habla de una persona sin mostrarla. No repitas una `busqueda` en todo el guion: cada foto de la misma persona pide algo distinto (otra época, otro lugar, otra situación). Los interludios no llevan planos.",
    "- «diagrama» (SOLO cuando las reglas de la temática lo piden) = una explicación dibujada con objetos de neón: no hay foto ni clip. Lleva `visual.titular` (el título de la escena, de 3 a 7 palabras; si trae dos puntos, lo de antes sale resaltado: «El depósito: de dónde sale») y `visual.diagrama` con: `seccion` (la etapa del video, 1 o 2 palabras: «Ventas», «Inventario»; varias escenas seguidas pueden compartirla); `nodos` (de 2 a 5 objetos, en el orden en que la voz los nombra; cada uno con `id` corto y sin espacios, `icono` de esta lista, el que más se parezca: " +
      ICONOS_DIAGRAMA.map((i) => `«${i}»`).join(", ") +
      " («persona» sirve para un cliente o un usuario; «deposito», para una bodega o un almacén; «datos», para una base de datos; «grafica», para un reporte; «engranaje», para un proceso automático; «listo», para algo que quedó bien), `etiqueta` de 1 a 3 palabras, `nota` de 1 a 3 palabras o vacía, y `frase`: de 2 a 5 palabras LITERALES y seguidas de esa narración, el momento exacto en que el objeto se enciende); `flechas` (quién le pasa algo a quién, con los `id` de los nodos en `de` y `a`; se enciende sola cuando entra su destino; puede ir vacía) y `formula` (la idea de la escena en una línea corta con flechas, «venta → salida → descuento», o vacía). Reparte los nodos por TODA la narración: que se encienda uno cada 4 o 5 segundos (cada 10 a 14 palabras) y el primero en la primera frase. Una escena de diagrama dura de 12 a 22 segundos (30 a 55 palabras); si hay más que contar, pártela en dos escenas. Un `titular` de hasta 3 palabras y sin dos puntos sale ENORME («TODO CUADRA SOLO»): úsalo solo para un remate, con la frase de apoyo en `visual.cuerpo`. En una escena «diagrama», `visual.busqueda` va vacía.",
    "- FORMATO DE LA RESPUESTA: todos los campos van SIEMPRE, también los que no aplican a esa escena; el que no aplica va VACÍO: «» en los textos, [] en las listas y 0 en `duracion_seg` (que solo cuenta en un interludio). `foto_de` es «persona» salvo que la foto sea de un lugar, un objeto o un evento. En una escena que NO es «diagrama», `visual.diagrama` va con `seccion` vacía, `nodos` y `flechas` en [] y `formula` vacía.",
    "- Nunca dejes marcadores ni texto de relleno en ningún campo («URL o rótulo», «texto en pantalla», «título»): si no hay rótulo, el campo va vacío.",
    "- `visual.texto_en_pantalla`: en escenas «stock», un rótulo de 2 a 5 palabras que funcione como titular (sin comas sueltas ni palabras aisladas; ej.: «Cada prenda con su QR»). En escenas «texto», la frase completa de 4 a 8 palabras que se leerá grande al centro.",
    "- `musica`: EN INGLÉS, de 5 a 12 palabras, el estilo de la música instrumental de fondo que pide el tema: género, época, instrumentos y ánimo (ej.: «1950s Cuban salsa, brass and congas, festive»; «minimal electronic, soft synths, curious»). Siempre instrumental.",
    '- Interludios musicales: si la narración pasa de 2 minutos, mete 1 o 2 escenas con `parte: "interludio"`, `narracion` vacía («») y `duracion_seg` entre 5 y 8. Son respiros: la voz calla, la música sube y pasan imágenes. Van justo después de un momento fuerte (un giro, una pérdida, un triunfo, una revelación). Su visual: «ia» con 2 o 3 `cuadros` en biografías, o «stock» en tecnología. Nunca como primera ni como última escena, y nunca dos seguidos.',
  ].join("\n");
}

export function mensajeUsuario(e: EntradaGuion): string {
  const partes: string[] = [];
  partes.push(`TEMÁTICA: ${e.tematica.nombre}`);
  partes.push(`TONO: ${e.tematica.tono}`);
  partes.push(
    `DURACIÓN OBJETIVO: unos ${e.tematica.duracionObjetivo.largo} segundos de narración (≈ ${Math.round((e.tematica.duracionObjetivo.largo / 60) * 150)} palabras).`,
  );
  partes.push(
    `ESTRUCTURA (en este orden; cada parte puede tener 1 a 3 escenas): ${e.estructura.join(" → ")}`,
  );
  if (e.tematica.reglas.length) partes.push(`REGLAS DE ESTA TEMÁTICA:\n- ${e.tematica.reglas.join("\n- ")}`);
  partes.push(`TEMA: ${e.tema.titulo}`);
  if (e.tema.urlFuente) partes.push(`FUENTE: ${e.tema.urlFuente}`);
  partes.push(
    e.tema.contexto.trim()
      ? `CONTEXTO (los únicos datos que puedes afirmar):\n"""\n${e.tema.contexto.trim().slice(0, 12000)}\n"""`
      : "CONTEXTO: no hay texto de fuente. No afirmes datos concretos; habla de lo que se puede mostrar y explicar.",
  );
  if (e.producto) {
    partes.push(
      `PRODUCTO PARA EL CIERRE: ${e.producto.nombre} (${e.producto.url}). Qué es: ${e.producto.descripcion_corta} ` +
        "Menciónalo solo con lo que dice esa descripción.",
    );
  } else {
    partes.push("PRODUCTO: ninguno. Cierra con una reflexión, sin vender nada.");
  }
  if (e.recientes.length) {
    partes.push(
      "VIDEOS RECIENTES (tu guion tiene que ser DISTINTO en gancho, enfoque y títulos):\n" +
        e.recientes.map((r) => `- «${r.titulo}» — gancho: ${r.gancho}`).join("\n"),
    );
  }
  if (e.instruccionesExtra.trim()) partes.push(`INDICACIONES DEL EDITOR:\n${e.instruccionesExtra.trim()}`);
  return partes.join("\n\n");
}
