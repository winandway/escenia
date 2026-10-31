// Enviar Escenia a la revisión de Apple (docs/PUBLICAR-EN-APPLE.md): adjunta a la versión la última
// compilación VÁLIDA (o la que se pase: «node … 4»), crea la entrega de revisión y la envía. La versión
// queda en WAITING_FOR_REVIEW. Si ya está en revisión, no la manda otra vez.
// Uso (desde la raíz): node scripts/tiendas/enviar-revision-ios.mjs [número de compilación]
import { asc } from "./asc.mjs";

const APP_ID = "6829275493";
const numero = process.argv[2];

const [version] = (await asc("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS`)).data;
const estado = version.attributes.appStoreState;
if (!["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED"].includes(estado)) {
  console.log(`La versión ya está en «${estado}»: no se envía otra vez.`);
  process.exit(0);
}
const filtro = numero ? `&filter[version]=${numero}` : "";
const build = (
  await asc(
    "GET",
    `/v1/builds?filter[app]=${APP_ID}&filter[processingState]=VALID&filter[expired]=false${filtro}&sort=-uploadedDate&limit=1`,
  )
).data[0];
if (!build) {
  console.log(
    "No hay una compilación válida para adjuntar: corre estado-ios.mjs y espera a que Apple la procese.",
  );
  process.exit(1);
}
await asc("PATCH", `/v1/appStoreVersions/${version.id}/relationships/build`, {
  data: { type: "builds", id: build.id },
});
// Una entrega abierta se reutiliza para no dejar borradores sueltos.
const abiertas = (
  await asc(
    "GET",
    `/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW`,
  )
).data;
const entrega =
  abiertas[0] ??
  (
    await asc("POST", "/v1/reviewSubmissions", {
      data: {
        type: "reviewSubmissions",
        attributes: { platform: "IOS" },
        relationships: { app: { data: { type: "apps", id: APP_ID } } },
      },
    })
  ).data;
const items = (await asc("GET", `/v1/reviewSubmissions/${entrega.id}/items`)).data;
if (!items.length)
  await asc("POST", "/v1/reviewSubmissionItems", {
    data: {
      type: "reviewSubmissionItems",
      relationships: {
        reviewSubmission: { data: { type: "reviewSubmissions", id: entrega.id } },
        appStoreVersion: { data: { type: "appStoreVersions", id: version.id } },
      },
    },
  });
await asc("PATCH", `/v1/reviewSubmissions/${entrega.id}`, {
  data: { type: "reviewSubmissions", id: entrega.id, attributes: { submitted: true } },
});
const ahora = (await asc("GET", `/v1/appStoreVersions/${version.id}`)).data.attributes.appStoreState;
console.log(
  `Enviada a revisión: versión ${version.attributes.versionString}, compilación ${build.attributes.version}. Estado: ${ahora}.`,
);
