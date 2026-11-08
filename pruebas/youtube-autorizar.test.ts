// C-YOUTUBE-2: la Estación reconoce sola el cliente OAuth que Richard deja en Descargas.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clienteOAuthDe, leerClienteOAuth, yaAutorizada } from "../estacion/src/youtube-autorizar";

const CLIENTE = {
  installed: {
    client_id: "123456789-abcdefg.apps.googleusercontent.com",
    client_secret: "GOCSPX-secreto-de-mentira",
    redirect_uris: ["http://localhost"],
  },
};

describe("permiso de YouTube sin comandos (C-YOUTUBE-2)", () => {
  it("encuentra el archivo de Google en Descargas, el más nuevo si hay varios", () => {
    expect(
      clienteOAuthDe([
        { nombre: "factura.pdf", modificado: 9 },
        { nombre: "client_secret_111.apps.googleusercontent.com.json", modificado: 1 },
        { nombre: "client_secret_222.apps.googleusercontent.com.json", modificado: 5 },
        { nombre: "client_secret_333.json.crdownload", modificado: 8 },
      ]),
    ).toBe("client_secret_222.apps.googleusercontent.com.json");
    expect(clienteOAuthDe([{ nombre: "foto.png", modificado: 1 }])).toBeNull();
  });

  it("acepta un cliente de escritorio y rechaza cualquier otro JSON", () => {
    expect(leerClienteOAuth(JSON.stringify(CLIENTE))).toEqual({
      client_id: CLIENTE.installed.client_id,
      client_secret: CLIENTE.installed.client_secret,
    });
    expect(leerClienteOAuth(JSON.stringify({ type: "service_account" }))).toBeNull();
    expect(leerClienteOAuth("no es json")).toBeNull();
  });

  it("con la llave larga ya guardada no se vuelve a pedir; sin ella, sí", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "yt-"));
    const sin = path.join(dir, "sin.json");
    const con = path.join(dir, "con.json");
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- carpeta temporal de la prueba
    writeFileSync(sin, JSON.stringify(CLIENTE.installed));
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- carpeta temporal de la prueba
    writeFileSync(
      con,
      JSON.stringify({ ...CLIENTE.installed, refresh_token: "1//permiso-largo-de-mentira" }),
    );
    expect(await yaAutorizada(sin)).toBe(false);
    expect(await yaAutorizada(con)).toBe(true);
    expect(await yaAutorizada(path.join(dir, "no-existe.json"))).toBe(false);
  });
});
