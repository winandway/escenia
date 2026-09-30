import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { productosActivos } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { canalDesde, LISTA_CANALES } from "@compartido/canales";
import { NOMBRE_CANAL, TEMATICAS } from "@compartido/tematicas";
import { FormularioNuevo } from "./FormularioNuevo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo video" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PaginaNuevo(props: PageProps<"/nuevo">) {
  await exigirSesion();
  const pedido = canalDesde(uno((await props.searchParams).canal));
  const { db } = await contexto();
  const productos = await productosActivos(db);
  const tematicas = TEMATICAS.filter((t) => t.activa).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    canal: t.canal,
  }));
  // Solo se ofrecen los canales que tienen al menos una temática activa.
  const canales = LISTA_CANALES.filter((c) => tematicas.some((t) => t.canal === c)).map((c) => ({
    id: c,
    nombre: NOMBRE_CANAL[c],
  }));
  return (
    <Marco titulo="Nuevo video">
      <FormularioNuevo
        canales={canales}
        canalInicial={pedido ?? canales[0]?.id ?? "canal-ia"}
        tematicas={tematicas}
        productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </Marco>
  );
}
