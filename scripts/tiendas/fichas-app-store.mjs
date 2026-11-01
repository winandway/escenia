// La ficha de Escenia en la App Store (docs/PUBLICAR-EN-APPLE.md): categoría, nombre y subtítulo, enlaces
// legales, clasificación por edad, copyright, descripción, palabras clave, soporte, datos del revisor
// (con la cuenta de demostración guardada en ~/.config/motor-escenia/revisor-apple), precio gratis y
// todos los territorios. Inglés de EE. UU. (el principal) y español de México.
// Uso (desde la raíz): node scripts/tiendas/fichas-app-store.mjs
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { asc } from "./asc.mjs";

const APP_ID = "6829275493";
const PANEL = "https://escenia.sitios.dev";
const REVISOR = fs
  .readFileSync(join(os.homedir(), ".config", "motor-escenia", "revisor-apple"), "utf8")
  .trim();

const TEXTOS = {
  "en-US": {
    name: "Escenia: AI Video Ads",
    subtitle: "Ads with a talking presenter",
    privacidad: `${PANEL}/privacy`,
    soporte: `${PANEL}/support`,
    promocion:
      "Tell the Director what you sell. Get a vertical video ad with a talking presenter, ready for Reels, TikTok and Shorts.",
    palabras: "video ads,reels,tiktok,shorts,ai video,presenter,avatar,marketing,small business,ugc",
    descripcion: [
      "Escenia turns a short chat into a vertical video ad that sells.",
      "",
      "Tell the Director what you sell, who it's for, and how people buy from you. Add a few photos of your product, or a video of it in action. The Director writes the script, picks your best photos, and has Maggie, our presenter, say it for you on camera.",
      "",
      "HOW IT WORKS",
      "• Open a project and tell the Director about your product, in your own words.",
      "• Add photos or a video from your phone, or take them right there.",
      "• Get a card with the price, the full script, the voice and the presenter, before anything is charged.",
      "• Approve it, or tap Change something and ask for changes in plain language.",
      "• In a few minutes the finished video appears on the same card. Save it to Photos or share it.",
      "",
      "WHAT YOU CAN MAKE",
      "• Ads with a talking presenter and your product photos.",
      "• Live demos: your own video, uncut, with each sentence timed to what happens on screen.",
      "• Voice-overs: a calm narration with soft piano over a video you already edited.",
      "",
      "MADE FOR BUSINESSES AND CREATORS",
      "Shops, restaurants, services, apps and personal brands that need fresh video every week, without filming or editing.",
      "",
      "Accounts are created by Windoce for its clients. Questions? soporte+escenia@windoce.com",
    ].join("\n"),
    novedades: "First version: the Director, ads with Maggie, live demos and voice-overs.",
  },
  "es-MX": {
    name: "Escenia: anuncios en video",
    subtitle: "Anuncios con una presentadora",
    privacidad: `${PANEL}/es/privacy`,
    soporte: `${PANEL}/es/support`,
    promocion:
      "Cuéntale al Director qué vendes y recibe un anuncio vertical con una presentadora que habla, listo para Reels, TikTok y Shorts.",
    palabras: "anuncios,video,reels,tiktok,shorts,ia,presentadora,avatar,marketing,negocio,publicidad",
    descripcion: [
      "Escenia convierte una conversación corta en un anuncio en video vertical que vende.",
      "",
      "Cuéntale al Director qué vendes, a quién y cómo te compran. Agrega unas fotos de tu producto o un video de cómo funciona. El Director escribe el texto, elige tus mejores fotos y Maggie, nuestra presentadora, lo dice por ti a cámara.",
      "",
      "CÓMO FUNCIONA",
      "• Abre un proyecto y cuéntale al Director sobre tu producto, con tus palabras.",
      "• Agrega fotos o un video desde tu teléfono, o tómalos ahí mismo.",
      "• Recibe una tarjeta con el precio, el texto completo, la voz y la presentadora, antes de que se cobre nada.",
      "• Apruébala, o toca Cambiar algo y pide los cambios con palabras normales.",
      "• En unos minutos el video terminado aparece en la misma tarjeta. Guárdalo en Fotos o compártelo.",
      "",
      "LO QUE PUEDES HACER",
      "• Anuncios con una presentadora que habla y las fotos de tu producto.",
      "• Pruebas en vivo: tu propio video, sin cortes, con cada frase a la hora de lo que pasa en pantalla.",
      "• Locuciones: una voz tranquila con piano suave sobre un video que ya editaste.",
      "",
      "HECHO PARA NEGOCIOS Y CREADORES",
      "Tiendas, restaurantes, servicios, apps y marcas personales que necesitan video nuevo cada semana, sin grabar ni editar.",
      "",
      "Las cuentas las crea Windoce para sus clientes. ¿Preguntas? soporte+escenia@windoce.com",
    ].join("\n"),
    novedades: "Primera versión: el Director, anuncios con Maggie, pruebas en vivo y locuciones.",
  },
};

async function crearOActualizar(lista, locale, tipo, padre, attrs) {
  const ya = lista.find((l) => l.attributes.locale === locale);
  if (ya) return asc("PATCH", `/v1/${tipo}/${ya.id}`, { data: { type: tipo, id: ya.id, attributes: attrs } });
  return asc("POST", `/v1/${tipo}`, {
    data: { type: tipo, attributes: { locale, ...attrs }, relationships: padre },
  });
}

