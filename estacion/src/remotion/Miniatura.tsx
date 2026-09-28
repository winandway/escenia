// Miniatura (portada) del video largo, 1280×720: la foto de la persona a
// pantalla completa, recortada sobre su cara, con el nombre grande y el gancho.
// Se renderiza como imagen fija y sale en el cierre de los shorts.
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { posicionObjeto } from "./enfoque";
import type { PropsVideo } from "./props";

const { fontFamily } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin", "latin-ext"] });
const { fontFamily: serif } = loadSerif("normal", { weights: ["900"], subsets: ["latin", "latin-ext"] });

function textosMiniatura(titulo: string): { nombre: string; gancho: string } {
  const [antes, ...resto] = titulo.split(/[:—–]/);
  const recortar = (s: string, max: number) => {
    const limpio = s.replace(/\s+/g, " ").trim();
    return limpio.length <= max ? limpio : `${limpio.slice(0, max - 1).replace(/\s+\S*$/u, "")}…`;
  };
  return { nombre: recortar(antes ?? titulo, 28), gancho: recortar(resto.join(" "), 60) };
}

export const Miniatura: React.FC<PropsVideo> = (p) => {
  const { width, height } = useVideoConfig();
  // La mejor foto: la primera con cara detectada; si no, la primera que haya.
  const fotos = p.escenas.flatMap((e) => [...(e.foto ? [e.foto] : []), ...e.fotos]);
  const foto = fotos.find((f) => f.enfoque) ?? fotos[0] ?? null;
  const documental = p.tema === "documental";
  const acento = documental ? "#e8b04b" : "#f59e0b";
  const { nombre, gancho } = textosMiniatura(p.titulo);
  const pos = foto
    ? posicionObjeto(
        { ancho: foto.ancho, alto: foto.alto },
        { ancho: width, alto: height },
        foto.enfoque ?? null,
      )
    : { x: 50, y: 50 };
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0b", fontFamily }}>
      {foto && (
        <Img
          src={staticFile(foto.ruta)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${pos.x}% ${pos.y}%` }}
        />
      )}
      <AbsoluteFill
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.45) 45%, rgba(0,0,0,0) 75%)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", padding: "60px 70px", width: "62%" }}>
        <div style={{ width: 120, height: 12, backgroundColor: acento, borderRadius: 6, marginBottom: 22 }} />
        <div
          style={{
            fontSize: nombre.length > 16 ? 84 : 104,
            fontWeight: 900,
            lineHeight: 0.98,
            color: "#fff",
            fontFamily: documental ? serif : fontFamily,
            textShadow: "0 6px 30px rgba(0,0,0,.9)",
          }}
        >
          {nombre}
        </div>
        {gancho && (
          <div
            style={{
              marginTop: 22,
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.15,
              color: acento,
              textShadow: "0 4px 20px rgba(0,0,0,.9)",
            }}
          >
            {gancho}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
