// El video sintético con el que se mide el taller en la nube (C-TALLER-3). Va aparte de `taller.ts`
// para que las pruebas de la raíz lo puedan revisar sin las piezas de Remotion que solo tiene la Estación.
import { esquemaPropsVideo, type PropsVideo } from "./remotion/props";

/** Un video de prueba sin material: 62 s en escenas de texto (lo mismo que dura el comercial t40). */
export function propsDePrueba(segundos = 62, audio = "silencio.wav"): PropsVideo {
  const porEscena = 3100;
  const n = Math.ceil((segundos * 1000) / porEscena);
  return esquemaPropsVideo.parse({
    titulo: "Prueba del taller",
    // La plantilla siempre suena: con audio vacío pedía la carpeta entera y fallaba (C-TALLER-3).
    audio,
    duracionMs: n * porEscena,
    palabras: [],
    producto: null,
    escenas: Array.from({ length: n }, (_, k) => ({
      parte: k === 0 ? "gancho" : "contexto",
      inicioMs: k * porEscena,
      finMs: (k + 1) * porEscena,
      textoEnPantalla: `Escena ${k + 1} de ${n}`,
      estilo: k % 2 ? "frase" : "titular",
      clip: null,
    })),
  });
}
