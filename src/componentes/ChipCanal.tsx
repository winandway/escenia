import { NOMBRE_CANAL, type Canal } from "@compartido/tematicas";

/** El canal de un video, con su color, para no confundir los de un canal con los del otro. */
const COLOR: Record<Canal, string> = {
  "canal-ia": "border border-emerald-600/70 bg-emerald-500/15 text-emerald-300",
  "caprichoso-tv": "border border-amber-600/70 bg-amber-500/15 text-amber-300",
};

export function ChipCanal({ canal }: { canal: Canal }) {
  return <span className={`chip ${COLOR[canal]}`}>{NOMBRE_CANAL[canal]}</span>;
}
