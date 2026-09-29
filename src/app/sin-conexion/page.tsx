// Pantalla que la app instalada muestra cuando el teléfono no tiene internet.
// Es pública y no lleva datos: la guarda el servicio de la app al instalarse.
export const metadata = { title: "Sin conexión" };

export default function PaginaSinConexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-lg font-semibold text-amber-400">Escenia</p>
      <h1 className="mt-4 text-2xl font-semibold">Sin conexión</h1>
      <p className="mt-3 text-sm text-neutral-400">
        El teléfono no tiene internet en este momento. Lo que estabas escribiendo sigue guardado en este
        teléfono y vuelve a aparecer cuando regrese la conexión.
      </p>
      {/* Un formulario y no un enlace: tiene que ser una carga completa de la página. */}
      <form action="/" method="get" className="mt-6">
        <button type="submit" className="boton">
          Volver a intentar
        </button>
      </form>
    </main>
  );
}
