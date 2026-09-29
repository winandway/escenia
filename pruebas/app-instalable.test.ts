import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { proxy, RUTAS_DE_LA_APP } from "@/proxy";

const raiz = path.resolve(__dirname, "..");
const pedir = (ruta: string) => proxy(new NextRequest(`https://escenia.sitios.dev${ruta}`));

describe("app instalable (C-APP-1)", () => {
  it("el manifiesto trae lo que el teléfono exige para instalar", () => {
    const m = manifest();
    expect(m.name).toBe("Escenia");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    const tamanos = (m.icons ?? []).map((i) => `${i.sizes}${i.purpose ? `:${i.purpose}` : ""}`);
    expect(tamanos).toEqual(expect.arrayContaining(["192x192", "512x512", "512x512:maskable"]));
    expect((m.icons ?? []).map((i) => i.src).sort()).toEqual([
      "/iconos/icono-192.png",
      "/iconos/icono-512.png",
      "/iconos/icono-maskable-512.png",
    ]);
    // Los tres archivos existen y son PNG de verdad (por su firma).
    const archivos = [
      readFileSync(path.join(raiz, "public/iconos/icono-192.png")),
      readFileSync(path.join(raiz, "public/iconos/icono-512.png")),
      readFileSync(path.join(raiz, "public/iconos/icono-maskable-512.png")),
      readFileSync(path.join(raiz, "src/app/apple-icon.png")),
    ];
    for (const archivo of archivos) expect([...archivo.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("el teléfono puede pedir las piezas de la app sin sesión, y el panel sigue cerrado", () => {
    for (const ruta of [...RUTAS_DE_LA_APP, "/iconos/icono-192.png", "/entrar"]) {
      const r = pedir(ruta);
      expect(r.headers.get("location"), ruta).toBeNull();
    }
    for (const ruta of ["/", "/calendario", "/guiones/5", "/ajustes", "/sw.js.map", "/sin-conexion/otra"]) {
      const r = pedir(ruta);
      expect(r.status, ruta).toBe(307);
      expect(r.headers.get("location"), ruta).toContain("/entrar");
    }
  });

  it("el servicio de la app solo guarda la pantalla «Sin conexión» y sus archivos fijos, nunca pantallas ni datos del panel", () => {
    const sw = readFileSync(path.join(raiz, "public/sw.js"), "utf8");
    expect(sw).toContain('const SIN_CONEXION = "/sin-conexion"');
    expect(sw).toContain('const FIJOS = "/_next/static/"');
    // Solo dos escrituras en la memoria del teléfono: la pantalla y sus archivos fijos.
    expect(sw.match(/cache\.(add|addAll|put)\([^)]*\)/g)).toEqual([
      "cache.put(SIN_CONEXION, pagina)",
      "cache.add(ruta)",
    ]);
    // Las pantallas se piden siempre a la red; la memoria es solo el respaldo sin internet.
    expect(sw).toContain('pedido.mode === "navigate"');
    expect(sw).toContain("fetch(pedido).catch(() => caches.match(SIN_CONEXION)");
    expect(sw).not.toMatch(/\/datos\/|\/guiones|\/calendario|\/ajustes/);
  });

  it("la política de seguridad deja pasar las miniaturas de YouTube y nada más de afuera", () => {
    const config = readFileSync(path.join(raiz, "next.config.ts"), "utf8");
    expect(config).toContain("https://i.ytimg.com");
    expect(config).toContain("worker-src 'self'");
    expect(config).toContain("manifest-src 'self'");
    expect(config).toContain("frame-ancestors 'none'");
  });
});
