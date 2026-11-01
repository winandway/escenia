// Ayuda (C-AYUDA-1): «Tus casos» y el formulario para abrir uno nuevo. Se abre sin cuenta (desde la
// pantalla de entrar) y con cuenta (menú de tres puntos). Cada casilla guarda lo escrito mientras se
// escribe y se borra solo cuando el caso queda creado (regla global de formularios).
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorDeApi, pedir } from "../../src/api";
import { direccionParaAyuda } from "../../src/avisos";
import { anotarCaso, misCasos, type EstadoCaso } from "../../src/casos";
import { Insignia } from "../../src/Insignia";
import { useEstado } from "../../src/estado";
import { correoValido } from "../../src/logica";
import { C } from "../../src/tema";
import { useBorrador } from "../../src/useBorrador";

type Caso = { codigo: string; numero: string; asunto: string; estado: EstadoCaso };

function Campo(props: TextInputProps & { etiqueta: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: C.suave, fontWeight: "600", marginBottom: 6 }}>{props.etiqueta}</Text>
      <TextInput
        placeholderTextColor="#64748b"
        {...props}
        style={{
          color: C.texto,
          backgroundColor: C.panel,
          borderColor: C.borde,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          minHeight: props.multiline ? 120 : undefined,
          textAlignVertical: props.multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

export default function Ayuda() {
  const { t, idioma, cuenta } = useEstado();
  const router = useRouter();
  const dueno = cuenta ?? "sin-cuenta";
  const nombre = useBorrador("ayuda-nombre", dueno);
  const correo = useBorrador("ayuda-correo", dueno);
  const asunto = useBorrador("ayuda-asunto", dueno);
  const mensaje = useBorrador("ayuda-mensaje", dueno);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const recuperado = nombre.recuperado || correo.recuperado || asunto.recuperado || mensaje.recuperado;

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const codigos = await misCasos();
        if (!codigos.length) return;
        const r = await pedir<{ casos: Caso[] }>(`/datos/ayuda/casos?codigos=${codigos.join(",")}`).catch(
          () => null,
        );
        if (r) setCasos(r.casos);
      })();
    }, []),
  );

  function empezarDeNuevo() {
    for (const b of [nombre, correo, asunto, mensaje]) b.descartar();
  }

  async function mandar() {
    if (enviando) return;
    if (
      !nombre.texto.trim() ||
      !correoValido(correo.texto) ||
      !asunto.texto.trim() ||
      !mensaje.texto.trim()
    ) {
      setError(t("ayuda_faltan"));
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const r = await pedir<{ codigo: string }>("/datos/ayuda/casos", {
        metodo: "POST",
        cuerpo: {
          origen: "app",
          idioma,
          nombre: nombre.texto.trim(),
          correo: correo.texto.trim(),
          asunto: asunto.texto.trim(),
          mensaje: mensaje.texto.trim(),
          aviso_token: await direccionParaAyuda(),
        },
      });
      // Solo con el caso creado se borra lo escrito; si falló, todo sigue en su sitio.
      await anotarCaso(r.codigo);
      empezarDeNuevo();
      router.push({ pathname: "/ayuda/[codigo]", params: { codigo: r.codigo } });
    } catch (e) {
      const codigo = e instanceof ErrorDeApi ? e.codigo : "red";
      setError(
        codigo === "intentos" ? t("ayuda_intentos") : codigo === "datos" ? t("ayuda_faltan") : t("error_red"),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: C.fondo }}>
      <Stack.Screen options={{ title: t("ayuda_titulo") }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {casos.length ? (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: C.texto, fontSize: 20, fontWeight: "800", marginBottom: 10 }}>
                {t("ayuda_mis_casos")}
              </Text>
              {casos.map((c) => (
                <Pressable
                  key={c.codigo}
                  onPress={() => router.push({ pathname: "/ayuda/[codigo]", params: { codigo: c.codigo } })}
                  style={({ pressed }) => ({
                    backgroundColor: C.panel,
                    borderColor: C.borde,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: C.suave, fontSize: 12 }}>{c.numero}</Text>
                  <Text
                    style={{ color: C.texto, fontSize: 16, fontWeight: "700", marginVertical: 6 }}
                    numberOfLines={2}
                  >
                    {c.asunto}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <Insignia estado={c.estado} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={{ color: C.texto, fontSize: 20, fontWeight: "800" }}>{t("ayuda_nuevo")}</Text>
          <Text style={{ color: C.suave, marginTop: 6, lineHeight: 21 }}>{t("ayuda_nuevo_sub")}</Text>
          {recuperado ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              <Text style={{ color: C.acento }}>{t("chat_recuperado")}</Text>
              <Pressable accessibilityRole="button" onPress={empezarDeNuevo}>
                <Text style={{ color: C.acento, textDecorationLine: "underline" }}>
                  {t("chat_empezar_de_nuevo")}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <Campo
            etiqueta={t("ayuda_nombre")}
            value={nombre.texto}
            onChangeText={nombre.escribir}
            autoComplete="name"
            textContentType="name"
            maxLength={80}
          />
          <Campo
            etiqueta={t("ayuda_correo")}
            value={correo.texto}
            onChangeText={correo.escribir}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={120}
          />
          <Campo
            etiqueta={t("ayuda_asunto")}
            placeholder={t("ayuda_asunto_ph")}
            value={asunto.texto}
            onChangeText={asunto.escribir}
            maxLength={120}
          />
          <Campo
            etiqueta={t("ayuda_mensaje_etiqueta")}
            placeholder={t("ayuda_mensaje")}
            value={mensaje.texto}
            onChangeText={mensaje.escribir}
            multiline
            maxLength={4000}
          />
          <Text style={{ color: C.suave, fontSize: 12, marginTop: 10 }}>{t("ayuda_no_mandes")}</Text>
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
              opacity: pressed || enviando ? 0.7 : 1,
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
              {enviando ? t("chat_mandando") : t("ayuda_mandar")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
