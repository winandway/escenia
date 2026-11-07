// C-PODCAST-2: cada ruta recibe UNA sola Permissions-Policy. Con dos (la general y la del estudio), el
// servidor publicado mandaba las dos y Chrome bloqueaba la cámara y el micrófono del podcast sin preguntar.
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: el paquete compilado de Next no trae tipos
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import config from "../next.config";

type Regla = { source: string; headers: { key: string; value: string }[] };

async function politicasDe(ruta: string): Promise<string[]> {
  const reglas = (await config.headers!()) as Regla[];
  return reglas
    .filter((r) => (pathToRegexp(r.source, [], {}) as RegExp).test(ruta))
    .flatMap((r) => r.headers.filter((h) => h.key === "Permissions-Policy").map((h) => h.value));
}

describe("cámara y micrófono solo en el estudio del podcast (C-PODCAST-2)", () => {
  it("el estudio y sus fichas: una sola política, con cámara y micrófono del propio sitio", async () => {
    for (const ruta of ["/podcast", "/podcast/fichas"]) {
      const p = await politicasDe(ruta);
      expect(p).toHaveLength(1);
      expect(p[0]).toContain("camera=(self)");
      expect(p[0]).toContain("microphone=(self)");
    }
  });

  it("el resto del panel: una sola política, sin cámara ni micrófono", async () => {
    for (const ruta of ["/", "/entrar", "/publicidad", "/podcastero", "/datos/salud"]) {
      const p = await politicasDe(ruta);
      expect(p).toHaveLength(1);
      expect(p[0]).toContain("camera=()");
    }
  });
});
