import { Composition } from "remotion";
import { duracionEnFrames, esquemaPropsVideo, FPS, type PropsVideo } from "./props";
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
    },
  ],
  producto: null,
  vozDePrueba: false,
  tema: "tech",
  sfx: { whoosh: [], pop: null, riser: null, ding: null, boom: null },
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
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEnFrames(props.duracionMs) })}
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
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEnFrames(props.duracionMs) })}
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
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEnFrames(props.duracionMs) })}
    />
  </>
);
