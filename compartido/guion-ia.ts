// El formato que se le EXIGE a la IA al escribir un guion, y cómo se pasa al
// guion de verdad (compartido/guion.ts).
//
// Por qué son dos (C-GUION-3): el guion guardado tiene muchos campos opcionales
// (los guiones viejos no traen planos ni diagramas, y así tiene que seguir).
// Pero cada opcional le multiplica el trabajo a la API al preparar el formato,
// y el 6 oct 2026 respondió «Schema is too complex»: no se podía escribir
// NINGÚN guion. Aquí no hay ni un opcional: todo va siempre, y lo que no aplica
// va vacío. Después `guionDesdeLaIA` quita los vacíos,
// recorta lo que se pasó de largo y deja el guion como lo espera el resto.
import { z } from "zod";
import {
  DURACION_INTERLUDIO,
  esquemaGuionGenerado,
  ICONOS_DIAGRAMA,
  NODOS_POR_DIAGRAMA,
  PARTES,
  PLANOS_POR_ESCENA,
  TIPOS_PLANO,
  TIPOS_VISUAL,
  type GuionGenerado,
} from "./guion";

export const esquemaGuionDeLaIA = z.object({
  titulo: z.string(),
  gancho: z.string(),
  escenas: z.array(
    z.object({
      parte: z.enum(PARTES),
      narracion: z.string(),
      // Solo cuenta en un interludio; en las demás escenas va 0.
      duracion_seg: z.number(),
      visual: z.object({
        tipo: z.enum(TIPOS_VISUAL),
        busqueda: z.string(),
        url: z.string(),
        prompt_imagen: z.string(),
        cuadros: z.array(z.object({ prompt_imagen: z.string() })),
        titular: z.string(),
        fecha: z.string(),
        cuerpo: z.string(),
        texto_en_pantalla: z.string(),
        foto_de: z.enum(["persona", "lugar"]),
        planos: z.array(
          z.object({
            frase: z.string(),
            tipo: z.enum(TIPOS_PLANO),
            busqueda: z.string(),
            foto_de: z.enum(["persona", "lugar"]),
            texto: z.string(),
          }),
        ),
        diagrama: z.object({
          seccion: z.string(),
          nodos: z.array(
            z.object({
              id: z.string(),
              // Texto libre a propósito: si la IA escribe «cliente» o «bodega» no se rechaza el guion;
              // `iconoDeDiagrama` lo lleva al dibujo que existe.
              icono: z.string(),
              etiqueta: z.string(),
              nota: z.string(),
              frase: z.string(),
            }),
          ),
          flechas: z.array(z.object({ de: z.string(), a: z.string() })),
          formula: z.string(),
        }),
      }),
    }),
  ),
  hechos_a_verificar: z.array(z.string()),
  descripcion_youtube: z.string(),
  etiquetas: z.array(z.string()),
  musica: z.string(),
});
export type GuionDeLaIA = z.infer<typeof esquemaGuionDeLaIA>;

const sinTildes = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();

// Cómo le dice la gente a cada dibujo: si la IA escribe «cliente» o «bodega», se entiende.
const PARECIDOS: Record<(typeof ICONOS_DIAGRAMA)[number], string[]> = {
  persona: ["cliente", "usuario", "comprador", "empleado", "gente"],
  vendedor: ["cajero", "vendedora", "mostrador", "caja"],
  tienda: ["local", "negocio", "comercio", "sucursal"],
  producto: ["paquete", "articulo", "mercancia", "item"],
  deposito: ["almacen", "bodega", "inventario", "stock"],
  dinero: ["pago", "cobro", "efectivo", "plata", "monedas", "ingreso"],
  factura: ["recibo", "comprobante", "documento", "orden", "pedido"],
  carrito: ["carro", "compra", "cesta"],
  servidor: ["sistema", "backend", "maquina"],
  datos: ["base de datos", "bd", "registro", "tabla"],
  telefono: ["celular", "movil", "app"],
  computadora: ["pc", "laptop", "pantalla", "panel"],
  nube: ["internet", "cloud", "servicio"],
  camion: ["envio", "entrega", "despacho", "transporte"],
  banco: ["cuenta bancaria", "transferencia"],
  grafica: ["reporte", "informe", "estadistica", "resultado"],
  candado: ["seguridad", "clave", "permiso", "acceso"],
  engranaje: ["proceso", "automatico", "configuracion", "ajustes", "regla"],
  casa: ["hogar", "domicilio"],
  edificio: ["empresa", "oficina", "compania"],
  ia: ["inteligencia artificial", "robot", "asistente", "modelo"],
  reloj: ["hora", "tiempo", "plazo", "vencimiento"],
  correo: ["email", "mensaje", "notificacion", "aviso al cliente"],
  tarjeta: ["tarjeta de credito", "debito", "pos"],
  alerta: ["error", "advertencia", "problema", "riesgo"],
  listo: ["ok", "hecho", "exito", "aprobado", "correcto", "check"],
};

