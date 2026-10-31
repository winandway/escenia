// TestFlight de Escenia (docs/PUBLICAR-EN-APPLE.md). Con la última compilación VÁLIDA:
// 1. El grupo INTERNO (sin revisión de Apple): Richard (go@windoce.com, el titular de la cuenta) la puede
//    instalar en minutos desde la app TestFlight, si su iPhone usa ese mismo Apple ID.
// 2. El grupo EXTERNO «Prueba pública» con enlace abierto (hasta 1000 personas): pasa por la revisión de
//    prueba de Apple (suele tardar menos de un día). Sirve para cualquier iPhone y cualquier Apple ID.
// Usa los datos del revisor de la ficha de la App Store. Uso (desde la raíz): node scripts/tiendas/testflight.mjs
import { asc } from "./asc.mjs";

const APP_ID = "6829275493";
const QUE_PROBAR =
  "Sign in, tap New project and tell the Director what you sell (try: an ad with Maggie for a coffee shop, people order on WhatsApp). Add photos or a video, read the card with its price, and approve it. The finished video appears on the same card: play it, save it to Photos or share it.";

const build = (
  await asc(
    "GET",
    `/v1/builds?filter[app]=${APP_ID}&filter[processingState]=VALID&filter[expired]=false&sort=-uploadedDate&limit=1`,
  )
).data[0];
if (!build) {
  console.log(
    "Todavía no hay una compilación válida: Apple la está procesando. Vuelve a correr esto en unos minutos.",
  );
  process.exit(0);
}

// Qué probar (en la API se llama whatsNew).
const bl = (await asc("GET", `/v1/builds/${build.id}/betaBuildLocalizations`)).data;
const en = bl.find((l) => l.attributes.locale === "en-US");
if (en)
  await asc("PATCH", `/v1/betaBuildLocalizations/${en.id}`, {
    data: { type: "betaBuildLocalizations", id: en.id, attributes: { whatsNew: QUE_PROBAR } },
  });
else
  await asc("POST", "/v1/betaBuildLocalizations", {
    data: {
      type: "betaBuildLocalizations",
      attributes: { locale: "en-US", whatsNew: QUE_PROBAR },
      relationships: { build: { data: { type: "builds", id: build.id } } },
    },
  });

// 1. Interno: el grupo que ve todas las compilaciones, con Richard adentro.
const grupos = (await asc("GET", `/v1/apps/${APP_ID}/betaGroups`)).data;
const interno = grupos.find((g) => g.attributes.isInternalGroup);
if (interno) {
  const ya = (await asc("GET", `/v1/betaGroups/${interno.id}/betaTesters`)).data;
  if (!ya.some((t) => t.attributes.email === "go@windoce.com"))
    await asc("POST", "/v1/betaTesters", {
      data: {
        type: "betaTesters",
        attributes: { email: "go@windoce.com", firstName: "Richard", lastName: "Windoce" },
        relationships: { betaGroups: { data: [{ type: "betaGroups", id: interno.id }] } },
      },
    }).catch((e) => console.log(`interno: no se pudo agregar a go@windoce.com (${e.message})`));
}

// 2. Externo con enlace público: descripción, contacto y cuenta del revisor, y la revisión de prueba.
const [version] = (await asc("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS`)).data;
const revision = (await asc("GET", `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data
  .attributes;
const detalle = (await asc("GET", `/v1/apps/${APP_ID}/betaAppReviewDetail`)).data;
await asc("PATCH", `/v1/betaAppReviewDetails/${detalle.id}`, {
  data: {
    type: "betaAppReviewDetails",
    id: detalle.id,
    attributes: {
      contactFirstName: revision.contactFirstName,
      contactLastName: revision.contactLastName,
      contactPhone: revision.contactPhone,
      contactEmail: revision.contactEmail,
      demoAccountName: revision.demoAccountName,
      demoAccountPassword: revision.demoAccountPassword,
      demoAccountRequired: true,
      notes: revision.notes,
    },
  },
});
const locs = (await asc("GET", `/v1/apps/${APP_ID}/betaAppLocalizations`)).data;
const datosPrueba = {
  feedbackEmail: "go@windoce.com",
  description:
    "Escenia turns a short chat with an AI Director into a vertical video ad with a talking presenter.",
  marketingUrl: "https://escenia.sitios.dev/support",
  privacyPolicyUrl: "https://escenia.sitios.dev/privacy",
};
const locEn = locs.find((l) => l.attributes.locale === "en-US");
if (locEn)
  await asc("PATCH", `/v1/betaAppLocalizations/${locEn.id}`, {
    data: { type: "betaAppLocalizations", id: locEn.id, attributes: datosPrueba },
  });
else
  await asc("POST", "/v1/betaAppLocalizations", {
    data: {
      type: "betaAppLocalizations",
      attributes: { locale: "en-US", ...datosPrueba },
      relationships: { app: { data: { type: "apps", id: APP_ID } } },
    },
  });
const publico =
  grupos.find((g) => g.attributes.name === "Prueba pública") ??
  (
    await asc("POST", "/v1/betaGroups", {
      data: {
        type: "betaGroups",
        attributes: {
          name: "Prueba pública",
          publicLinkEnabled: true,
          publicLinkLimitEnabled: true,
          publicLinkLimit: 1000,
          feedbackEnabled: true,
        },
        relationships: { app: { data: { type: "apps", id: APP_ID } } },
      },
    })
  ).data;
await asc("POST", `/v1/betaGroups/${publico.id}/relationships/builds`, {
  data: [{ type: "builds", id: build.id }],
});
try {
  await asc("POST", "/v1/betaAppReviewSubmissions", {
    data: {
      type: "betaAppReviewSubmissions",
      relationships: { build: { data: { type: "builds", id: build.id } } },
    },
  });
} catch (e) {
  // Ya pedida (409), otra en revisión de prueba o ya revisada: se sigue.
  if (!/409|ANOTHER_BUILD_IN_REVIEW|INVALID_QC_STATE/.test(String(e))) throw e;
}
const g = (await asc("GET", `/v1/betaGroups/${publico.id}`)).data.attributes;
console.log(`Compilación ${build.attributes.version}: grupo interno listo y revisión de prueba pedida.`);
console.log(`Enlace público de TestFlight: ${g.publicLink}`);
