// La app de iPhone de Escenia (docs/APP-IPHONE.md): el Director en el bolsillo.
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorDeEstado } from "../src/estado";
import { C } from "../src/tema";

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProveedorDeEstado>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.fondo },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: C.fondo },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="entrar" options={{ headerShown: false }} />
          <Stack.Screen name="proyectos" />
          <Stack.Screen name="proyecto/[id]" />
        </Stack>
      </ProveedorDeEstado>
    </SafeAreaProvider>
  );
}