/** Del nombre que escribió la IA al dibujo que existe. Si no se parece a ninguno, una caja. */
export function iconoDeDiagrama(nombre: string): (typeof ICONOS_DIAGRAMA)[number] {
  const pedido = sinTildes(nombre);
  const exacto = ICONOS_DIAGRAMA.find((i) => i === pedido);
  if (exacto) return exacto;
  for (const icono of ICONOS_DIAGRAMA) {
    if (PARECIDOS[icono].some((p) => pedido === p || pedido.includes(p))) return icono;
  }
  return "producto";
}

/** Recorta un texto a su largo máximo sin dejarlo en media palabra. Vacío → `undefined`. */
function texto(valor: string, maximo: number): string | undefined {
  const limpio = valor.replace(/\s+/g, " ").trim();
  if (!limpio) return undefined;
  if (limpio.length <= maximo) return limpio;
  const corto = limpio.slice(0, maximo + 1).replace(/\s+\S*$/u, "");
  return (corto.length >= maximo * 0.6 ? corto : limpio.slice(0, maximo)).trim();
}

/**
 * De lo que escribió la IA al guion de verdad: fuera los vacíos, cada texto a
 * su largo, cada ícono a un dibujo que existe. Una escena «diagrama» que llegó
 * sin objetos no se pierde: pasa a ser una frase en grande con su titular.
 */
export function guionDesdeLaIA(crudo: GuionDeLaIA): GuionGenerado {
  const escenas = crudo.escenas.map((e) => {
    const v = e.visual;
    const nodos =
      v.tipo === "diagrama"
        ? v.diagrama.nodos
            .map((n, k) => ({
              id: texto(n.id, 24) ?? `n${k + 1}`,
              icono: iconoDeDiagrama(n.icono),
              etiqueta: texto(n.etiqueta, 28) ?? "",
              nota: texto(n.nota, 32) ?? "",
              frase: texto(n.frase, 90) ?? "",
            }))
            .filter((n) => n.etiqueta.length > 0)
            .map((n) => ({ ...n, frase: n.frase.length >= 2 ? n.frase : n.etiqueta }))
            .slice(0, NODOS_POR_DIAGRAMA)
        : [];
    const esDiagrama = v.tipo === "diagrama" && nodos.length > 0;
    const planos = v.planos
      .map((p) => ({
        frase: texto(p.frase, 90) ?? "",
        tipo: p.tipo,
        busqueda: texto(p.busqueda, 80),
        foto_de: p.foto_de === "lugar" ? ("lugar" as const) : undefined,
        texto: texto(p.texto, 60),
      }))
      .filter((p) => p.frase.length >= 2)
      .slice(0, PLANOS_POR_ESCENA);
    const cuadros = v.cuadros
      .map((c) => ({ prompt_imagen: texto(c.prompt_imagen, 400) ?? "" }))
      .filter((c) => c.prompt_imagen.length >= 10)
      .slice(0, 6);
    const titular = texto(v.titular, 90);
    return {
      parte: e.parte,
      narracion: texto(e.narracion, 1500) ?? "",
      duracion_seg:
        e.parte === "interludio"
          ? Math.min(DURACION_INTERLUDIO.maximo, Math.max(DURACION_INTERLUDIO.minimo, e.duracion_seg || 0))
          : undefined,
      visual: {
        // Un diagrama sin objetos no explica nada: queda como frase en grande.
        tipo: v.tipo === "diagrama" && !esDiagrama ? ("texto" as const) : v.tipo,
        busqueda: texto(v.busqueda, 80),
        url: texto(v.url, 300),
        prompt_imagen: texto(v.prompt_imagen, 400),
        cuadros: cuadros.length ? cuadros : undefined,
        titular,
        fecha: texto(v.fecha, 40),
        cuerpo: texto(v.cuerpo, 300),
        texto_en_pantalla:
          texto(v.texto_en_pantalla, 90) ?? (v.tipo === "diagrama" && !esDiagrama ? titular : undefined),
        foto_de: v.foto_de === "lugar" ? ("lugar" as const) : undefined,
        planos: planos.length && !esDiagrama ? planos : undefined,
        diagrama: esDiagrama
          ? {
              seccion: texto(v.diagrama.seccion, 18) ?? "",
              nodos,
              flechas: v.diagrama.flechas
                .map((f) => ({ de: texto(f.de, 24) ?? "", a: texto(f.a, 24) ?? "" }))
                .filter((f) => f.de && f.a)
                .slice(0, 8),
              formula: texto(v.diagrama.formula, 60) ?? "",
            }
          : undefined,
      },
    };
  });
  return esquemaGuionGenerado.parse({
    titulo: texto(crudo.titulo, 100) ?? "",
    gancho: texto(crudo.gancho, 300) ?? "",
    escenas,
    hechos_a_verificar: crudo.hechos_a_verificar
      .map((h) => texto(h, 300))
      .filter((h): h is string => Boolean(h))
      .slice(0, 20),
    descripcion_youtube: (crudo.descripcion_youtube ?? "").trim().slice(0, 4500),
    etiquetas: crudo.etiquetas
      .map((x) => texto(x, 40))
      .filter((x): x is string => Boolean(x))
      .slice(0, 20),
    musica: texto(crudo.musica, 160) ?? "",
  });
}
