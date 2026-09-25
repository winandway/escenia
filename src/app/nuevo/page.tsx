import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { productosActivos } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { NOMBRE_CANAL, TEMATICAS } from "@compartido/tematicas";
import { FormularioNuevo } from "./FormularioNuevo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo video" };

export default async function PaginaNuevo() {
  await exigirSesion();
  const { db } = await contexto();
  const productos = await productosActivos(db);
  const tematicas = TEMATICAS.filter((t) => t.activa).map((t) => ({
    id: t.id,
    nombre: `${t.nombre} — ${NOMBRE_CANAL[t.canal]}`,
    ctaProductos: t.ctaProductos,
  }));
  return (
    <Marco titulo="Nuevo video">
      <FormularioNuevo
        tematicas={tematicas}
        productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </Marco>
  );
}
