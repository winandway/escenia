// Las guías públicas de Escenia (Docs, estilo Wikipedia): cada una es su propia página con su dirección fija,
// en inglés (el principal, en /docs/...) y en español (/es/docs/...). Escritas para el público: nada de
// rutas internas, tablas, proveedores ni costos. La prueba exige los dos idiomas completos.
export type IdiomaDocs = "en" | "es";

export type Bloque =
  | { tipo: "p"; texto: string }
  | { tipo: "h2"; texto: string }
  | { tipo: "pasos"; items: string[] }
  | { tipo: "nota"; texto: string }
  | { tipo: "imagen"; src: string; alt: string };

type Contenido = { titulo: string; resumen: string; bloques: Bloque[] };

export type Guia = {
  seccion: keyof typeof SECCIONES;
  slug: string;
  actualizada: string;
  en: Contenido;
  es: Contenido;
};

export const SECCIONES = {
  "getting-started": {
    icono: "M5 3l14 9-14 9V3z",
    en: "Getting started",
    es: "Primeros pasos",
  },
  help: {
    icono: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6v.01M12 13a2.5 2.5 0 1 0-2.5-2.5",
    en: "Help",
    es: "Ayuda",
  },
} as const;

export const GUIAS: Guia[] = [
  {
    seccion: "getting-started",
    slug: "first-video-ad",
    actualizada: "2026-11-01",
    en: {
      titulo: "Make your first video ad",
      resumen:
        "Tell the Director what you sell, add your photos, review the card with its price, and approve it.",
      bloques: [
        {
          tipo: "p",
          texto:
            "Escenia turns a short chat with your AI Director into a vertical video ad, ready for Reels, TikTok, Shorts and WhatsApp. You don't need to edit anything: you describe your business and approve the result.",
        },
        { tipo: "h2", texto: "Step by step" },
        {
          tipo: "pasos",
          items: [
            "Sign in with the password our team gave you.",
            "Tap New project and tell the Director what you want to sell, who it's for, and how people buy from you.",
            "Add your photos or a short video. The Director looks at them and writes the ad.",
            "You get a card with the price, the script, the voice, and the presenter. Nothing is charged until you tap Approve.",
            "In a few minutes the finished video appears on the same card. Save it to your Photos or share it.",
          ],
        },
        { tipo: "h2", texto: "Change something before approving" },
        {
          tipo: "p",
          texto:
            "If you want a different script, another tone or a shorter ad, tap Change something and say it in your own words. A new card replaces the old one, with its updated price.",
        },
        {
          tipo: "nota",
          texto:
            "Ads with a talking presenter cost more than ads with photos only. Every card shows its price first.",
        },
      ],
    },
    es: {
      titulo: "Haz tu primer anuncio en video",
      resumen:
        "Cuéntale al Director qué vendes, agrega tus fotos, revisa la tarjeta con su precio y apruébala.",
      bloques: [
        {
          tipo: "p",
          texto:
            "Escenia convierte una conversación corta con tu Director de IA en un anuncio vertical, listo para Reels, TikTok, Shorts y WhatsApp. No tienes que editar nada: describes tu negocio y apruebas el resultado.",
        },
        { tipo: "h2", texto: "Paso a paso" },
        {
          tipo: "pasos",
          items: [
            "Entra con la contraseña que te dio nuestro equipo.",
            "Toca Proyecto nuevo y cuéntale al Director qué quieres vender, a quién y cómo te compran.",
            "Agrega tus fotos o un video corto. El Director los mira y escribe el anuncio.",
            "Te llega una tarjeta con el precio, el texto, la voz y la presentadora. No se cobra nada hasta que tocas Aprobar.",
            "En unos minutos el video terminado aparece en la misma tarjeta. Guárdalo en tus Fotos o compártelo.",
          ],
        },
        { tipo: "h2", texto: "Cambia algo antes de aprobar" },
        {
          tipo: "p",
          texto:
            "Si quieres otro texto, otro tono o un anuncio más corto, toca Cambiar algo y dilo con tus palabras. Una tarjeta nueva reemplaza la anterior, con su precio actualizado.",
        },
        {
          tipo: "nota",
          texto:
            "Los anuncios con una presentadora que habla cuestan más que los que llevan solo fotos. Cada tarjeta muestra su precio primero.",
        },
      ],
    },
  },
  {
    seccion: "help",
    slug: "support-cases",
    actualizada: "2026-11-01",
    en: {
      titulo: "Get help: your support cases",
      resumen:
        "Open a case from the Support page or the app, get a case number, and talk with our team in a private conversation.",
      bloques: [
        {
          tipo: "p",
          texto:
            "When something isn't working or you have a question, open a support case. Each case is a private conversation with our team: you write, we reply in the same place, and you can keep writing until it's solved.",
        },
        { tipo: "h2", texto: "Where to open a case" },
        {
          tipo: "pasos",
          items: [
            "On the web: go to the Support page and fill in the form Open a support case.",
            "In the iPhone app, before signing in: tap Contact support at the bottom of the sign-in screen.",
            "In the iPhone app, once inside: tap the three dots at the top of Your projects and choose Help.",
          ],
        },
        {
          tipo: "imagen",
          src: "/capturas/ayuda-formulario-en.png",
          alt: "The Open a support case form on the Support page",
        },
        { tipo: "h2", texto: "Step by step" },
        {
          tipo: "pasos",
          items: [
            "Write your name, your email, a short subject and what happened. If it's about a video, include the project name.",
            "Tap Send. You get a case number, like ESC-1001, and your conversation opens.",
            "Our team replies in that conversation, usually within one business day. In the app, you get a notification when we reply.",
            "Write back in the same conversation whenever you need to. If the case was closed, writing again reopens it.",
          ],
        },
        {
          tipo: "imagen",
          src: "/capturas/ayuda-caso-en.png",
          alt: "A support case conversation with a reply from Escenia Support",
        },
        { tipo: "h2", texto: "Your cases" },
        {
          tipo: "p",
          texto:
            "The browser or the phone you used remembers your cases and lists them under Your cases, with their status: Waiting for our reply, We replied, or Closed.",
        },
        {
          tipo: "nota",
          texto:
            "Keep the link of your case: it's how you come back to it, and anyone with that link can read the conversation. Never send passwords or card numbers in a case.",
        },
      ],
    },
    es: {
      titulo: "Pide ayuda: tus casos de soporte",
      resumen:
        "Abre un caso desde la página de Soporte o desde la app, recibe un número de caso y habla con nuestro equipo en una conversación privada.",
      bloques: [
        {
          tipo: "p",
          texto:
            "Cuando algo no funciona o tienes una pregunta, abre un caso de soporte. Cada caso es una conversación privada con nuestro equipo: tú escribes, nosotros respondemos en el mismo lugar y puedes seguir escribiendo hasta que quede resuelto.",
        },
        { tipo: "h2", texto: "Dónde abrir un caso" },
        {
          tipo: "pasos",
          items: [
            "En la web: entra a la página de Soporte y llena el formulario Abre un caso de soporte.",
            "En la app de iPhone, antes de entrar: toca Contactar a soporte, abajo en la pantalla de entrar.",
            "En la app de iPhone, ya adentro: toca los tres puntos arriba en Tus proyectos y elige Ayuda.",
          ],
        },
        {
          tipo: "imagen",
          src: "/capturas/ayuda-formulario-es.png",
          alt: "El formulario Abre un caso de soporte en la página de Soporte",
        },
        { tipo: "h2", texto: "Paso a paso" },
        {
          tipo: "pasos",
          items: [
            "Escribe tu nombre, tu correo, un asunto corto y qué pasó. Si es sobre un video, incluye el nombre del proyecto.",
            "Toca Enviar. Recibes un número de caso, como ESC-1001, y se abre tu conversación.",
            "Nuestro equipo te responde en esa conversación, normalmente en un día hábil. En la app te llega un aviso cuando respondemos.",
            "Escribe otra vez en la misma conversación cuando lo necesites. Si el caso estaba cerrado, al escribir se abre de nuevo.",
          ],
        },
        {
          tipo: "imagen",
          src: "/capturas/ayuda-caso-es.png",
          alt: "La conversación de un caso con una respuesta del Soporte de Escenia",
        },
        { tipo: "h2", texto: "Tus casos" },
        {
          tipo: "p",
          texto:
            "El navegador o el teléfono que usaste recuerda tus casos y los muestra en Tus casos, con su estado: Esperando nuestra respuesta, Te respondimos o Cerrado.",
        },
        {
          tipo: "nota",
          texto:
            "Guarda el enlace de tu caso: es tu forma de volver a él, y cualquiera que tenga ese enlace puede leer la conversación. Nunca mandes contraseñas ni números de tarjeta en un caso.",
        },
      ],
    },
  },
  {
    seccion: "help",
    slug: "send-a-screenshot",
    actualizada: "2026-11-01",
    en: {
      titulo: "How to send a screenshot to support",
      resumen:
        "Take a screenshot of what you see, attach up to three images to your support case, and our team sees exactly what happened.",
      bloques: [
        {
          tipo: "p",
          texto:
            "A screenshot shows our team exactly what you see, so we can fix it faster. You can attach screenshots to any message in your support case, on the web or in the iPhone app.",
        },
        { tipo: "h2", texto: "1. Take the screenshot" },
        {
          tipo: "pasos",
          items: [
            "iPhone: press the side button and the volume up button at the same time.",
            "Android: press the power button and the volume down button at the same time.",
            "Mac: press Shift, Command and 4, then drag over the part of the screen you want.",
            "Windows: press the Windows key, Shift and S, then drag over the part of the screen you want.",
          ],
        },
        { tipo: "h2", texto: "2. Attach it to your case" },
        {
          tipo: "pasos",
          items: [
            "Open your case. If you don't have one yet, open it first from the Support page or from Help in the app.",
            "Tap Attach screenshots and choose up to three images. JPG, PNG, WEBP and HEIC work, up to 10 MB each.",
            "Wait until each thumbnail finishes uploading. If one fails, remove it and add it again: your text stays where it was.",
            "Write what happened, if you want, and tap Send. Your images appear in the conversation.",
          ],
        },
        {
          tipo: "imagen",
          src: "/capturas/ayuda-captura-en.png",
          alt: "A support case with a screenshot attached, ready to send",
        },
        { tipo: "h2", texto: "Before you send it" },
        {
          tipo: "nota",
          texto:
            "Crop or cover anything private before attaching it: passwords, card numbers, codes or other people's information. Only our team and whoever has your case link can see your images.",
        },
      ],
    },
    es: {
      titulo: "Cómo mandar una captura a soporte",
      resumen:
        "Toma una captura de lo que ves, adjunta hasta tres imágenes a tu caso de soporte y nuestro equipo verá exactamente qué pasó.",
      bloques: [
        {
          tipo: "p",
          texto:
            "Una captura de pantalla le muestra a nuestro equipo exactamente lo que ves, así lo resolvemos más rápido. Puedes adjuntar capturas a cualquier mensaje de tu caso de soporte, en la web o en la app de iPhone.",
        },
        { tipo: "h2", texto: "1. Toma la captura" },
        {
          tipo: "pasos",
          items: [
            "iPhone: presiona al mismo tiempo el botón lateral y el de subir volumen.",
            "Android: presiona al mismo tiempo el botón de encendido y el de bajar volumen.",
            "Mac: presiona Mayúsculas, Comando y 4, y arrastra sobre la parte de la pantalla que quieres.",
            "Windows: presiona la tecla de Windows, Mayúsculas y S, y arrastra sobre la parte de la pantalla que quieres.",
          ],
        },
        { tipo: "h2", texto: "2. Adjúntala a tu caso" },
        {
          tipo: "pasos",
          items: [
            "Abre tu caso. Si todavía no tienes uno, ábrelo primero desde la página de Soporte o desde Ayuda en la app.",
            "Toca Adjuntar capturas y elige hasta tres imágenes. Sirven JPG, PNG, WEBP y HEIC, de hasta 10 MB cada una.",
            "Espera a que cada miniatura termine de subir. Si una falla, quítala y agrégala otra vez: tu texto se queda donde estaba.",
            "Escribe qué pasó, si quieres, y toca Enviar. Tus imágenes aparecen en la conversación.",
          ],
        },
        {
          tipo: "imagen",
          src: "/capturas/ayuda-captura-es.png",
          alt: "Un caso de soporte con una captura adjunta, lista para enviar",
        },
        { tipo: "h2", texto: "Antes de mandarla" },
        {
          tipo: "nota",
          texto:
            "Recorta o tapa lo privado antes de adjuntarla: contraseñas, números de tarjeta, códigos o datos de otras personas. Tus imágenes solo las ve nuestro equipo y quien tenga el enlace de tu caso.",
        },
      ],
    },
  },
];

