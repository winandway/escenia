import { Composition } from "remotion";
import { Portada } from "./Portada";
import {
  duracionEnFrames,
  esquemaPortada,
  esquemaPropsVideo,
  FPS,
  framesDe,
  type PropsPortada,
  type PropsVideo,
} from "./props";
import { Miniatura } from "./Miniatura";
import { TechExplainer } from "./TechExplainer";

const portadaVacia: PropsPortada = {
  formato: "horizontal",
  sujeto: null,
  fondoFoto: null,
  objeto: null,
  etiqueta: "",
  cifra: "",
  linea: "",
  remate: "",
  fondo: ["#d00000", "#14000a"],
  acento: "#ffd60a",
};

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
      diagrama: null,
    },
  ],
  producto: null,
  vozDePrueba: false,
  tema: "tech",
  estilo: "clasico",
  sfx: { whoosh: [], pop: null, riser: null, ding: null, boom: null, corte: [] },
  musica: null,
  marca: null,
  presentador: null,
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
      defaultProps={portadaVacia}
      fps={FPS}
      width={1280}
      height={720}
      durationInFrames={1}
    />
    <Composition
      id="PortadaVertical"
      component={Portada}
      schema={esquemaPortada}
      defaultProps={{ ...portadaVacia, formato: "vertical" }}
      fps={FPS}
      width={1080}
      height={1920}
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
