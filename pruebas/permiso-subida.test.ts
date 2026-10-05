import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { COOKIE_SESION, crearSesion } from "@/lib/sesion";

let galleta: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (nombre === COOKIE_SESION && galleta ? { value: galleta } : undefined),
  }),
}));

import { puedeSubir } from "@/lib/permiso-subida";

// Un valor de mentira, distinto en cada corrida: en el repo no se escribe nada que parezca una clave.
const SECRETO = `${crypto.randomUUID()}${crypto.randomUUID()}`;
const pedido = (cabeceras: Record<string, string> = {}) =>
  new Request("https://escenia.sitios.dev/datos/grabaciones/iniciar", { method: "POST", headers: cabeceras });

describe("quién puede subir una grabación (C-GRABACIONES-1)", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  beforeEach(() => {
    db = baseEnMemoria();
    galleta = undefined;
  });

  it("sin sesión y sin el secreto de la Estación, nadie sube nada", async () => {
    const r = await puedeSubir(pedido(), db, SECRETO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.respuesta.status).toBe(401);
    const malo = await puedeSubir(pedido({ authorization: `Bearer ${crypto.randomUUID()}` }), db, SECRETO);
    expect(malo.ok).toBe(false);
    galleta = "inventada";
    expect((await puedeSubir(pedido(), db, SECRETO)).ok).toBe(false);
  });

  it("la Estación sube con su secreto", async () => {
    expect((await puedeSubir(pedido({ authorization: `Bearer ${SECRETO}` }), db, SECRETO)).ok).toBe(true);
  });

  it("Richard sube con su sesión, pero solo desde el propio panel", async () => {
    galleta = (await crearSesion(db)).token;
    expect((await puedeSubir(pedido(), db, SECRETO)).ok).toBe(true);
    expect((await puedeSubir(pedido({ origin: "https://escenia.sitios.dev" }), db, SECRETO)).ok).toBe(true);
    const ajeno = await puedeSubir(pedido({ origin: "https://otro-sitio.example" }), db, SECRETO);
    expect(ajeno.ok).toBe(false);
    if (!ajeno.ok) expect(ajeno.respuesta.status).toBe(403);
  });
});
