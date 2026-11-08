// C-TALLER-1: en Linux (el taller en la nube) las medidas de una imagen salen de ffprobe y tienen que
// coincidir con las de sips (la Mac): ancho, alto y si trae transparencia.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filtroLadoMaximo, leerFfprobe, leerSips } from "../estacion/src/medidas";

const hay = (programa: string) => {
  try {
    execFileSync(programa, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const enLaMac = process.platform === "darwin" && hay("ffmpeg");

describe("medidas de imágenes en Linux (C-TALLER-1)", () => {
  it("lee lo que dicen sips y ffprobe", () => {
    expect(leerSips("  pixelWidth: 561\n  pixelHeight: 587\n  hasAlpha: yes\n")).toEqual({
      ancho: 561,
      alto: 587,
      alfa: true,
    });
    expect(leerFfprobe("561,587,rgba\n")).toEqual({ ancho: 561, alto: 587, alfa: true });
    expect(leerFfprobe("1900,1200,rgb24\n")).toEqual({ ancho: 1900, alto: 1200, alfa: false });
    expect(leerFfprobe("640,480,yuvj420p")).toMatchObject({ alfa: false });
    expect(leerFfprobe("")).toEqual({ ancho: 0, alto: 0, alfa: false });
  });

  it("el filtro de tamaño deja el lado mayor en el tope y no agranda", () => {
    expect(filtroLadoMaximo(1280)).toBe(
      "scale='if(gte(iw,ih),min(1280,iw),-2)':'if(gte(iw,ih),-2,min(1280,ih))'",
    );
  });

  it.skipIf(!enLaMac)("ffprobe dice lo mismo que sips con imágenes reales (con y sin transparencia)", () => {
    const carpeta = mkdtempSync(path.join(os.tmpdir(), "medidas-"));
    const casos = [
      { nombre: "logo.png", fuente: "color=c=red@0.5:s=300x200,format=rgba" },
      { nombre: "captura.png", fuente: "color=c=blue:s=640x400,format=rgb24" },
      { nombre: "foto.jpg", fuente: "color=c=green:s=800x600" },
    ];
    for (const c of casos) {
      const ruta = path.join(carpeta, c.nombre);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", c.fuente, "-frames:v", "1", ruta]);
      const sips = leerSips(
        execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", ruta], {
          encoding: "utf8",
        }),
      );
      const ffprobe = leerFfprobe(
        execFileSync(
          "ffprobe",
          [
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,pix_fmt",
            "-of",
            "csv=p=0",
            ruta,
          ],
          { encoding: "utf8" },
        ),
      );
      expect(ffprobe, c.nombre).toEqual(sips);
    }
  });
});
