// El estudio del Podcast IA (docs/PODCAST.md): a pantalla completa, sin la barra del panel, para grabarlo
// tal cual. Detrás del inicio de sesión como todo el panel.
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import {
  conexionDelPodcast,
  fichasActivas,
  segundosUsadosHoy,
  topeMinutos,
  ultimoErrorDelPodcast,
} from "@/lib/podcast";
import { fichaLista, minutosParaMostrar } from "@compartido/podcast";
import { Estudio, type FichaDelEstudio } from "./Estudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Podcast IA · estudio" };

export default async function PaginaEstudio({ searchParams }: PageProps<"/podcast">) {
  await exigirSesion();
  const pedida = Number((await searchParams).ficha);
  const { db, env } = await contexto();
  const [fichas, conexion, usados, tope, error] = await Promise.all([
    fichasActivas(db),
    conexionDelPodcast(db, env),
    segundosUsadosHoy(db),
    topeMinutos(db),
    ultimoErrorDelPodcast(db),
  ]);
  // Al navegador va solo lo que se ve en escena: la historia se queda en el servidor.
  const enEscena: FichaDelEstudio[] = fichas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    etiqueta: f.etiqueta,
    tema: f.tema,
    ejemplo: f.ejemplo,
    falta: fichaLista(f),
  }));
  return (
    <Estudio
      fichas={enEscena}
      conectado={conexion !== null}
      minutosHoy={minutosParaMostrar(usados)}
      topeMinutos={tope}
      errorConexion={error?.mensaje ?? null}
      fichaInicial={enEscena.some((f) => f.id === pedida) ? pedida : null}
    />
  );
}