export const rutaDeGuia = (g: Pick<Guia, "seccion" | "slug">, idioma: IdiomaDocs) =>
  `${idioma === "es" ? "/es" : ""}/docs/${g.seccion}/${g.slug}`;

export const guiaPorRuta = (seccion: string, slug: string) =>
  GUIAS.find((g) => g.seccion === seccion && g.slug === slug) ?? null;

/** El texto de una guía para el buscador: título, resumen y cuerpo. */
export function textoBuscable(g: Guia, idioma: IdiomaDocs): string {
  const c = g[idioma];
  const cuerpo = c.bloques.map((b) =>
    b.tipo === "pasos" ? b.items.join(" ") : b.tipo === "imagen" ? b.alt : b.texto,
  );
  return [c.titulo, c.resumen, ...cuerpo].join(" ").toLowerCase();
}

export const TEXTOS_DOCS = {
  en: {
    titulo: "Escenia Docs",
    sub: "Guides to make video ads with your AI Director and to get help when you need it.",
    buscar: "Search the guides",
    sin_resultados: "No guides match your search.",
    volver: "← Docs",
    actualizada: "Updated",
    ayuda_titulo: "Still need help?",
    ayuda_texto: "Open a support case and our team will reply in a private conversation.",
    ayuda_boton: "Contact support",
    menu: "Guides",
  },
  es: {
    titulo: "Docs de Escenia",
    sub: "Guías para hacer anuncios en video con tu Director de IA y para pedir ayuda cuando la necesites.",
    buscar: "Busca en las guías",
    sin_resultados: "Ninguna guía coincide con tu búsqueda.",
    volver: "← Docs",
    actualizada: "Actualizada",
    ayuda_titulo: "¿Todavía necesitas ayuda?",
    ayuda_texto: "Abre un caso de soporte y nuestro equipo te responde en una conversación privada.",
    ayuda_boton: "Contactar a soporte",
    menu: "Guías",
  },
} as const;

/** Las guías que coinciden con lo que se escribe (todas las palabras, sin importar tildes). */
export function buscarGuias(idioma: IdiomaDocs, consulta: string): Guia[] {
  const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const palabras = sinTildes(consulta.toLowerCase()).split(/\s+/).filter(Boolean);
  if (!palabras.length) return GUIAS;
  return GUIAS.filter((g) => {
    const texto = sinTildes(textoBuscable(g, idioma));
    return palabras.every((p) => texto.includes(p));
  });
}
