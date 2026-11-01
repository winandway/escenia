// Los casos de ayuda (docs/AYUDA.md, C-AYUDA-1), sin cuenta. POST abre un caso desde la página de soporte o
// desde la app y devuelve su enlace secreto. GET ?codigos=a,b trae «Mis casos» (los enlaces que guardó ese
// teléfono o ese navegador). El escudo es el límite por IP; el campo «sitio_web» es una trampa para robots.
import { z } from "zod";
import { esTokenDeAvisos, ipDelPedido } from "@/lib/app-sesion";
import { casosPorCodigos, crearCaso, pasaLimite } from "@/lib/ayuda";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

const esquema = z.object({
  origen: z.enum(["web", "app"]),
  nombre: z.string().trim().min(1).max(80),
  correo: z.string().trim().email().max(120),
  idioma: z.enum(["en", "es"]).default("en"),
  asunto: z.string().trim().min(1).max(120),
  mensaje: z.string().trim().min(1).max(4000),
  aviso_token: z.string().refine(esTokenDeAvisos).optional(),
  sitio_web: z.string().max(200).optional(),
});

const demasiados = () =>
  Response.json({ error: "Too many requests. Try again later.", codigo: "intentos" }, { status: 429 });

export async function POST(req: Request) {
  const { db } = await contexto();
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: "Check the form and try again.", codigo: "datos" }, { status: 400 });
  if (!(await pasaLimite(db, `ayuda-crear:${ipDelPedido(req)}`, 5, 3600))) return demasiados();
  const d = parseo.data;
  // Un robot llena todo, también el campo escondido: se le contesta como si nada y no se guarda.
  if (d.sitio_web) return Response.json({ codigo: "", numero: "" }, { status: 201 });
  const caso = await crearCaso(db, {
    origen: d.origen,
    nombre: d.nombre,
    correo: d.correo,
    idioma: d.idioma,
    asunto: d.asunto,
    mensaje: d.mensaje,
    avisoToken: d.aviso_token,
  });
  return Response.json({ codigo: caso.codigo, numero: caso.numero }, { status: 201 });
}

export async function GET(req: Request) {
  const { db } = await contexto();
  if (!(await pasaLimite(db, `ayuda-leer:${ipDelPedido(req)}`, 60, 60))) return demasiados();
  const codigos = (new URL(req.url).searchParams.get("codigos") ?? "").split(",").filter(Boolean);
  return Response.json(
    { casos: await casosPorCodigos(db, codigos) },
    { headers: { "cache-control": "no-store" } },
  );
}
