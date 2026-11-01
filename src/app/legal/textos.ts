// Los textos públicos de la app de iPhone: la política de privacidad y la página de soporte, en inglés
// (manda) y en español (traducción de cortesía). Escritos para el público: sin nombres internos.
import type { Seccion } from "./PaginaLegal";

// El correo de soporte es el buzón único de Windoce con la etiqueta de Escenia (1 nov 2026, docs/APP-IPHONE.md).
export const CORREO_SOPORTE = "soporte+escenia@windoce.com";
const CONTACTO = `Windoce LLC, 30080 Montmorency Dr, Novi, MI 48377, USA · ${CORREO_SOPORTE}`;

export const PRIVACIDAD = {
  en: {
    titulo: "Escenia Privacy Policy",
    actualizado: "Last updated: November 1, 2026",
    intro:
      "Escenia is a video studio app made by Windoce LLC. You chat with our AI Director, add your photos and videos, and approve short vertical video ads for social media. This policy explains what we collect, why, and the choices you have.",
    secciones: [
      {
        titulo: "What we collect",
        parrafos: [
          "Account access. Escenia doesn't offer public sign-up: Windoce creates accounts for its clients. To keep you signed in, the app stores a secure session token on your device. Your password is never stored on the device.",
          "Content you provide. The messages you send to the Director, the photos and videos you upload, and the videos we make for you.",
          "Technical data. Basic server logs (IP address and time of each request) that we use for security, for example to block repeated wrong passwords.",
          "We don't collect your location, your contacts, or advertising identifiers.",
        ],
      },
      {
        titulo: "How we use it",
        parrafos: [
          "Only to make your videos: understanding what you ask for, choosing your photos, creating the voice-over and the presenter, putting the video together, and delivering it to you.",
          "We don't sell your data, we don't use it for advertising, and we don't track you across other companies' apps or websites.",
        ],
      },
      {
        titulo: "Service providers",
        parrafos: [
          "To provide Escenia we rely on trusted providers for AI text, voice generation, presenter animation, and cloud storage. They process your content only to perform these tasks for us.",
        ],
      },
      {
        titulo: "Photos, camera, and saving videos",
        parrafos: [
          "The app asks for access to your photo library or camera only when you choose to add a photo or video, and asks to save to your Photos only when you tap Save on a finished video. You can change these permissions at any time in your iPhone's Settings.",
        ],
      },
      {
        titulo: "How long we keep it",
        parrafos: [
          "Your projects and their files stay in your account until you ask us to delete them. Archiving a project only hides it from your list. Server logs are kept for a short time for security.",
        ],
      },
      {
        titulo: "Deleting your data",
        parrafos: [
          "Email soporte+escenia@windoce.com from the address linked to your account and we'll delete your projects, uploads, and videos within 30 days.",
        ],
      },
      {
        titulo: "Children",
        parrafos: ["Escenia is made for businesses and creators. It isn't directed to children under 13."],
      },
      {
        titulo: "Changes and contact",
        parrafos: [
          "If we change this policy, we'll update this page and the date at the top.",
          `Questions? ${CONTACTO}.`,
        ],
      },
    ] satisfies Seccion[],
  },
  es: {
    titulo: "Política de privacidad de Escenia",
    actualizado:
      "Última actualización: 1 de noviembre de 2026 · Traducción de cortesía: rige la versión en inglés.",
    intro:
      "Escenia es una app de estudio de video hecha por Windoce LLC. Conversas con nuestro Director de IA, agregas tus fotos y videos, y apruebas anuncios cortos en vertical para redes sociales. Esta política explica qué recogemos, para qué y qué opciones tienes.",
    secciones: [
      {
        titulo: "Qué recogemos",
        parrafos: [
          "Acceso a la cuenta. Escenia no tiene registro público: Windoce crea las cuentas de sus clientes. Para que no tengas que entrar cada vez, la app guarda en tu teléfono una llave de sesión segura. Tu contraseña nunca se guarda en el teléfono.",
          "Lo que nos das. Los mensajes que le escribes al Director, las fotos y videos que subes y los videos que hacemos para ti.",
          "Datos técnicos. Registros básicos del servidor (dirección IP y hora de cada pedido) que usamos por seguridad, por ejemplo para frenar intentos repetidos con una contraseña equivocada.",
          "No recogemos tu ubicación, tus contactos ni identificadores de publicidad.",
        ],
      },
      {
        titulo: "Para qué lo usamos",
        parrafos: [
          "Solo para hacer tus videos: entender lo que pides, elegir tus fotos, crear la voz y la presentadora, armar el video y entregártelo.",
          "No vendemos tus datos, no los usamos para publicidad y no te seguimos por apps o sitios de otras empresas.",
        ],
      },
      {
        titulo: "Proveedores de servicio",
        parrafos: [
          "Para dar el servicio trabajamos con proveedores de confianza de textos con IA, creación de voz, animación de la presentadora y almacenamiento en la nube. Procesan tu contenido solo para hacer esas tareas por nosotros.",
        ],
      },
      {
        titulo: "Fotos, cámara y guardar videos",
        parrafos: [
          "La app pide acceso a tus fotos o a la cámara solo cuando eliges agregar una foto o un video, y pide guardar en tus Fotos solo cuando tocas Guardar en un video terminado. Puedes cambiar estos permisos cuando quieras en los Ajustes de tu iPhone.",
        ],
      },
      {
        titulo: "Cuánto tiempo lo guardamos",
        parrafos: [
          "Tus proyectos y sus archivos se quedan en tu cuenta hasta que nos pidas borrarlos. Archivar un proyecto solo lo quita de tu lista. Los registros del servidor se guardan poco tiempo, por seguridad.",
        ],
      },
      {
        titulo: "Borrar tus datos",
        parrafos: [
          "Escríbenos a soporte+escenia@windoce.com desde el correo de tu cuenta y borramos tus proyectos, tus archivos y tus videos en un plazo de 30 días.",
        ],
      },
      {
        titulo: "Menores",
        parrafos: ["Escenia está hecha para negocios y creadores. No está dirigida a menores de 13 años."],
      },
      {
        titulo: "Cambios y contacto",
        parrafos: [
          "Si cambiamos esta política, actualizamos esta página y la fecha de arriba.",
          `¿Preguntas? ${CONTACTO}.`,
        ],
      },
    ] satisfies Seccion[],
  },
};

