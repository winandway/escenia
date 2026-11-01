// El ícono de una sección de Docs: un trazo SVG del color del texto.
export function Icono({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
