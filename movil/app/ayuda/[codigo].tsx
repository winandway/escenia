// La conversación de un caso de ayuda (C-AYUDA-1), como un chat: lo que escribió la persona a la derecha y
// las respuestas de soporte a la izquierda. Se refresca cada 20 segundos mientras se ve y al tirar hacia
// abajo. La caja de abajo guarda lo escrito mientras se escribe (regla global de formularios).
// Las capturas (C-AYUDA-2) se suben apenas se eligen, cada una sola; si una falla, el texto se queda.
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { subirCaptura } from "../../src/subir";
import { C } from "../../src/tema";
import { useBorrador } from "../../src/useBorrador";

type Caso = {
  numero: string;
  asunto: string;
  estado: EstadoCaso;
  mensajes: {
    de: "cliente" | "soporte";
    texto: string;
    fecha: string;
    adjuntos: { nombre: string; tipo: string; url: string }[];
  }[];
};
type Adjunto = {
  llave: string;
  uri: string;
  nombre: string;
  estado: "subiendo" | "listo" | "error";
  id?: number;
  motivo?: string;
};

const MAX_ADJUNTOS = 3;
const MAX_BYTES = 10 * 1_048_576;

export default function ChatDelCaso() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const { t, idioma, cuenta } = useEstado();
  const [caso, setCaso] = useState<Caso | null | "no_existe">(null);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
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

  const cambiar = (llave: string, cambios: Partial<Adjunto>) =>
    setAdjuntos((l) => l.map((a) => (a.llave === llave ? { ...a, ...cambios } : a)));

  async function elegirCapturas() {
    const libres = MAX_ADJUNTOS - adjuntos.length;
    if (libres <= 0) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: libres,
    });
    if (r.canceled) return;
    for (const [n, a] of r.assets.slice(0, libres).entries()) {
      const llave = `${Date.now()}-${n}`;
      const nombre = a.fileName ?? `captura-${n + 1}.jpg`;
      const grande = (a.fileSize ?? 0) > MAX_BYTES;
      setAdjuntos((l) => [
        ...l,
        {
          llave,
          uri: a.uri,
          nombre,
          estado: grande ? "error" : "subiendo",
          motivo: grande ? t("ayuda_adjunto_grande") : "",
        },
      ]);
      if (grande) continue;
      subirCaptura(a.uri, nombre, a.mimeType ?? "image/jpeg", codigo)
        .then((id) => cambiar(llave, { estado: "listo", id }))
        .catch(() => cambiar(llave, { estado: "error", motivo: t("ayuda_adjunto_fallo") }));
    }
  }

  async function mandar() {
    const texto = borrador.texto.trim();
    const listos = adjuntos.filter((a) => a.estado === "listo" && a.id).map((a) => a.id as number);
    if (enviando || (!texto && !listos.length)) return;
    if (adjuntos.some((a) => a.estado === "subiendo")) return setError(t("ayuda_esperar"));
    setEnviando(true);
    setError("");
    try {
      await pedir(`/datos/ayuda/casos/${encodeURIComponent(codigo)}/mensajes`, {
        metodo: "POST",
        cuerpo: { texto, adjuntos: listos, aviso_token: await direccionParaAyuda() },
      });
      borrador.descartar();
      setAdjuntos([]);
      await cargar();
    } catch (e) {
      // El texto y las capturas se quedan para intentarlo otra vez.
      const codigoError = e instanceof ErrorDeApi ? e.codigo : "red";
      setError(
        codigoError === "intentos"
          ? t("ayuda_intentos")
          : codigoError === "adjuntos"
            ? t("ayuda_reintentar")
            : t("error_red"),
      );
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
                {item.texto ? (
                  <Text style={{ color: C.texto, fontSize: 16, lineHeight: 22, marginTop: 4 }}>
                    {item.texto}
                  </Text>
                ) : null}
                {item.adjuntos.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {item.adjuntos.map((a) => (
                      <Pressable
                        key={a.url}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={a.nombre}
                        onPress={() => void Linking.openURL(a.url)}
                      >
                        <Image source={{ uri: a.url }} style={{ width: 96, height: 96, borderRadius: 10 }} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
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
          {adjuntos.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {adjuntos.map((a) => (
                <View key={a.llave} style={{ width: 72 }}>
                  <View>
                    <Image
                      source={{ uri: a.uri }}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 10,
                        opacity: a.estado === "listo" ? 1 : 0.6,
                      }}
                    />
                    {a.estado === "subiendo" ? (
                      <ActivityIndicator color="#fff" style={{ position: "absolute", top: 26, left: 26 }} />
                    ) : null}
                    <Pressable
                      onPress={() => setAdjuntos((l) => l.filter((x) => x.llave !== a.llave))}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("ayuda_quitar")}: ${a.nombre}`}
                      hitSlop={8}
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(0,0,0,0.7)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800" }}>×</Text>
                    </Pressable>
                  </View>
                  {a.estado === "error" ? (
                    <Text style={{ color: C.error, fontSize: 11, marginTop: 3 }} numberOfLines={3}>
                      {a.motivo}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            onPress={() => void elegirCapturas()}
            disabled={adjuntos.length >= MAX_ADJUNTOS}
            accessibilityRole="button"
            style={{ alignSelf: "flex-start", opacity: adjuntos.length >= MAX_ADJUNTOS ? 0.5 : 1 }}
          >
            <Text style={{ color: C.acento, fontWeight: "700" }}>+ {t("ayuda_adjuntar")}</Text>
            <Text style={{ color: C.suave, fontSize: 12 }}>{t("ayuda_adjuntos_ayuda")}</Text>
          </Pressable>
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
                opacity: pressed || enviando || (!borrador.texto.trim() && !adjuntos.length) ? 0.6 : 1,
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
