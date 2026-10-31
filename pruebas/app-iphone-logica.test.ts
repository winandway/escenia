// La app de iPhone por dentro (docs/APP-IPHONE.md, C-APP-IOS-2): la parte pura de movil/ y los candados
// de su configuración. Las trampas que ya costaron horas en otras apps quedan fijadas aquí.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  dinero as dineroPanel,
  notaDeFotos as fotosPanel,
  notaDeVideos as videosPanel,
} from "@/lib/director-prompt";
import {
  dinero,
  extensionDeFoto,
  llaveDelBorrador,
  mensajeConNotas,
  nombreDeArchivo,
  notaDeFotos,
  notaDeVideos,
  nombreDePersona,
  nombreDeVoz,
  tituloDelProyecto,
  trozos,
} from "../movil/src/logica";
import { TEXTOS } from "../movil/src/textos";

// Archivos fijos de la propia app (nunca una ruta que venga de afuera).
// eslint-disable-next-line security/detect-non-literal-fs-filename
const movil = (archivo: string) => readFileSync(path.resolve(__dirname, "../movil", archivo), "utf8");

describe("la app dice lo mismo que el panel (C-APP-IOS-2)", () => {
  it("las notas de lo subido son idénticas a las del chat del panel (el Director las entiende igual)", () => {
    for (const nombres of [[], ["a.jpg"], ["a.jpg", "b.png", "c.webp"]]) {
      expect(notaDeFotos(nombres, "Encargo 7")).toBe(fotosPanel(nombres, "Encargo 7"));
      expect(notaDeVideos(nombres)).toBe(videosPanel(nombres));
    }
    expect(mensajeConNotas("  Hola  ", ["a.jpg"], [], "Encargo 7")).toBe(
      `Hola\n\n${fotosPanel(["a.jpg"], "Encargo 7")}`,
    );
    expect(mensajeConNotas("", [], [], "Encargo 7")).toBe("");
  });

  it("el precio en español sale igual que en el panel, y en inglés con centavos cortos", () => {
    for (const usd of [0, 0.004, 0.01, 0.07, 0.5, 1, 2.345]) expect(dinero(usd, "es")).toBe(dineroPanel(usd));
    expect(dinero(0.07, "en")).toBe("7¢");
    expect(dinero(1.2, "en")).toBe("$1.20");
  });

  it("los trozos de una subida cubren el archivo entero sin huecos", () => {
    const lista = trozos(20_000_001, 8_388_608);
    expect(lista).toHaveLength(3);
    expect(lista.reduce((s, [, largo]) => s + largo, 0)).toBe(20_000_001);
    expect(lista[1]?.[0]).toBe(8_388_608);
    expect(trozos(0, 10)).toEqual([]);
  });

  it("los nombres de archivo salen limpios y las fotos raras se piden como JPG", () => {
    expect(nombreDeArchivo("/var/mobile/IMG_0001.HEIC", "foto", 1)).toBe("IMG_0001.HEIC");
    expect(nombreDeArchivo(null, "video", 3)).toBe("video-3.mov");
    expect(nombreDeArchivo("sin-extension", "foto", 2)).toBe("foto-2.jpg");
    expect(extensionDeFoto("IMG_0001.HEIC")).toBeNull();
    expect(extensionDeFoto("logo.PNG")).toBe("png");
  });

  it("el nombre por defecto del proyecto sale en el idioma de la app; el que puso el Director, tal cual", () => {
    expect(tituloDelProyecto("Encargo 7", "en")).toBe("Project 7");
    expect(tituloDelProyecto("Encargo 7", "es")).toBe("Proyecto 7");
    expect(tituloDelProyecto("Coffee Shop · bread", "es")).toBe("Coffee Shop · bread");
  });

  it("la tarjeta no muestra nombres internos: la voz y Maggie salen como los entiende el público", () => {
    expect(nombreDeVoz("femenina", "en")).toBe("Female voice");
    expect(nombreDeVoz("venezolana", "es")).toBe("Voz de mujer latina");
    expect(nombreDePersona("maggie-blusa-presenta")).toBe("Maggie");
    expect(nombreDePersona("asesora_frente-logo")).toBe("Asesora frente logo");
  });

  it("el borrador es de su cuenta y de su formulario", () => {
    expect(llaveDelBorrador("chat-5", "richard")).not.toBe(llaveDelBorrador("chat-5", "demo"));
    expect(llaveDelBorrador("chat-5", "richard")).not.toBe(llaveDelBorrador("chat-6", "richard"));
  });
});