export const SOPORTE = {
  en: {
    titulo: "Escenia Support",
    actualizado: "We usually reply within one business day.",
    intro:
      "Need help with Escenia? Open a support case below and our team will reply in a private conversation, or write to soporte+escenia@windoce.com. If it's about a specific video, include the project name you see in the app.",
    secciones: [
      {
        titulo: "How Escenia works",
        parrafos: [
          "1. Sign in with the password Windoce gave you.",
          "2. Tap New project and tell the Director what you want to sell, who it's for, and how people buy from you.",
          "3. Add your photos or your video. The Director looks at them and writes the ad.",
          "4. You get a card with the price, the script, the voice, and the presenter. Nothing is charged until you tap Approve.",
          "5. In a few minutes the finished video appears on the same card. Save it to your Photos or share it.",
        ],
      },
      {
        titulo: "Common questions",
        parrafos: [
          "How much does a video cost? Each card shows its price before you approve it. Ads with a talking presenter cost more than ads with photos only.",
          "Can I change the script? Yes. Tap Change something and say what you want in your own words. A new card replaces the old one.",
          "Can I use my own presenter or my own voice? Ask the Director, or write to us and our team will set it up.",
          "How do I delete my data? Email soporte+escenia@windoce.com from the address linked to your account. See our privacy policy.",
        ],
      },
    ] satisfies Seccion[],
  },
  es: {
    titulo: "Soporte de Escenia",
    actualizado: "Solemos responder en un día hábil.",
    intro:
      "¿Necesitas ayuda con Escenia? Abre un caso de soporte aquí abajo y nuestro equipo te responde en una conversación privada, o escríbenos a soporte+escenia@windoce.com. Si es sobre un video en particular, incluye el nombre del proyecto que ves en la app.",
    secciones: [
      {
        titulo: "Cómo funciona Escenia",
        parrafos: [
          "1. Entra con la contraseña que te dio Windoce.",
          "2. Toca Proyecto nuevo y cuéntale al Director qué quieres vender, a quién y cómo te compran.",
          "3. Agrega tus fotos o tu video. El Director los mira y escribe el anuncio.",
          "4. Te llega una tarjeta con el precio, el texto, la voz y la presentadora. No se cobra nada hasta que tocas Aprobar.",
          "5. En unos minutos el video terminado aparece en la misma tarjeta. Guárdalo en tus Fotos o compártelo.",
        ],
      },
      {
        titulo: "Preguntas frecuentes",
        parrafos: [
          "¿Cuánto cuesta un video? Cada tarjeta muestra su precio antes de aprobarla. Los anuncios con una presentadora que habla cuestan más que los que llevan solo fotos.",
          "¿Puedo cambiar el texto? Sí. Toca Cambiar algo y dilo con tus palabras. La tarjeta nueva reemplaza la anterior.",
          "¿Puedo usar mi propia presentadora o mi voz? Pídeselo al Director o escríbenos y nuestro equipo lo prepara.",
          "¿Cómo borro mis datos? Escribe a soporte+escenia@windoce.com desde el correo de tu cuenta. Mira nuestra política de privacidad.",
        ],
      },
    ] satisfies Seccion[],
  },
};
