// Entrar: la contraseña (con su ojito), el selector de idioma arriba y un error claro si algo falla.
// La contraseña no se guarda nunca: ni en el borrador ni en el teléfono (solo el token de la sesión).
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorDeApi, pedir, type Cuenta } from "../src/api";
import { CampoClave } from "../src/CampoClave";
import { useEstado } from "../src/estado";
import { SelectorIdioma } from "../src/SelectorIdioma";
import { C } from "../src/tema";

export default function Entrar() {
  const { t, cuenta, entrar } = useEstado();
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  if (cuenta) return <Redirect href="/proyectos" />;

  async function mandar() {
    if (!clave || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const r = await pedir<{ token: string; cuenta: Cuenta }>("/datos/app/entrar", {
        metodo: "POST",
        cuerpo: { clave },
      });
      setClave("");
      await entrar(r.token, r.cuenta);
    } catch (e) {
      const codigo = e instanceof ErrorDeApi ? e.codigo : "red";
      setError(
        codigo === "clave" ? t("error_clave") : codigo === "intentos" ? t("error_intentos") : t("error_red"),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingTop: 4 }}
        >
          <SelectorIdioma />
        </View>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: C.panel,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Text style={{ color: C.acento, fontSize: 34, marginLeft: 6 }}>▶</Text>
          </View>
          <Text style={{ color: C.suave, fontWeight: "700", letterSpacing: 1, marginBottom: 6 }}>
            ESCENIA
          </Text>
          <Text style={{ color: C.texto, fontSize: 28, fontWeight: "800", lineHeight: 34 }}>
            {t("entrar_titulo")}
          </Text>
          <Text style={{ color: C.suave, fontSize: 16, lineHeight: 23, marginTop: 12, marginBottom: 28 }}>
            {t("entrar_sub")}
          </Text>
          <CampoClave valor={clave} cambiar={setClave} alMandar={() => void mandar()} />
          {error ? (
            <Text accessibilityRole="alert" style={{ color: C.error, marginTop: 10 }}>
              {error}
            </Text>
          ) : null}
          <Pressable
            onPress={() => void mandar()}
            disabled={enviando}
            accessibilityRole="button"
            style={({ pressed }) => ({
              marginTop: 18,
              backgroundColor: C.acento,
              opacity: pressed || enviando || !clave ? 0.7 : 1,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            })}
          >
            {enviando ? <ActivityIndicator color={C.sobreAcento} /> : null}
            <Text style={{ color: C.sobreAcento, fontWeight: "800", fontSize: 17 }}>
              {enviando ? t("entrar_entrando") : t("entrar_boton")}
            </Text>
          </Pressable>
          <Text style={{ color: C.suave, marginTop: 20, lineHeight: 20 }}>{t("entrar_ayuda")}</Text>
          <Pressable
            onPress={() => router.push("/ayuda")}
            accessibilityRole="button"
            hitSlop={8}
            style={{ marginTop: 14, alignSelf: "flex-start" }}
          >
            <Text style={{ color: C.acento, fontWeight: "700", fontSize: 16 }}>{t("ayuda_contactar")} →</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