describe("los dos idiomas y las reglas de la pantalla (C-APP-IOS-2)", () => {
  it("inglés y español tienen las mismas llaves, ninguna vacía", () => {
    expect(Object.keys(TEXTOS.es).sort()).toEqual(Object.keys(TEXTOS.en).sort());
    for (const [llave, texto] of [...Object.entries(TEXTOS.en), ...Object.entries(TEXTOS.es)])
      expect(texto.trim(), llave).not.toBe("");
    // Ningún texto en inglés quedó en español (pasó una vez con «chat_vacio»).
    for (const [llave, texto] of Object.entries(TEXTOS.en))
      expect(texto, llave).not.toMatch(/\b(escribe|sube|primero|contraseña|proyecto|aprobar)\b/i);
  });

  it("el selector es el de Amazon: España para el español, EE. UU. para el inglés, nunca México", () => {
    const selector = movil("src/SelectorIdioma.tsx");
    expect(selector).toContain('{ codigo: "es", bandera: "🇪🇸", nombre: "español" }');
    expect(selector).toContain('{ codigo: "en", bandera: "🇺🇸", nombre: "English" }');
    expect(selector).not.toMatch(/🇲🇽|🇨🇴|🇻🇪|🇦🇷/u);
    expect(selector).toContain("Change language");
    expect(selector).toContain("<Modal");
  });

  it("la contraseña lleva su ojito, arranca oculta y nunca pasa por el borrador", () => {
    const campo = movil("src/CampoClave.tsx");
    expect(campo).toContain("secureTextEntry={!visible}");
    expect(campo).toContain("useState(false)");
    expect(movil("app/entrar.tsx")).not.toContain("useBorrador");
  });

  it("archivar y cerrar sesión van dentro del menú de tres puntos", () => {
    const lista = movil("app/proyectos.tsx");
    expect(lista).toContain('menuDeTresPuntos([t("proyectos_archivar")]');
    expect(lista).toContain('menuDeTresPuntos([t("proyectos_salir")]');
  });
});

describe("la configuración que exige Apple (C-APP-IOS-2)", () => {
  const app = JSON.parse(movil("app.json")) as {
    expo: {
      ios: { bundleIdentifier: string; infoPlist: Record<string, unknown> };
      plugins: (string | [string, Record<string, unknown>])[];
    };
  };

  it("todos los textos de permiso están, y ningún plugin los borra con un «false» (error 90683)", () => {
    const plist = app.expo.ios.infoPlist;
    for (const llave of [
      "NSPhotoLibraryUsageDescription",
      "NSPhotoLibraryAddUsageDescription",
      "NSCameraUsageDescription",
      "NSMicrophoneUsageDescription",
    ])
      expect(String(plist[llave] ?? ""), llave).toMatch(/^Escenia .{20,}/);
    expect(plist.ITSAppUsesNonExemptEncryption).toBe(false);
    for (const plugin of app.expo.plugins) {
      if (!Array.isArray(plugin)) continue;
      for (const [k, v] of Object.entries(plugin[1]))
        if (/Permission$/.test(k) && k !== "faceIDPermission") expect(v, `${plugin[0]}.${k}`).not.toBe(false);
    }
  });

  it("los avisos van firmados para producción (TestFlight y la tienda usan los avisos de producción)", () => {
    const avisos = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-notifications");
    expect(avisos).toEqual(["expo-notifications", { mode: "production" }]);
  });

  it("es la app de Escenia en la cuenta de Windoce, y la llave de Apple no vive en eas.json", () => {
    expect(app.expo.ios.bundleIdentifier).toBe("com.windoce.escenia");
    const eas = movil("eas.json");
    expect(eas).toContain('"ascAppId": "6829275493"');
    expect(eas).not.toMatch(/ascApiKey|AuthKey|\.p8/);
  });
});

describe("la app arranca con escenas, como exige iOS 27 (C-APP-IOS-3)", () => {
  // La plantilla de AppDelegate de Expo 57, tal cual la genera «expo prebuild».
  const PLANTILLA = `class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`;

  it("el complemento está en la configuración (sin él la app se cerraba al abrir en el simulador con iOS 27)", () => {
    const app = JSON.parse(movil("app.json")) as { expo: { plugins: unknown[] } };
    expect(app.expo.plugins).toContain("./plugins/escenas-ios");
  });

  it("declara la escena y le quita la ventana al AppDelegate", async () => {
    // La parte pura del complemento (sin Expo): así corre también en GitHub, sin movil/node_modules.
    const plugin = (await import("../movil/plugins/escenas-ios-texto.js")) as unknown as {
      default: { conEscenas: (c: string) => string; MANIFIESTO: Record<string, unknown> };
    };
    const nuevo = plugin.default.conEscenas(PLANTILLA);
    expect(nuevo).toContain("class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {");
    expect(nuevo).not.toContain("UIWindow(frame:");
    expect(JSON.stringify(plugin.default.MANIFIESTO)).toContain("$(PRODUCT_MODULE_NAME).SceneDelegate");
  });
});
