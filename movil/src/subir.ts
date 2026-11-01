// Subir fotos y videos al chat del Director, igual que el panel: cada foto en su propio pedido a la
// carpeta del proyecto; cada video por partes de 8 MB con reintentos (un corte de internet no obliga a
// empezar de cero). La dirección de cada archivo en el almacén la decide el panel, nunca el teléfono.
import { File, Paths, UploadType } from "expo-file-system";
import { cabeceras, ErrorDeApi, PANEL, pedir } from "./api";
import { extensionDeFoto, trozos } from "./logica";

const REINTENTOS = 3;

export async function subirFoto(uri: string, nombre: string, carpeta: string): Promise<void> {
  const ext = extensionDeFoto(nombre) ?? extensionDeFoto(uri) ?? "jpg";
  const limpio = nombre.replace(/\.[a-z0-9]+$/i, "") + "." + ext;
  const consulta = new URLSearchParams({ carpeta, nombre: limpio, extension: ext === "jpeg" ? "jpg" : ext });
  const r = await new File(uri).upload(`${PANEL}/datos/imagenes?${consulta.toString()}`, {
    httpMethod: "POST",
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      ...cabeceras(),
      "content-type": ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg",
    },
  });
  if (r.status >= 300) {
    const j = JSON.parse(r.body || "{}") as { error?: string };
    throw new ErrorDeApi(j.error ?? "", r.status);
  }
}

async function conReintentos<T>(f: () => Promise<T>): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < REINTENTOS; i++) {
    try {
      return await f();
    } catch (e) {
      ultimo = e;
      await new Promise((ok) => setTimeout(ok, 1000 * (i + 1)));
    }
  }
  throw ultimo;
}

export async function subirVideo(
  uri: string,
  nombre: string,
  encargoId: number,
  avance: (porcentaje: number) => void,
): Promise<void> {
  const archivo = new File(uri);
  const bytes = archivo.size;
  const base = `/datos/director/${encargoId}/videos`;
  const inicio = await pedir<{ id: number; uploadId: string; parte: number }>(base, {
    metodo: "POST",
    cuerpo: { archivo: nombre, bytes },
  });
  const partes: { partNumber: number; etag: string }[] = [];
  const lista = trozos(bytes, inicio.parte);
  const manija = archivo.open();
  const temporal = new File(Paths.cache, `parte-${inicio.id}.bin`);
  try {
    for (const [n, [desde, largo]] of lista.entries()) {
      manija.offset = desde;
      const contenido = manija.readBytes(largo);
      if (temporal.exists) temporal.delete();
      temporal.create();
      temporal.write(contenido);
      const consulta = new URLSearchParams({
        id: String(inicio.id),
        uploadId: inicio.uploadId,
        n: String(n + 1),
      });
      const parte = await conReintentos(async () => {
        const r = await temporal.upload(`${PANEL}${base}/parte?${consulta.toString()}`, {
          httpMethod: "PUT",
          uploadType: UploadType.BINARY_CONTENT,
          headers: { ...cabeceras(), "content-type": "application/octet-stream" },
        });
        const j = JSON.parse(r.body || "{}") as { partNumber?: number; etag?: string; error?: string };
        if (r.status >= 300 || !j.partNumber || !j.etag) throw new ErrorDeApi(j.error ?? "", r.status);
        return { partNumber: j.partNumber, etag: j.etag };
      });
      partes.push(parte);
      avance(Math.round(((n + 1) / lista.length) * 100));
    }
  } finally {
    manija.close();
    if (temporal.exists) temporal.delete();
  }
  await pedir(`${base}/terminar`, {
    metodo: "POST",
    cuerpo: { id: inicio.id, uploadId: inicio.uploadId, partes },
  });
}

/**
 * Una captura para un caso de ayuda (C-AYUDA-2): la imagen en crudo, sin cuenta (el enlace del caso es la
 * llave). Devuelve su número para pegarla al mensaje; el panel decide el tipo por los bytes.
 */
export async function subirCaptura(
  uri: string,
  nombre: string,
  tipo: string,
  codigo: string,
): Promise<number> {
  const consulta = new URLSearchParams({ nombre });
  const r = await new File(uri).upload(
    `${PANEL}/datos/ayuda/casos/${encodeURIComponent(codigo)}/adjuntos?${consulta.toString()}`,
    { httpMethod: "POST", uploadType: UploadType.BINARY_CONTENT, headers: { "content-type": tipo } },
  );
  const j = JSON.parse(r.body || "{}") as { id?: number; error?: string; codigo?: string };
  if (r.status >= 300 || !j.id) throw new ErrorDeApi(j.error ?? "", r.status, j.codigo ?? "");
  return j.id;
}
