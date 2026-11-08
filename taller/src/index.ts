// escenia-taller: el taller en la nube de Escenia (Cloudflare Containers). Aprobado por Gerencia el
// 8 nov 2026: standard-4 (4 vCPU, 12 GiB), máximo UNA instancia, se apaga a los 2 minutos sin trabajo,
// tope de 6 dólares al mes. El tope va EN CÓDIGO (C-TALLER-2): antes de encender el contenedor se mira
// cuántos segundos van en el mes; si pasan del tope, no se enciende. Mirar /salud no escribe nada.
import { Container, getContainer } from "@cloudflare/containers";
import { DOLARES_POR_SEGUNDO, estadoDelGasto, mesDe, TOPE_SEGUNDOS_MES } from "./tope";

export interface Env {
  TALLER: DurableObjectNamespace<Taller>;
  TALLER_SECRETO: string;
}

export class Taller extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "2m";

  /** Segundos de contenedor encendido en el mes (solo lee). */
  async usado(mes: string): Promise<number> {
    return (await this.ctx.storage.get<number>(`seg:${mes}`)) ?? 0;
  }

  /** Suma lo que duró un trabajo: UNA escritura por trabajo, nunca por mirar. */
  async sumar(mes: string, segundos: number): Promise<number> {
    const total = (await this.usado(mes)) + Math.max(0, Math.ceil(segundos));
    await this.ctx.storage.put(`seg:${mes}`, total);
    return total;
  }
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });

function autorizado(req: Request, secreto: string): boolean {
  const dado = req.headers.get("authorization") ?? "";
  return secreto.length >= 24 && dado === `Bearer ${secreto}`;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const taller = getContainer(env.TALLER, "unico");
    const mes = mesDe(new Date());
    if (req.method === "GET" && url.pathname === "/salud") {
      const segundos = await taller.usado(mes);
      return json({
        ok: true,
        mes,
        segundos,
        tope: TOPE_SEGUNDOS_MES,
        dolares: Math.round(segundos * DOLARES_POR_SEGUNDO * 100) / 100,
        estado: estadoDelGasto(segundos),
      });
    }
    if (!autorizado(req, env.TALLER_SECRETO)) return json({ error: "No autorizado." }, 401);
    if (req.method === "POST" && url.pathname === "/prueba") {
      const segundos = await taller.usado(mes);
      if (segundos >= TOPE_SEGUNDOS_MES)
        return json({ error: "El taller llegó al tope del mes: no se enciende.", segundos }, 429);
      const inicio = Date.now();
      const r = await taller.fetch(new Request("http://taller/prueba", { method: "POST" }));
      // 503 = Cloudflare todavía no tenía una máquina que dar: no se encendió nada, no se cobra ni se suma.
      const total = r.status === 503 ? segundos : await taller.sumar(mes, (Date.now() - inicio) / 1000);
      const cuerpo = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return json({ ...cuerpo, segundos_mes: total }, r.status);
    }
    return json({ error: "No existe." }, 404);
  },
} satisfies ExportedHandler<Env>;
