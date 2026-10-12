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
import { Cancion } from "./Cancion";
import { TechExplainer } from "./TechExplainer";
import { Monigotes, esquemaMonigotes, type PropsMonigotes } from "./Monigotes";

const monigotesVacio: PropsMonigotes = {
  titulo: ["", ""],
  marca: "",
  audio: "",
  duracionMs: 3000,
  escenas: [],
  subtitulos: [],
};

const portadaVacia: PropsPortada = {
  formato: "horizontal",
  sujeto: null,
  fondoFoto: null,
  objeto: null,
  etiqueta: "",
  cifra: "",
  linea: "",
  remate: "",
  chips: [],
  logo: null,
  fondo: ["#d00000", "#14000a"],
  acento: "#ffd60a",
  trama: "puntos",
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
  idioma: "es",
  artista: "",
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
      id="Monigotes"
      component={Monigotes}
      schema={esquemaMonigotes}
      defaultProps={monigotesVacio}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={Math.ceil((monigotesVacio.duracionMs / 1000) * FPS)}
      // Justo lo que dura la voz: sin cola en negro al final (el formato no termina en negro).
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, Math.ceil((props.duracionMs / 1000) * FPS)),
      })}
    />
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
    {/* Formato Canción: Richard cantando con su fondo real y un boceto a lápiz por verso (vertical). */}
    <Composition
      id="Cancion"
      component={Cancion}
      schema={esquemaPropsVideo}
      defaultProps={{ ...vacio, estilo: "cancion" }}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={duracionEnFrames(vacio.duracionMs)}
      calculateMetadata={({ props }) => ({ durationInFrames: framesDe(props) })}
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
