import { Composition } from "remotion";
import { Portada } from "./Portada";
import { duracionEnFrames, esquemaPortada, esquemaPropsVideo, FPS, framesDe, type PropsVideo } from "./props";
import { Miniatura } from "./Miniatura";
import { TechExplainer } from "./TechExplainer";

const vacio: PropsVideo = {
  titulo: "Escenia",
  audio: "",
  duracionMs: 3000,
  palabras: [],
  escenas: [
    {
      parte: "gancho",
      inicioMs: 0,
      finMs: 3000,
      textoEnPantalla: "",
      estilo: "clip",
      clip: null,
      foto: null,
      fotos: [],
      recorte: null,
      interludio: false,
      fondoFoto: null,
      planos: [],
    },
  ],
  producto: null,
  vozDePrueba: false,
  tema: "tech",
  sfx: { whoosh: [], pop: null, riser: null, ding: null, boom: null, corte: [] },
  musica: null,
  marca: null,
  ventana: null,
  cierre: null,
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="TechExplainer"
      component={TechExplainer}
      schema={esquemaPropsVideo}
      defaultProps={vacio}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={duracionEnFrames(vacio.duracionMs)}
      calculateMetadata={({ props }) => ({ durationInFrames: framesDe(props) })}
    />
    <Composition
      id="MiniDocumental"
      component={TechExplainer}
      schema={esquemaPropsVideo}
      defaultProps={{ ...vacio, tema: "documental" }}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={duracionEnFrames(vacio.duracionMs)}
      calculateMetadata={({ props }) => ({ durationInFrames: framesDe(props) })}
    />
    <Composition
      id="Miniatura"
      component={Miniatura}
      schema={esquemaPropsVideo}
      defaultProps={vacio}
      fps={FPS}
      width={1280}
      height={720}
      durationInFrames={1}
    />
    <Composition
      id="Portada"
      component={Portada}
      schema={esquemaPortada}
      defaultProps={{
        sujeto: { ruta: "portada/sujeto.png", ancho: 1000, alto: 1200 },
        objeto: null,
        etiqueta: "",
        cifra: "",
        linea: "",
        remate: "",
        acercar: 1.2,
        fondo: ["#d00000", "#14000a"],
        acento: "#ffd60a",
      }}
      fps={FPS}
      width={1280}
      height={720}
      durationInFrames={1}
    />
    <Composition
      id="TechExplainerShort"
      component={TechExplainer}
      schema={esquemaPropsVideo}
      defaultProps={vacio}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={duracionEnFrames(vacio.duracionMs)}
      calculateMetadata={({ props }) => ({ durationInFrames: framesDe(props) })}
    />
  </>
);
