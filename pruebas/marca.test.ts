import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canalDesde, CANALES, LISTA_CANALES } from "@compartido/canales";
import { PARTES } from "@compartido/guion";
import { marcaDeCanal, MARCAS } from "@compartido/marcas";
import { buscarTematica, NOMBRE_CANAL, TEMATICAS } from "@compartido/tematicas";
import {
  COLA_CON_MARCA_MS,
  COLA_CON_MUSICA_MS,
  COLA_FINAL_MS,
  duracionEnFrames,
  esquemaPropsVideo,
  FPS,
  framesDe,
} from "../estacion/src/remotion/props";

const raiz = path.resolve(__dirname, "..");

describe("el canal de tecnología es Full Código (C-MARCA-1)", () => {
  it("lleva su nombre y su @ aunque nadie los haya escrito en Ajustes", () => {
    expect(NOMBRE_CANAL["canal-ia"]).toBe("Full Código");
    expect(CANALES["canal-ia"].porDefecto).toEqual({ nombre: "Full Código", usuario: "@FullCodigo" });
  });

  it("el separador de canales solo acepta canales que existen", () => {
    expect(canalDesde("canal-ia")).toBe("canal-ia");
    expect(canalDesde("caprichoso-tv")).toBe("caprichoso-tv");
    expect(canalDesde("otro")).toBeNull();
    expect(canalDesde(undefined)).toBeNull();
    expect([...LISTA_CANALES].sort()).toEqual(Object.keys(NOMBRE_CANAL).sort());
  });

  it("tiene una temática de novedades de IA, activa y con partes válidas", () => {
    const t = buscarTematica("novedades-ia");
    expect(t?.canal).toBe("canal-ia");
    expect(t?.activa).toBe(true);
    expect(t?.plantilla).toBe("TechExplainer");
    for (const estructura of t?.estructuras ?? []) {
      expect(estructura[0]).toBe("gancho");
      expect(estructura).toContain("opinion");
      for (const parte of estructura) expect(PARTES).toContain(parte);
    }
    // Cada canal que se ofrece tiene al menos una temática activa para elegir.
    for (const c of LISTA_CANALES) expect(TEMATICAS.some((x) => x.canal === c && x.activa)).toBe(true);
  });
});

describe("la marca del canal sale en el video (C-MARCA-1)", () => {
  it("Full Código tiene marca; Caprichoso TV sale con el aspecto de siempre", () => {
    const marca = marcaDeCanal("canal-ia");
    expect(marca?.id).toBe("full-codigo");
    expect(marca?.acento).toMatch(/^#[0-9a-f]{6}$/);
    expect(marca?.secundario).toMatch(/^#[0-9a-f]{6}$/);
    expect(marca?.lema).toContain("sin rodeos");
    expect(marcaDeCanal("caprichoso-tv")).toBeNull();
    expect(marcaDeCanal(undefined)).toBeNull();
  });

  it("el logo de cada marca existe en la Estación", () => {
    expect(Object.keys(MARCAS)).toEqual(["full-codigo"]);
    expect(existsSync(path.join(raiz, "estacion/recursos/marcas/full-codigo/logo.png"))).toBe(true);
  });

  it("un video sin marca sigue valiendo y uno con marca la conserva", () => {
    const base = {
      titulo: "Prueba",
      audio: "voz.mp3",
      duracionMs: 1000,
      palabras: [],
      escenas: [],
      producto: null,
    };
    expect(esquemaPropsVideo.parse(base).marca).toBeNull();
    const marca = {
      id: "full-codigo",
      logo: "marca/logo.png",
      nombre: "Full Código",
      usuario: "@FullCodigo",
      acento: "#10f08c",
      secundario: "#8b5cf6",
    };
    expect(esquemaPropsVideo.parse({ ...base, marca }).marca).toEqual({ ...marca, lema: "" });
  });

  it("con marca, el video largo deja tiempo para el cierre del canal", () => {
    expect(COLA_CON_MARCA_MS).toBeGreaterThan(COLA_CON_MUSICA_MS);
    expect(duracionEnFrames(10_000, false, true)).toBe(
      Math.ceil(((10_000 + COLA_CON_MARCA_MS) / 1000) * FPS),
    );
    expect(duracionEnFrames(10_000, true, false)).toBe(
      Math.ceil(((10_000 + COLA_CON_MUSICA_MS) / 1000) * FPS),
    );
    expect(duracionEnFrames(10_000)).toBe(Math.ceil(((10_000 + COLA_FINAL_MS) / 1000) * FPS));
    expect(framesDe({ duracionMs: 10_000, marca: { id: "full-codigo" } })).toBe(
      duracionEnFrames(10_000, false, true),
    );
    // Un short no lleva el cierre largo del canal: tiene el suyo.
    const ventana = { inicioMs: 0, finMs: 4_000 };
    expect(framesDe({ duracionMs: 10_000, marca: {}, ventana })).toBe(
      framesDe({ duracionMs: 10_000, ventana }),
    );
  });

  it("la Estación pasa la marca a la plantilla y la plantilla la dibuja", () => {
    expect(readFileSync(path.join(raiz, "estacion/src/estacion.ts"), "utf8")).toContain(
      "marcaDeCanal(buscarTematica(trabajo.tematica_id)?.canal)",
    );
    expect(readFileSync(path.join(raiz, "estacion/src/produccion.ts"), "utf8")).toContain(
      "marca: marcaVideo,",
    );
    const plantilla = readFileSync(path.join(raiz, "estacion/src/remotion/TechExplainer.tsx"), "utf8");
    for (const pieza of ["<MarcaFija", "<CierreMarca", "<TituloTerminal", "<MarcoCodigo", "<RotuloCodigo"])
      expect(plantilla).toContain(pieza);
    expect(readFileSync(path.join(raiz, "estacion/src/remotion/Miniatura.tsx"), "utf8")).toContain(
      "<LogoRedondo",
    );
  });
});
