import { describe, expect, it } from "vitest";
import { escenaRepetida, promptDeEscena } from "../estacion/src/avatar-escena";

describe("avatar: cada video de Chase cambia de escenografía (C-AVATAR-2)", () => {
  const registro = "aaaa1111\tomnihuman-2-playa.mp4\t2026-10-08\nbbbb2222\tchase-jalon.mp4\t2026-10-09\n";
  it("una foto ya usada se detecta con el clip donde salió", () => {
    expect(escenaRepetida("bbbb2222", registro)).toBe("chase-jalon.mp4");
    expect(escenaRepetida("cccc3333", registro)).toBeNull();
    expect(escenaRepetida("aaaa1111", "")).toBeNull();
  });
  it("el pedido de escena conserva el muñeco y pide ropa y lugar nuevos", () => {
    const p = promptDeEscena("white linen shirt", "sitting under a coconut palm", true);
    expect(p).toContain("same curly blond hair");
    expect(p).toContain("Dress him in: white linen shirt.");
    expect(p).toContain("Scene: sitting under a coconut palm.");
    expect(p).toContain("Image 2 is the real place");
    expect(promptDeEscena("x", "y", false)).not.toContain("Image 2");
    expect(promptDeEscena("x", "y", false, true)).toContain("FULL BODY from head to shoes");
  });
});
