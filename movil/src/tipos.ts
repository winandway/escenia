// Lo que manda el panel en /datos/app/encargos/<id> (la forma vive en src/lib/app-encargo.ts del panel).
export type ResultadoApp = {
  estado: "en-fila" | "armando" | "listo" | "error";
  paso: string;
  error: string;
  duracionSeg: number;
  costoUsd: number;
  video: string;
  muestra: boolean;
  trabajoId: number | null;
};

export type PropuestaApp = {
  id: number;
  estado: "propuesta" | "aprobada" | "reemplazada";
  precioUsd: number;
  tipo: "anuncio" | "demostracion" | "locucion";
  nombre: string;
  voz: string;
  persona: string;
  segundos: number;
  frases: { texto: string; enSeg: number | null }[];
  resultado: ResultadoApp | null;
};

export type EncargoApp = {
  id: number;
  titulo: string;
  carpeta: string;
  costoUsd: number;
  mensajes: { id: number; rol: "yo" | "director" | "aviso"; texto: string; propuestaId: number | null }[];
  propuestas: PropuestaApp[];
  videos: { id: number; nombre: string; estado: string; duracionSeg: number; error: string }[];
  enMarcha: boolean;
};
