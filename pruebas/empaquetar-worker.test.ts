import { describe, expect, it } from "vitest";
import { reemplazarWasm } from "../scripts/reemplazar-wasm.mjs";

describe("empaquetar-worker: los imports .wasm de Next se reemplazan (C-DEPLOY-1)", () => {
  it("atrapa nombres minificados con $ y sin espacio antes de from, y avisa si queda alguno", () => {
    const codigo =
      'import a from "node:fs";import Y$ from"./a5d4-yoga.wasm";import J$ from"./a7e7-resvg.wasm";import Z from "./x.wasm";';
    const r = reemplazarWasm(codigo);
    expect(r.reemplazos).toBe(3);
    expect(r.quedan).toBe(false);
    expect(r.codigo).toContain("const Y$=new WebAssembly.Module(");
    expect(r.codigo).not.toContain(".wasm");
    expect(reemplazarWasm('import W from "../otro.wasm";').quedan).toBe(true);
  });
});
