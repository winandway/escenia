// Compila la app de iPhone EN LA MAC y la envía a App Store Connect, sin gastar compilaciones de Expo
// (docs/PUBLICAR-EN-APPLE.md). Pasos: baja de Expo el certificado y el perfil de la App Store de esta app,
// los pone en un llavero aparte (con su propia contraseña: la firma no pide nada en pantalla), regenera
// el proyecto nativo, pone el número de compilación siguiente al último de Apple, compila, exporta el IPA
// y lo envía con «eas submit» (enviar no gasta). Al final deja la lista de llaveros como estaba.
// Uso (desde la raíz): node scripts/tiendas/compilar-ios-mac.mjs
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { asc, CARPETA_LLAVE, leerLlave } from "./asc.mjs";

const APP_ID = "6829275493";
const RAIZ = process.cwd();
const MOVIL = join(RAIZ, "movil");
const TRABAJO = fs.mkdtempSync(join(os.tmpdir(), "escenia-ios-"));
const EXPO_TOKEN = fs
  .readFileSync(join(os.homedir(), ".config", "motor-escenia", "expo-token"), "utf8")
  .trim();
const correr = (cmd, args, opciones = {}) =>
  execFileSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    ...opciones,
  });
const leer = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

// 1. El certificado y el perfil que Expo guarda para esta app.
const consulta = `query { app { byFullName(fullName: "@windoce-llc/escenia") { iosAppCredentials { iosAppBuildCredentialsList { iosDistributionType distributionCertificate { serialNumber certificateP12 certificatePassword } } } } } }`;
const r = await fetch("https://api.expo.dev/graphql", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${EXPO_TOKEN}` },
  body: JSON.stringify({ query: consulta }),
});
const datos = await r.json();
if (datos.errors) throw new Error(`Expo: ${JSON.stringify(datos.errors).slice(0, 300)}`);
const cred = datos.data.app.byFullName.iosAppCredentials
  .flatMap((c) => c.iosAppBuildCredentialsList)
  .find((b) => b.iosDistributionType === "APP_STORE");
fs.writeFileSync(
  join(TRABAJO, "dist.p12"),
  Buffer.from(cred.distributionCertificate.certificateP12, "base64"),
  { mode: 0o600 },
);
// El perfil de la App Store con ese certificado lo crea este guion por la API (el de Expo se hizo antes
// de habilitar los avisos y no los trae: la firma fallaría). Se reutiliza mientras siga activo.
const NOMBRE_PERFIL = "Escenia App Store (avisos)";
const cert = (await asc("GET", "/v1/certificates?limit=50")).data.find(
  (c) => c.attributes.serialNumber === cred.distributionCertificate.serialNumber,
);
if (!cert) throw new Error("El certificado de Expo no aparece en la cuenta de Apple.");
const yaHay = (await asc("GET", `/v1/profiles?filter[name]=${encodeURIComponent(NOMBRE_PERFIL)}`)).data.find(
  (p) => p.attributes.profileState === "ACTIVE",
);
const perfil =
  yaHay ??
  (
    await asc("POST", "/v1/profiles", {
      data: {
        type: "profiles",
        attributes: { name: NOMBRE_PERFIL, profileType: "IOS_APP_STORE" },
        relationships: {
          bundleId: { data: { type: "bundleIds", id: "6DGG7K5SLY" } },
          certificates: { data: [{ type: "certificates", id: cert.id }] },
        },
      },
    })
  ).data;
const uuid = perfil.attributes.uuid;
const nombrePerfil = perfil.attributes.name;
fs.writeFileSync(
  join(os.homedir(), "Library", "MobileDevice", "Provisioning Profiles", `${uuid}.mobileprovision`),
  Buffer.from(perfil.attributes.profileContent, "base64"),
);

// 2. Un llavero aparte con su propia contraseña.
const llavero = join(TRABAJO, "escenia-firma.keychain-db");
const claveLlavero = crypto.randomBytes(16).toString("hex");
const originales = leer("security", ["list-keychains", "-d", "user"])
  .split("\n")
  .map((l) => l.trim().replace(/"/g, ""));
correr("security", ["create-keychain", "-p", claveLlavero, llavero]);
correr("security", ["set-keychain-settings", "-lut", "7200", llavero]);
correr("security", ["unlock-keychain", "-p", claveLlavero, llavero]);
correr(
  "security",
  [
    "import",
    join(TRABAJO, "dist.p12"),
    "-k",
    llavero,
    "-P",
    cred.distributionCertificate.certificatePassword,
    "-T",
    "/usr/bin/codesign",
    "-T",
    "/usr/bin/security",
  ],
  { stdio: "ignore" },
);
correr(
  "security",
  ["set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", claveLlavero, llavero],
  { stdio: "ignore" },
);
correr("security", ["list-keychains", "-d", "user", "-s", llavero, ...originales]);
const identidad = /\b([0-9A-F]{40})\b/.exec(
  leer("security", ["find-identity", "-v", "-p", "codesigning", llavero]),
)?.[1];

try {
  // 3. El proyecto nativo (con el complemento de escenas) y el número de compilación siguiente.
  correr("npx", ["expo", "prebuild", "--platform", "ios", "--clean"], { cwd: MOVIL });
  const ultimas = (await asc("GET", `/v1/apps/${APP_ID}/buildUploads?limit=20`).catch(() => ({ data: [] })))
    .data;
  const numero = Math.max(0, ...ultimas.map((s) => Number(s.attributes.cfBundleVersion) || 0)) + 1;
  correr("/usr/libexec/PlistBuddy", [
    "-c",
    `Set :CFBundleVersion ${numero}`,
    join(MOVIL, "ios", "Escenia", "Info.plist"),
  ]);
  console.log(`\nCompilación ${numero}, firmada con el certificado de Expo (${identidad}).`);

  // 4. Compilar y exportar el IPA.
  const archivo = join(TRABAJO, "Escenia.xcarchive");
  correr(
    "xcodebuild",
    [
      "-workspace",
      "Escenia.xcworkspace",
      "-scheme",
      "Escenia",
      "-configuration",
      "Release",
      "-destination",
      "generic/platform=iOS",
      "-archivePath",
      archivo,
      "archive",
      "DEVELOPMENT_TEAM=7KM9P6R682",
      "CODE_SIGN_STYLE=Manual",
      `CODE_SIGN_IDENTITY=${identidad}`,
      `PROVISIONING_PROFILE_SPECIFIER=${nombrePerfil}`,
      `OTHER_CODE_SIGN_FLAGS=--keychain ${llavero}`,
      "-quiet",
    ],
    { cwd: join(MOVIL, "ios") },
  );
  const opciones = join(TRABAJO, "ExportOptions.plist");
  fs.writeFileSync(
    opciones,
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>destination</key><string>export</string><key>teamID</key><string>7KM9P6R682</string><key>signingStyle</key><string>manual</string><key>signingCertificate</key><string>${identidad}</string><key>provisioningProfiles</key><dict><key>com.windoce.escenia</key><string>${nombrePerfil}</string></dict><key>uploadSymbols</key><true/><key>manageAppVersionAndBuildNumber</key><false/></dict></plist>`,
  );
  const salida = join(TRABAJO, "exportado");
  correr("xcodebuild", [
    "-exportArchive",
    "-archivePath",
    archivo,
    "-exportOptionsPlist",
    opciones,
    "-exportPath",
    salida,
    "-quiet",
  ]);
  const ipa = join(
    salida,
    fs.readdirSync(salida).find((f) => f.endsWith(".ipa")),
  );

  // 5. Enviar con Expo: la llave en eas.json SOLO durante el envío.
  const ruta = join(MOVIL, "eas.json");
  const original = fs.readFileSync(ruta, "utf8");
  const config = JSON.parse(original);
  Object.assign(config.submit.production.ios, {
    ascApiKeyPath: join(CARPETA_LLAVE, "AuthKey.p8"),
    ascApiKeyIssuerId: leerLlave("issuer-id"),
    ascApiKeyId: leerLlave("key-id"),
  });
  try {
    fs.writeFileSync(ruta, JSON.stringify(config, null, 2));
    correr(
      "npx",
      [
        "eas-cli",
        "submit",
        "--platform",
        "ios",
        "--path",
        ipa,
        "--profile",
        "production",
        "--non-interactive",
      ],
      {
        cwd: MOVIL,
        env: { ...process.env, EXPO_TOKEN, EAS_NO_VCS: "1" },
      },
    );
  } finally {
    fs.writeFileSync(ruta, original);
  }
  console.log("\nEnviada. Comprueba que Apple la aceptó: node scripts/tiendas/estado-ios.mjs");
} finally {
  correr("security", ["list-keychains", "-d", "user", "-s", ...originales]);
  correr("security", ["delete-keychain", llavero], { stdio: "ignore" });
}
