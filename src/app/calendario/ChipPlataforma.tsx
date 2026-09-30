import { NOMBRE_PLATAFORMA, type Plataforma } from "@compartido/calendario";

/** La red social de una publicación, con su color, para verla de un vistazo. */
const COLOR: Record<Plataforma, string> = {
  youtube: "bg-red-600 text-white",
  facebook: "bg-blue-600 text-white",
  instagram: "bg-fuchsia-600 text-white",
  tiktok: "bg-cyan-500 text-neutral-950",
};

export function ChipPlataforma({ plataforma, grande = false }: { plataforma: Plataforma; grande?: boolean }) {
  return (
    <span className={`chip ${COLOR[plataforma]} ${grande ? "px-2.5 py-1 text-sm" : ""}`}>
      {NOMBRE_PLATAFORMA[plataforma]}
    </span>
  );
}
