// La app de iPhone de Escenia (docs/APP-IPHONE.md): el Director en el bolsillo.
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { casoDelAviso, proyectoDelAviso } from "../src/avisos";
import { ProveedorDeEstado } from "../src/estado";
import { C } from "../src/tema";

/**
 * Al tocar un aviso se abre lo suyo, también si la app estaba cerrada: «Tu video está listo» abre ese
 * proyecto y «Te respondimos tu caso» abre esa conversación de ayuda (C-AYUDA-1).
 */
function AlTocarUnAviso() {
  const router = useRouter();
  useEffect(() => {
    const abrir = (r: Notifications.NotificationResponse | null) => {
      const id = proyectoDelAviso(r);
      if (id) router.push({ pathname: "/proyecto/[id]", params: { id: String(id) } });
      const caso = casoDelAviso(r);
      if (caso) router.push({ pathname: "/ayuda/[codigo]", params: { codigo: caso } });
    };
    abrir(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [router]);
  return null;
}

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProveedorDeEstado>
        <StatusBar style="light" />
        <AlTocarUnAviso />
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
          <Stack.Screen name="ayuda/index" />
          <Stack.Screen name="ayuda/[codigo]" />
        </Stack>
      </ProveedorDeEstado>
    </SafeAreaProvider>
  );
}