const [info] = (await asc("GET", `/v1/apps/${APP_ID}/appInfos`)).data;
await asc("PATCH", `/v1/appInfos/${info.id}`, {
  data: {
    type: "appInfos",
    id: info.id,
    relationships: {
      primaryCategory: { data: { type: "appCategories", id: "PHOTO_AND_VIDEO" } },
      secondaryCategory: { data: { type: "appCategories", id: "BUSINESS" } },
    },
  },
});
const infoLocs = (await asc("GET", `/v1/appInfos/${info.id}/appInfoLocalizations`)).data;
for (const [locale, t] of Object.entries(TEXTOS))
  await crearOActualizar(
    infoLocs,
    locale,
    "appInfoLocalizations",
    { appInfo: { data: { type: "appInfos", id: info.id } } },
    { name: t.name, subtitle: t.subtitle, privacyPolicyUrl: t.privacidad },
  );

// Clasificación por edad: sin contenido sensible. Hay chat con una IA (el Director) y lo que sube cada
// cliente se queda en su cuenta (nadie más lo ve): ni chat entre personas ni contenido público.
const edad = (await asc("GET", `/v1/appInfos/${info.id}/ageRatingDeclaration`)).data;
const BOOLEANOS = new Set([
  "advertising",
  "gambling",
  "lootBox",
  "healthOrWellnessTopics",
  "messagingAndChat",
  "parentalControls",
  "ageAssurance",
  "socialMedia",
  "socialMediaAgeRestricted",
  "unrestrictedWebAccess",
  "userGeneratedContent",
]);
const OMITIR = new Set(["kidsAgeBand", "gracRatingClassificationNumber", "developerAgeRatingInfoUrl"]);
const respuestas = Object.fromEntries(
  Object.keys(edad.attributes)
    .filter((k) => !OMITIR.has(k) && !k.startsWith("ageRatingOverride") && k !== "koreaAgeRatingOverride")
    .map((k) => [k, BOOLEANOS.has(k) ? false : "NONE"]),
);
await asc("PATCH", `/v1/ageRatingDeclarations/${edad.id}`, {
  data: { type: "ageRatingDeclarations", id: edad.id, attributes: respuestas },
});

// La versión: copyright y textos por idioma.
const [version] = (await asc("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS`)).data;
await asc("PATCH", `/v1/appStoreVersions/${version.id}`, {
  data: { type: "appStoreVersions", id: version.id, attributes: { copyright: "2026 Windoce LLC" } },
});
const verLocs = (await asc("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
for (const [locale, t] of Object.entries(TEXTOS))
  await crearOActualizar(
    verLocs,
    locale,
    "appStoreVersionLocalizations",
    { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } },
    {
      description: t.descripcion.slice(0, 4000),
      promotionalText: t.promocion.slice(0, 170),
      keywords: t.palabras.slice(0, 100),
      supportUrl: t.soporte,
      marketingUrl: `${PANEL}/support`,
    },
  );

// Datos para el revisor de Apple: el contacto (nombre jurídico, lo exige Apple) y la cuenta de demostración.
const revision = {
  contactFirstName: "Pedro",
  contactLastName: "Llerena",
  contactEmail: "go@windoce.com",
  contactPhone: "+1 408 415 1033",
  demoAccountName: "No username: the app asks only for a password",
  demoAccountPassword: REVISOR,
  demoAccountRequired: true,
  notes: [
    "Escenia makes vertical video ads. A business chats with our AI Director, adds photos or a video, and approves a card with the price; our studio then renders the video.",
    "Sign-in: the app only asks for a password. Use the demo password above.",
    "The demo account is safe to explore: tap New project, write what you want to sell (for example: an ad with Maggie for a coffee shop, people order on WhatsApp), and the Director replies with a card. Approving on the demo account never charges anything and shows a finished sample video, which you can play, save to Photos or share.",
    "Escenia is a business-to-business production service: Windoce LLC's studio produces each video for its business clients under a service agreement. Accounts are created by Windoce; there is no public sign-up. The price on each card is the client's production cost, invoiced by Windoce outside the app; the app has no payment screen and sells nothing to consumers.",
    "Support: soporte+escenia@windoce.com",
  ].join("\n\n"),
};
const det = await asc("GET", `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`).catch(() => null);
if (det?.data)
  await asc("PATCH", `/v1/appStoreReviewDetails/${det.data.id}`, {
    data: { type: "appStoreReviewDetails", id: det.data.id, attributes: revision },
  });
else
  await asc("POST", "/v1/appStoreReviewDetails", {
    data: {
      type: "appStoreReviewDetails",
      attributes: revision,
      relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } },
    },
  });

// Derechos de contenido: la app no muestra contenido de terceros que requiera derechos.
await asc("PATCH", `/v1/apps/${APP_ID}`, {
  data: {
    type: "apps",
    id: APP_ID,
    attributes: { contentRightsDeclaration: "DOES_NOT_USE_THIRD_PARTY_CONTENT" },
  },
});
console.log(
  "Ficha cargada: categoría, nombre y subtítulo, edad, copyright, textos (en-US y es-MX), revisor y derechos.",
);
