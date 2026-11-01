// La conversación de un caso de ayuda (C-AYUDA-1), como un chat: lo que escribió la persona a la derecha y
// las respuestas de soporte a la izquierda. Se refresca cada 20 segundos mientras se ve y al tirar hacia
// abajo. La caja de abajo guarda lo escrito mientras se escribe (regla global de formularios).
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorDeApi, pedir } from "../../src/api";
import { direccionParaAyuda } from "../../src/avisos";
import { anotarCaso, type EstadoCaso } from "../../src/casos";
import { useEstado } from "../../src/estado";
import { Insignia } from "../../src/Insignia";
import { C } from "../../src/tema";
import { useBorrador } from "../../src/useBorrador";

type Caso = {
  numero: string;
  asunto: string;
  estado: EstadoCaso;
  mensajes: { de: "cliente" | "soporte"; texto: string; fecha: string }[];
};

export default function ChatDelCaso() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const { t, idioma, cuenta } = useEstado();
  const [caso, setCaso] = useState<Caso | null | "no_existe">(null);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const lista = useRef<FlatList<Caso["mensajes"][number]>>(null);
  const borrador = useBorrador(`ayuda-caso-${codigo}`, cuenta ?? "sin-cuenta");
  const fecha = new Intl.DateTimeFormat(idioma === "es" ? "es-US" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setCaso(await pedir<Caso>(`/datos/ayuda/casos/${encodeURIComponent(codigo)}`));
      setError("");
    } catch (e) {
      if (e instanceof ErrorDeApi && e.status === 404) setCaso("no_existe");
      else setError(t("error_red"));
    } finally {
      setCargando(false);
    }
  }, [codigo, t]);

  useFocusEffect(
    useCallback(() => {
      // Si se abrió desde un aviso, queda también en «Tus casos».
      void anotarCaso(codigo);
      void cargar();
      const cada = setInterval(() => void cargar(), 20_000);
      return () => clearInterval(cada);
    }, [codigo, cargar]),
  );

  async function mandar() {
    const texto = borrador.texto.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    setError("");
    try {
      await pedir(`/datos/ayuda/casos/${encodeURIComponent(codigo)}/mensajes`, {
        metodo: "POST",
        cuerpo: { texto, aviso_token: await direccionParaAyuda() },
      });
      borrador.descartar();
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorDeApi && e.codigo === "intentos" ? t("ayuda_intentos") : t("error_red"));
    } finally {
      setEnviando(false);
    }
  }

  if (caso === null)
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo }}>
        <ActivityIndicator color={C.acento} style={{ marginTop: 40 }} />
      </View>
    );
  if (caso === "no_existe")
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, padding: 24 }}>
        <Stack.Screen options={{ title: t("ayuda_titulo") }} />
        <Text style={{ color: C.texto, fontSize: 17 }}>{t("ayuda_no_existe")}</Text>
      </View>
    );

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: C.fondo }}>
      <Stack.Screen options={{ title: caso.numero }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <Text style={{ color: C.texto, fontSize: 19, fontWeight: "800" }}>{caso.asunto}</Text>
          <View style={{ flexDirection: "row" }}>
            <Insignia estado={caso.estado} />
          </View>
        </View>
        <FlatList
          ref={lista}
          data={caso.mensajes}
          keyExtractor={(m, i) => `${m.fecha}-${i}`}
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={() => void cargar()} tintColor={C.acento} />
          }
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListFooterComponent={
            caso.estado === "abierto" ? (
              <Text style={{ color: C.suave, fontSize: 13, marginTop: 4 }}>{t("ayuda_respondemos")}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const mio = item.de === "cliente";
            return (
              <View
                style={{
                  alignSelf: mio ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  backgroundColor: mio ? C.burbujaYo : C.panel,
                  borderColor: C.borde,
                  borderWidth: mio ? 0 : 1,
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <Text style={{ color: C.suave, fontSize: 12, fontWeight: "700" }}>
                  {mio ? t("chat_yo") : t("ayuda_soporte")} · {fecha.format(new Date(item.fecha))}
                </Text>
                <Text style={{ color: C.texto, fontSize: 16, lineHeight: 22, marginTop: 4 }}>
                  {item.texto}
                </Text>
              </View>
            );
          }}
        />
        <View style={{ borderTopColor: C.borde, borderTopWidth: 1, padding: 12, gap: 8 }}>
          {caso.estado === "cerrado" ? (
            <Text style={{ color: C.suave, fontSize: 13 }}>{t("ayuda_cerrado_nota")}</Text>
          ) : null}
          {borrador.recuperado ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Text style={{ color: C.acento }}>{t("chat_recuperado")}</Text>
              <Pressable accessibilityRole="button" onPress={borrador.descartar}>
                <Text style={{ color: C.acento, textDecorationLine: "underline" }}>
                  {t("chat_empezar_de_nuevo")}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={{ color: C.error }}>
              {error}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <TextInput
              value={borrador.texto}
              onChangeText={borrador.escribir}
              placeholder={t("ayuda_responder")}
              placeholderTextColor="#64748b"
              multiline
              maxLength={4000}
              style={{
                flex: 1,
                color: C.texto,
                backgroundColor: C.panel,
                borderColor: C.borde,
                borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 16,
                maxHeight: 140,
              }}
            />
            <Pressable
              onPress={() => void mandar()}
              disabled={enviando}
              accessibilityRole="button"
              accessibilityLabel={t("ayuda_mandar")}
              style={({ pressed }) => ({
                backgroundColor: C.acento,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed || enviando || !borrador.texto.trim() ? 0.6 : 1,
              })}
            >
              {enviando ? (
                <ActivityIndicator color={C.sobreAcento} />
              ) : (
                <Text style={{ color: C.sobreAcento, fontWeight: "800" }}>{t("ayuda_mandar")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
