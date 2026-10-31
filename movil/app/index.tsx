// La puerta: con sesión, a los proyectos; sin sesión, a entrar.
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEstado } from "../src/estado";
import { C } from "../src/tema";

export default function Inicio() {
  const { listo, cuenta } = useEstado();
  if (!listo)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.fondo }}>
        <ActivityIndicator color={C.acento} />
      </View>
    );
  return <Redirect href={cuenta ? "/proyectos" : "/entrar"} />;
}
