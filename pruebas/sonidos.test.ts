import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { elegirPista, estaEnCarpeta } from "@compartido/musica";
import {
  archivoDeSonido,
  esquemaSonidoNuevo,
  extensionDe,
  IDS_ORIGEN,
  MAX_BYTES_SONIDO,
} from "@compartido/sonidos";
import { guardarSonido, quitarSonido, sonidoPorId, sonidosActivos } from "@/lib/sonidos";

describe("biblioteca de sonidos de Richard (C-SONIDOS-1)", () => {
  it("la música exige género, el efecto exige su uso y todo exige decir de dónde salió", () => {
    const base = { tipo: "musica", nombre: "Bachata romántica", origen: "propia", extension: "mp3" };
    expect(esquemaSonidoNuevo.safeParse({ ...base, genero: "bachata" }).success).toBe(true);
    expect(esquemaSonidoNuevo.safeParse(base).success).toBe(false);
    expect(esquemaSonidoNuevo.safeParse({ ...base, genero: "bachata", origen: "" }).success).toBe(false);
    expect(esquemaSonidoNuevo.safeParse({ ...base, genero: "bachata", extension: "exe" }).success).toBe(
      false,
    );
    const efecto = { tipo: "efecto", nombre: "Chasquido", origen: "libre", extension: "wav" };
    expect(esquemaSonidoNuevo.safeParse(efecto).success).toBe(false);
    expect(esquemaSonidoNuevo.safeParse({ ...efecto, uso: "corte" }).success).toBe(true);
  });

  it("no hay opción para subir una canción comercial", () => {
    expect([...IDS_ORIGEN].sort()).toEqual(["libre", "licencia", "propia"]);
    expect(MAX_BYTES_SONIDO).toBeLessThanOrEqual(40 * 1024 * 1024);
  });

  it("el nombre del archivo de música es su ficha, y el del efecto es el que busca la plantilla", () => {
    expect(
      archivoDeSonido({
        id: 7,
        tipo: "musica",
        nombre: "Romántica con guitarra",
        genero: "bachata",
        uso: "",
        extension: "mp3",
      }),
    ).toBe("bachata-romantica-con-guitarra-p7.mp3");
    expect(
      archivoDeSonido({
        id: 3,
        tipo: "efecto",
        nombre: "Chasquido",
        genero: "",
        uso: "corte",
        extension: "wav",
      }),
    ).toBe("corte-p3.mp3");
    expect(
      archivoDeSonido({
        id: 4,
        tipo: "efecto",
        nombre: "Barrido",
        genero: "",
        uso: "transicion",
        extension: "mp3",
      }),
    ).toBe("whoosh-p4.mp3");
    expect(
      archivoDeSonido({ id: 5, tipo: "efecto", nombre: "Golpe", genero: "", uso: "golpe", extension: "mp3" }),
    ).toBe("boom.mp3");
    expect(extensionDe("Mi Bachata.FINAL.MP3")).toBe("mp3");
    expect(extensionDe("sin-extension")).toBe("");
  });

  it("la bachata que sube Richard le gana a la provisional del motor", () => {
    const propia = "bachata-guitar-requinto-bongos-guira-romantic-warm.mp3";
    const suya = "bachata-romantica-con-guitarra-p7.mp3";
    const estilo = "warm bachata guitar, romantic";
    expect(elegirPista(estilo, [propia, suya], [suya])?.archivo).toBe(suya);
    // Sin la de Richard, la del motor sigue saliendo.
    expect(elegirPista(estilo, [propia])?.archivo).toBe(propia);
    // Y la suya no se cuela donde no pega: un video de tecnología no sale con su bachata.
    expect(
      elegirPista("driving kick and bass beat", [suya, "beat-kick-bass-driving-pulse-neutral.mp3"], [suya])
        ?.archivo,
    ).toBe("beat-kick-bass-driving-pulse-neutral.mp3");
  });
});

describe("guardar y quitar sonidos", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  const guardados = new Map<string, ArrayBuffer>();
  const bucket = {
    async put(clave: string, datos: ArrayBuffer) {
      guardados.set(clave, datos);
    },
  };
  beforeEach(() => {
    db = baseEnMemoria();
    guardados.clear();
  });

  it("guarda el archivo en el almacén, lo anota y le pone el nombre para la Estación", async () => {
    const r = await guardarSonido(
      db,
      bucket,
      {
        tipo: "musica",
        nombre: "Bachata lenta",
        genero: "bachata",
        uso: "",
        origen: "propia",
        extension: "mp3",
      },
      new ArrayBuffer(2048),
    );
    expect(r.archivo).toBe(`bachata-bachata-lenta-p${r.id}.mp3`);
    const fila = await sonidoPorId(db, r.id);
    expect(fila?.bytes).toBe(2048);
    expect(guardados.has(fila?.clave ?? "")).toBe(true);
    expect(fila?.clave).toMatch(/^sonidos\/musica\/.+\.mp3$/);
  });

  it("quitar no borra: el sonido deja de salir en la lista y el archivo sigue en el almacén", async () => {
    const r = await guardarSonido(
      db,
      bucket,
      { tipo: "efecto", nombre: "Chasquido", genero: "", uso: "corte", origen: "libre", extension: "wav" },
      new ArrayBuffer(4096),
    );
    expect(await sonidosActivos(db)).toHaveLength(1);
    await quitarSonido(db, r.id);
    expect(await sonidosActivos(db)).toHaveLength(0);
    expect(await sonidoPorId(db, r.id)).toBeNull();
    expect(guardados.size).toBe(1);
    const fila = await db.uno<{ activo: number }>("SELECT activo FROM sonidos WHERE id = ?", [r.id]);
    expect(fila?.activo).toBe(0);
  });
});

describe("la música de Richard no se confunde con la del motor", () => {
  const motor = "/Users/x/estacion/recursos/musica";

  it("«musica-panel» y «musica-local» no están dentro de «musica», aunque empiecen igual", () => {
    expect(estaEnCarpeta(`${motor}/bachata-guitar.mp3`, motor)).toBe(true);
    expect(estaEnCarpeta(`${motor}-panel/bachata-voy-p1.mp3`, motor)).toBe(false);
    expect(estaEnCarpeta(`${motor}-local/salsa.mp3`, motor)).toBe(false);
    expect(estaEnCarpeta(`${motor}/`, `${motor}/`)).toBe(true);
  });

  it("con el catálogo real de la Mac, gana la bachata que subió Richard", () => {
    const catalogo = [
      `${motor}/bachata-guitar-requinto-bongos-guira-romantic-warm.mp3`,
      `${motor}/beat-kick-bass-driving-pulse-neutral.mp3`,
      `${motor}-panel/bachata-voy-recorreinto-instrumenal-p1.mp3`,
    ];
    const nombres = catalogo.map((r) => r.split("/").pop() ?? "");
    const suyas = catalogo.filter((r) => !estaEnCarpeta(r, motor)).map((r) => r.split("/").pop() ?? "");
    expect(suyas).toEqual(["bachata-voy-recorreinto-instrumenal-p1.mp3"]);
    expect(
      elegirPista("Dominican bachata, romantic requinto guitar, bongos and güira, warm", nombres, suyas)
        ?.archivo,
    ).toBe("bachata-voy-recorreinto-instrumenal-p1.mp3");
  });
});
