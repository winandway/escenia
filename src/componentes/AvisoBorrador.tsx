"use client";

export function AvisoBorrador({
  visible,
  alEmpezarDeNuevo,
}: {
  visible: boolean;
  alEmpezarDeNuevo: () => void;
}) {
  if (!visible) return null;
  return (
    <p className="mb-3 flex items-center gap-3 text-sm text-amber-300">
      <span>Recuperamos lo que estabas escribiendo.</span>
      <button type="button" onClick={alEmpezarDeNuevo} className="underline hover:text-amber-100">
        Empezar de nuevo
      </button>
    </p>
  );
}
