// El estado de un caso de ayuda como insignia: lo que salió bien («Te respondimos») va en verde; lo demás,
// en gris (regla global de colores).
import { Text } from "react-native";
import type { EstadoCaso } from "./casos";
import { useEstado } from "./estado";
import { C } from "./tema";

export function Insignia({ estado }: { estado: EstadoCaso }) {
  const { t } = useEstado();
  const bien = estado === "respondido";
  return (
    <Text
      style={{
        color: bien ? "#052e16" : C.texto,
        backgroundColor: bien ? C.exito : C.borde,
        fontSize: 12,
        fontWeight: "700",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      {t(`ayuda_estado_${estado}`)}
    </Text>
  );
}
