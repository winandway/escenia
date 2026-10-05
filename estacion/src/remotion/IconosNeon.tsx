// Los objetos de neón de los diagramas (estilo neón): figuras en perspectiva
// isométrica, hechas de líneas que brillan, como un holograma. Cada ícono se
// arma con tres piezas (caja, cilindro, techo) y unas pocas líneas encima.
// El centro (0,0,0) es el centro de la baldosa donde va parado el objeto.
import type { ReactNode } from "react";

const C30 = 0.866;
const S30 = 0.5;
type P3 = readonly [number, number, number];

/** De un punto en el espacio (x a la derecha, y a la izquierda, z arriba) a la pantalla. */
export const proyectar = ([x, y, z]: P3): [number, number] => [(x - y) * C30, (x + y) * S30 - z];
const pts = (...ps: P3[]) =>
  ps
    .map(proyectar)
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");

const GROSOR = 2.6;

const Cara: React.FC<{ p: P3[]; color: string; alfa: number; grosor?: number }> = ({
  p,
  color,
  alfa,
  grosor = GROSOR,
}) => (
  <polygon
    points={pts(...p)}
    fill={color}
    fillOpacity={alfa}
    stroke={color}
    strokeWidth={grosor}
    strokeLinejoin="round"
  />
);

const Linea: React.FC<{ p: P3[]; color: string; grosor?: number; alfa?: number }> = ({
  p,
  color,
  grosor = GROSOR,
  alfa = 1,
}) => (
  <polyline
    points={pts(...p)}
    fill="none"
    stroke={color}
    strokeOpacity={alfa}
    strokeWidth={grosor}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

type Bloque = { x: number; y: number; z: number; w: number; d: number; h: number };

/** Una caja: se ven la tapa, la cara de la derecha y la de la izquierda. */
const Caja: React.FC<Bloque & { color: string; alfa?: number }> = ({ x, y, z, w, d, h, color, alfa = 1 }) => (
  <g>
    <Cara
      p={[
        [x, y + d, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ]}
      color={color}
      alfa={0.07 * alfa}
    />
    <Cara
      p={[
        [x + w, y, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x + w, y, z + h],
      ]}
      color={color}
      alfa={0.16 * alfa}
    />
    <Cara
      p={[
        [x, y, z + h],
        [x + w, y, z + h],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ]}
      color={color}
      alfa={0.26 * alfa}
    />
  </g>
);

/** Un techo a dos aguas sobre una caja, con el caballete a lo largo de x. */
const Techo: React.FC<Bloque & { color: string }> = ({ x, y, z, w, d, h, color }) => {
  const a: P3 = [x, y + d / 2, z + h];
  const b: P3 = [x + w, y + d / 2, z + h];
  return (
    <g>
      <Cara p={[[x, y, z], [x + w, y, z], b, a]} color={color} alfa={0.05} />
      <Cara p={[[x, y + d, z], [x + w, y + d, z], b, a]} color={color} alfa={0.2} />
      <Cara p={[[x + w, y, z], [x + w, y + d, z], b]} color={color} alfa={0.12} />
    </g>
  );
};

/** Un cilindro parado: en esta perspectiva, un círculo del piso se ve como una elipse. */
const Cilindro: React.FC<{ x: number; y: number; z: number; r: number; h: number; color: string }> = ({
  x,
  y,
  z,
  r,
  h,
  color,
}) => {
  const [cx, abajo] = proyectar([x, y, z]);
  const arriba = abajo - h;
  const rx = r * 1.2247;
  const ry = r * 0.7071;
  return (
    <g>
      <path
        d={`M ${cx - rx} ${arriba} L ${cx - rx} ${abajo} A ${rx} ${ry} 0 0 0 ${cx + rx} ${abajo} L ${cx + rx} ${arriba}`}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={GROSOR}
        strokeLinejoin="round"
      />
      <ellipse
        cx={cx}
        cy={arriba}
        rx={rx}
        ry={ry}
        fill={color}
        fillOpacity={0.26}
        stroke={color}
        strokeWidth={GROSOR}
      />
    </g>
  );
};

const Bola: React.FC<{ p: P3; r: number; color: string; alfa?: number }> = ({ p, r, color, alfa = 0.2 }) => {
  const [cx, cy] = proyectar(p);
  return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={alfa} stroke={color} strokeWidth={GROSOR} />;
};

const Letra: React.FC<{ p: P3; texto: string; color: string; tam?: number }> = ({
  p,
  texto,
  color,
  tam = 30,
}) => {
  const [cx, cy] = proyectar(p);
  return (
    <text
      x={cx}
      y={cy}
      fill={color}
      fontSize={tam}
      fontWeight={900}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Arial, Helvetica, sans-serif"
    >
      {texto}
    </text>
  );
};

const Persona: React.FC<{ x?: number; y?: number; color: string }> = ({ x = 0, y = 0, color }) => (
  <g>
    <Cilindro x={x} y={y} z={0} r={19} h={44} color={color} />
    <Bola p={[x, y, 70]} r={17} color={color} />
  </g>
);

/** Los íconos que entiende el guion. `c` es el color del objeto y `c2` el de sus detalles. */
export const ICONOS: Record<string, (c: string, c2: string) => ReactNode> = {
  persona: (c) => <Persona color={c} />,
  vendedor: (c, c2) => (
    <g>
      <Persona x={-6} y={-14} color={c} />
      <Caja x={-40} y={18} z={0} w={80} d={20} h={30} color={c2} />
    </g>
  ),
  tienda: (c, c2) => (
    <g>
      <Caja x={-40} y={-34} z={0} w={80} d={68} h={52} color={c} />
      <Caja x={-44} y={34} z={38} w={88} d={14} h={6} color={c2} />
      <Cara
        p={[
          [-12, 34, 0],
          [12, 34, 0],
          [12, 34, 30],
          [-12, 34, 30],
        ]}
        color={c2}
        alfa={0.3}
      />
      <Linea
        p={[
          [40, -20, 30],
          [40, 16, 30],
          [40, 16, 14],
          [40, -20, 14],
          [40, -20, 30],
        ]}
        color={c2}
      />
    </g>
  ),
  producto: (c, c2) => (
    <g>
      <Caja x={-28} y={-28} z={0} w={56} d={56} h={52} color={c} />
      <Linea
        p={[
          [0, -28, 52],
          [0, 28, 52],
          [0, 28, 30],
        ]}
        color={c2}
      />
      <Cara
        p={[
          [28, -14, 14],
          [28, 14, 14],
          [28, 14, 34],
          [28, -14, 34],
        ]}
        color={c2}
        alfa={0.3}
      />
    </g>
  ),
  deposito: (c, c2) => (
    <g>
      <Caja x={-48} y={-38} z={0} w={96} d={76} h={40} color={c} />
      <Techo x={-48} y={-38} z={40} w={96} d={76} h={22} color={c} />
      <Cara
        p={[
          [48, -18, 0],
          [48, 18, 0],
          [48, 18, 28],
          [48, -18, 28],
        ]}
        color={c2}
        alfa={0.3}
      />
      <Caja x={20} y={44} z={0} w={18} d={18} h={18} color={c2} />
      <Caja x={-6} y={48} z={0} w={18} d={18} h={18} color={c2} />
    </g>
  ),
  dinero: (c, c2) => (
    <g>
      <Cilindro x={0} y={0} z={0} r={26} h={9} color={c2} />
      <Cilindro x={0} y={0} z={12} r={26} h={9} color={c2} />
      <Cilindro x={0} y={0} z={24} r={26} h={9} color={c2} />
      <Letra p={[0, 0, 33]} texto="$" color={c} tam={26} />
    </g>
  ),
  factura: (c, c2) => (
    <g>
      <Caja x={-28} y={-3} z={0} w={56} d={6} h={74} color={c} />
      {[58, 46, 34].map((z) => (
        <Linea
          key={z}
          p={[
            [-18, 3, z],
            [18, 3, z],
          ]}
          color={c2}
        />
      ))}
      <Linea
        p={[
          [-18, 3, 16],
          [2, 3, 16],
        ]}
        color={c2}
        grosor={5}
      />
    </g>
  ),
  carrito: (c, c2) => (
    <g>
      <Caja x={-30} y={-20} z={16} w={60} d={40} h={30} color={c} />
      <Bola p={[-18, 20, 7]} r={7} color={c2} alfa={0.4} />
      <Bola p={[26, 20, 7]} r={7} color={c2} alfa={0.4} />
      <Linea
        p={[
          [-30, 20, 46],
          [-46, 20, 60],
        ]}
        color={c2}
      />
    </g>
  ),
  servidor: (c, c2) => (
    <g>
      <Caja x={-26} y={-26} z={0} w={52} d={52} h={80} color={c} />
      {[62, 42, 22].map((z) => (
        <g key={z}>
          <Linea
            p={[
              [26, -18, z],
              [26, 8, z],
            ]}
            color={c2}
          />
          <Bola p={[26, 17, z]} r={3.5} color={c2} alfa={1} />
        </g>
      ))}
    </g>
  ),
  datos: (c) => (
    <g>
      <Cilindro x={0} y={0} z={0} r={30} h={18} color={c} />
      <Cilindro x={0} y={0} z={24} r={30} h={18} color={c} />
      <Cilindro x={0} y={0} z={48} r={30} h={18} color={c} />
    </g>
  ),
  telefono: (c, c2) => (
    <g>
      <Caja x={-20} y={-4} z={0} w={40} d={8} h={74} color={c} />
      <Cara
        p={[
          [-14, 4, 12],
          [14, 4, 12],
          [14, 4, 64],
          [-14, 4, 64],
        ]}
        color={c2}
        alfa={0.28}
      />
    </g>
  ),
  computadora: (c, c2) => (
    <g>
      <Caja x={-20} y={-12} z={0} w={40} d={24} h={6} color={c} />
      <Caja x={-4} y={-3} z={6} w={8} d={6} h={20} color={c} />
      <Caja x={-38} y={-3} z={26} w={76} d={6} h={50} color={c} />
      <Cara
        p={[
          [-30, 3, 34],
          [30, 3, 34],
          [30, 3, 68],
          [-30, 3, 68],
        ]}
        color={c2}
        alfa={0.28}
      />
    </g>
  ),
  nube: (c, c2) => {
    const [cx, cy] = proyectar([0, 0, 58]);
    return (
      <g>
        <Linea
          p={[
            [-16, 0, 0],
            [-16, 0, 34],
          ]}
          color={c2}
          alfa={0.7}
        />
        <Linea
          p={[
            [16, 0, 0],
            [16, 0, 34],
          ]}
          color={c2}
          alfa={0.7}
        />
        <path
          d={`M ${cx - 34} ${cy + 16} a 16 16 0 0 1 2 -32 a 22 22 0 0 1 40 -8 a 18 18 0 0 1 26 22 a 12 12 0 0 1 -6 18 z`}
          fill={c}
          fillOpacity={0.2}
          stroke={c}
          strokeWidth={GROSOR}
          strokeLinejoin="round"
        />
      </g>
    );
  },
  camion: (c, c2) => (
    <g>
      <Caja x={-46} y={-18} z={10} w={58} d={36} h={42} color={c} />
      <Caja x={12} y={-18} z={10} w={28} d={36} h={28} color={c2} />
      <Bola p={[-28, 18, 8]} r={8} color={c2} alfa={0.4} />
      <Bola p={[24, 18, 8]} r={8} color={c2} alfa={0.4} />
    </g>
  ),
  banco: (c, c2) => (
    <g>
      <Caja x={-46} y={-32} z={0} w={92} d={64} h={8} color={c} />
      <Caja x={-38} y={-26} z={8} w={76} d={52} h={36} color={c} />
      {[-26, -9, 8, 25].map((x) => (
        <Linea
          key={x}
          p={[
            [x, 26, 8],
            [x, 26, 44],
          ]}
          color={c2}
        />
      ))}
      <Techo x={-46} y={-32} z={44} w={92} d={64} h={20} color={c} />
    </g>
  ),
  grafica: (c, c2) => (
    <g>
      <Caja x={-40} y={-10} z={0} w={22} d={22} h={24} color={c} />
      <Caja x={-11} y={-10} z={0} w={22} d={22} h={46} color={c} />
      <Caja x={18} y={-10} z={0} w={22} d={22} h={72} color={c2} />
    </g>
  ),
  candado: (c, c2) => {
    const [ax, ay] = proyectar([-14, 0, 40]);
    const [bx, by] = proyectar([14, 0, 40]);
    return (
      <g>
        <path
          d={`M ${ax} ${ay} v -14 a ${(bx - ax) / 2} ${(bx - ax) / 2} 0 0 1 ${bx - ax} ${by - ay} v 14`}
          fill="none"
          stroke={c2}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Caja x={-24} y={-14} z={0} w={48} d={28} h={40} color={c} />
      </g>
    );
  },
  engranaje: (c, c2) => {
    const [cx, cy] = proyectar([0, 0, 46]);
    const dientes = Array.from({ length: 8 }, (_, k) => (k * Math.PI) / 4);
    return (
      <g>
        <Linea
          p={[
            [0, 0, 0],
            [0, 0, 16],
          ]}
          color={c2}
          alfa={0.7}
        />
        {dientes.map((a) => (
          <line
            key={a}
            x1={cx + Math.cos(a) * 24}
            y1={cy + Math.sin(a) * 24}
            x2={cx + Math.cos(a) * 36}
            y2={cy + Math.sin(a) * 36}
            stroke={c}
            strokeWidth={9}
            strokeLinecap="round"
          />
        ))}
        <circle cx={cx} cy={cy} r={26} fill={c} fillOpacity={0.2} stroke={c} strokeWidth={GROSOR} />
        <circle cx={cx} cy={cy} r={9} fill="none" stroke={c2} strokeWidth={GROSOR} />
      </g>
    );
  },
  casa: (c, c2) => (
    <g>
      <Caja x={-34} y={-30} z={0} w={68} d={60} h={40} color={c} />
      <Techo x={-34} y={-30} z={40} w={68} d={60} h={26} color={c} />
      <Cara
        p={[
          [34, -8, 0],
          [34, 8, 0],
          [34, 8, 24],
          [34, -8, 24],
        ]}
        color={c2}
        alfa={0.35}
      />
      <Cara
        p={[
          [-14, 30, 16],
          [2, 30, 16],
          [2, 30, 30],
          [-14, 30, 30],
        ]}
        color={c2}
        alfa={0.35}
      />
    </g>
  ),
  edificio: (c, c2) => (
    <g>
      <Caja x={-28} y={-26} z={0} w={56} d={52} h={98} color={c} />
      {[78, 58, 38, 18].map((z) => (
        <g key={z}>
          <Linea
            p={[
              [28, -16, z],
              [28, -4, z],
            ]}
            color={c2}
            grosor={4}
          />
          <Linea
            p={[
              [28, 6, z],
              [28, 18, z],
            ]}
            color={c2}
            grosor={4}
          />
          <Linea
            p={[
              [-16, 26, z],
              [-4, 26, z],
            ]}
            color={c2}
            grosor={4}
            alfa={0.6}
          />
          <Linea
            p={[
              [6, 26, z],
              [18, 26, z],
            ]}
            color={c2}
            grosor={4}
            alfa={0.6}
          />
        </g>
      ))}
    </g>
  ),
  ia: (c, c2) => (
    <g>
      <Caja x={-34} y={-34} z={0} w={68} d={68} h={12} color={c} />
      {[-20, 0, 20].map((k) => (
        <g key={k}>
          <Linea
            p={[
              [34, k, 6],
              [46, k, 6],
            ]}
            color={c2}
          />
          <Linea
            p={[
              [k, 34, 6],
              [k, 46, 6],
            ]}
            color={c2}
          />
        </g>
      ))}
      <Caja x={-18} y={-18} z={12} w={36} d={36} h={26} color={c2} />
      <Letra p={[0, 0, 38]} texto="IA" color="#fff" tam={18} />
    </g>
  ),
  reloj: (c, c2) => {
    const [cx, cy] = proyectar([0, 0, 48]);
    return (
      <g>
        <Caja x={-14} y={-8} z={0} w={28} d={16} h={10} color={c} />
        <circle cx={cx} cy={cy} r={32} fill={c} fillOpacity={0.16} stroke={c} strokeWidth={GROSOR} />
        <polyline
          points={`${cx},${cy - 20} ${cx},${cy} ${cx + 14},${cy + 8}`}
          fill="none"
          stroke={c2}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  },
  correo: (c, c2) => (
    <g>
      <Caja x={-36} y={-3} z={8} w={72} d={6} h={48} color={c} />
      <Linea
        p={[
          [-36, 3, 56],
          [0, 3, 30],
          [36, 3, 56],
        ]}
        color={c2}
      />
    </g>
  ),
  tarjeta: (c, c2) => (
    <g>
      <Caja x={-36} y={-3} z={12} w={72} d={6} h={46} color={c} />
      <Linea
        p={[
          [-36, 3, 44],
          [36, 3, 44],
        ]}
        color={c2}
        grosor={7}
      />
      <Linea
        p={[
          [-26, 3, 24],
          [-6, 3, 24],
        ]}
        color={c2}
      />
    </g>
  ),
  alerta: (c, c2) => {
    const [cx, cy] = proyectar([0, 0, 44]);
    return (
      <g>
        <Linea
          p={[
            [0, 0, 0],
            [0, 0, 12],
          ]}
          color={c2}
          alfa={0.7}
        />
        <path
          d={`M ${cx} ${cy - 36} L ${cx + 38} ${cy + 28} L ${cx - 38} ${cy + 28} Z`}
          fill={c2}
          fillOpacity={0.2}
          stroke={c2}
          strokeWidth={GROSOR + 0.6}
          strokeLinejoin="round"
        />
        <Letra p={[0, 0, 36]} texto="!" color={c2} tam={38} />
      </g>
    );
  },
  listo: (c, c2) => {
    const [cx, cy] = proyectar([0, 0, 46]);
    return (
      <g>
        <Linea
          p={[
            [0, 0, 0],
            [0, 0, 12],
          ]}
          color={c2}
          alfa={0.7}
        />
        <circle cx={cx} cy={cy} r={32} fill={c} fillOpacity={0.18} stroke={c} strokeWidth={GROSOR} />
        <polyline
          points={`${cx - 15},${cy + 1} ${cx - 3},${cy + 13} ${cx + 17},${cy - 12}`}
          fill="none"
          stroke={c2}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  },
};

/** Los nombres que el guion puede pedir (los mismos de `ICONOS_DIAGRAMA` en compartido/guion.ts). */
export const NOMBRES_DE_ICONOS = Object.keys(ICONOS);

/** El objeto de un nodo; si el guion pide uno que no existe, va una caja. */
export function iconoNeon(nombre: string, c: string, c2: string): ReactNode {
  return (ICONOS[nombre] ?? ICONOS.producto)?.(c, c2) ?? null;
}

/** La baldosa donde va parado cada objeto: una losa en perspectiva con su aro. */
export const Baldosa: React.FC<{ color: string; lado?: number; encendida: number }> = ({
  color,
  lado = 64,
  encendida,
}) => (
  <g>
    <Caja
      x={-lado}
      y={-lado}
      z={-12}
      w={lado * 2}
      d={lado * 2}
      h={12}
      color={color}
      alfa={0.5 + encendida * 0.8}
    />
    <ellipse
      cx={0}
      cy={0}
      rx={lado * 0.78 * 1.2247}
      ry={lado * 0.78 * 0.7071}
      fill="none"
      stroke={color}
      strokeOpacity={0.35 + encendida * 0.45}
      strokeWidth={1.6}
      strokeDasharray="5 9"
    />
  </g>
);
