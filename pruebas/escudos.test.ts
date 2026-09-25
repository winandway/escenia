import { describe, expect, it, vi } from "vitest";
import { estacionAutorizada } from "@/lib/estacion-auth";
import { turnstileOk } from "@/lib/turnstile";
import { elegirEstructura, instruccionesSistema, mensajeUsuario } from "@/lib/prompt";
import { buscarTematica, TEMATICAS } from "@compartido/tematicas";

describe("turnstile", () => {
  it("se apaga solo sin secreto", async () => {
    expect((await turnstileOk(undefined, undefined, "ip")).ok).toBe(true);
  });
  it("con secreto exige el pase y respeta lo que diga Cloudflare", async () => {
    expect((await turnstileOk(undefined, "sec", "ip")).ok).toBe(false);
    const ok = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    expect((await turnstileOk("pase", "sec", "ip", ok as unknown as typeof fetch)).ok).toBe(true);
    const mal = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }));
    expect((await turnstileOk("pase", "sec", "ip", mal as unknown as typeof fetch)).ok).toBe(false);
  });
  it("si Cloudflare no responde, deja pasar", async () => {
    const caido = vi.fn(async () => {
      throw new Error("red");
    });
    expect((await turnstileOk("pase", "sec", "ip", caido as unknown as typeof fetch)).ok).toBe(true);
  });
});

describe("estación", () => {
  it("solo entra con el secreto exacto", () => {
    expect(estacionAutorizada("Bearer secreto-largo-de-prueba-1234", "secreto-largo-de-prueba-1234")).toBe(
      true,
    );
    expect(estacionAutorizada("Bearer otro", "secreto-largo-de-prueba-1234")).toBe(false);
    expect(estacionAutorizada(null, "secreto-largo-de-prueba-1234")).toBe(false);
    expect(estacionAutorizada("secreto-largo-de-prueba-1234", "secreto-largo-de-prueba-1234")).toBe(false);
  });
});

describe("temáticas y prompt", () => {
  it("todas las temáticas tienen id único, estructura y plantilla", () => {
    const ids = new Set(TEMATICAS.map((t) => t.id));
    expect(ids.size).toBe(TEMATICAS.length);
    for (const t of TEMATICAS) {
      expect(t.estructuras.length).toBeGreaterThan(0);
      expect(["TechExplainer", "MiniDocumental"]).toContain(t.plantilla);
    }
  });

  it("en el piloto solo están activas las temáticas del canal de IA", () => {
    for (const t of TEMATICAS.filter((x) => x.activa)) expect(t.canal).toBe("canal-ia");
  });

  it("rota la estructura menos usada", () => {
    const t = buscarTematica("ia-apps")!;
    const primera = t.estructuras[0]!.join(">");
    const elegida = elegirEstructura(t, [primera, primera]);
    expect(elegida.join(">")).not.toBe(primera);
  });

  it("el prompt no trae temas concretos y sí las reglas anti-invento", () => {
    const sistema = instruccionesSistema();
    expect(sistema).toMatch(/No inventes/);
    expect(sistema).not.toMatch(/OpenAI|Altman|Tintora/);
    const t = buscarTematica("ia-apps")!;
    const msj = mensajeUsuario({
      tematica: t,
      tema: { titulo: "Prueba", contexto: "", urlFuente: "" },
      producto: null,
      estructura: t.estructuras[0]!,
      recientes: [],
      instruccionesExtra: "",
    });
    expect(msj).toMatch(/no hay texto de fuente/);
    expect(msj).toMatch(/PRODUCTO: ninguno/);
  });
});
