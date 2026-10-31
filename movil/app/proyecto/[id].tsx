// El chat con el Director: la conversación, las tarjetas con su precio, los videos subidos y su estado.
// Lo escrito se guarda solo (useBorrador) y vuelve si se cierra la app. Mientras algo está en marcha (un
// video que el estudio mira o arma), la pantalla vuelve a preguntar sola cada cuatro segundos.
import * as ImagePicker from "expo-image-picker";
import { Redirect, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorDeApi, pedir } from "../../src/api";
import { useEstado } from "../../src/estado";
import { mensajeConNotas, nombreDeArchivo, tituloDelProyecto } from "../../src/logica";
import { subirFoto, subirVideo } from "../../src/subir";
import { Tarjeta } from "../../src/Tarjeta";
import { C } from "../../src/tema";
import type { LlaveTexto } from "../../src/textos";
import type { EncargoApp } from "../../src/tipos";
import { useBorrador } from "../../src/useBorrador";

type Subida = {
  clave: string;
  nombre: string;
  tipo: "foto" | "video";
  estado: "subiendo" | "lista" | "error";
  pct?: number;
  error?: string;
};

const ATAJOS: [LlaveTexto, LlaveTexto][] = [
  ["atajo_maggie", "atajo_maggie_texto"],
  ["atajo_fotos", "atajo_fotos_texto"],
  ["atajo_vivo", "atajo_vivo_texto"],
  ["atajo_voz", "atajo_voz_texto"],
];

export default function Proyecto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const encargoId = Number(id);
  const { t, cuenta, idioma } = useEstado();
  const borrador = useBorrador(`chat-${encargoId}`, cuenta ?? "");
  const [encargo, setEncargo] = useState<EncargoApp | null>(null);
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [sinRespuesta, setSinRespuesta] = useState(false);
  const [placeholder, setPlaceholder] = useState<LlaveTexto>("chat_placeholder");
  const lista = useRef<ScrollView>(null);
  const campo = useRef<TextInput>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await pedir<EncargoApp>(`/datos/app/encargos/${encargoId}`);
      setEncargo(r);
      setSinRespuesta(r.mensajes.at(-1)?.rol === "yo");
    } catch (e) {
      if (!(e instanceof ErrorDeApi && e.status === 401)) setError(t("error_red"));
    }
  }, [encargoId, t]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  useEffect(() => {
    if (!encargo?.enMarcha) return;
    const cada = setInterval(() => void cargar(), 4000);
    return () => clearInterval(cada);
  }, [encargo?.enMarcha, cargar]);

  if (!cuenta) return <Redirect href="/entrar" />;

  const anotar = (s: Subida) => setSubidas((todas) => [...todas.filter((x) => x.clave !== s.clave), s]);

  async function subir(assets: ImagePicker.ImagePickerAsset[]) {
    if (!encargo) return;
    for (const [n, a] of assets.entries()) {
      const tipo = a.type === "video" ? "video" : "foto";
      const nombre = nombreDeArchivo(a.fileName, tipo, Date.now() + n);
      const clave = `${a.uri}-${n}`;
      anotar({ clave, nombre, tipo, estado: "subiendo", pct: 0 });
      try {
        if (tipo === "video")
          await subirVideo(a.uri, nombre, encargo.id, (pct) =>
            anotar({ clave, nombre, tipo, estado: "subiendo", pct }),
          );
        else await subirFoto(a.uri, nombre, encargo.carpeta);
        anotar({ clave, nombre, tipo, estado: "lista" });
      } catch (e) {
        anotar({
          clave,
          nombre,
          tipo,
          estado: "error",
          error: e instanceof ErrorDeApi && e.message ? e.message : t("chat_fallo_subida"),
        });
      }
    }
    void cargar();
  }

  async function elegir(camara: boolean) {
    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      allowsMultipleSelection: !camara,
      selectionLimit: 10,
      videoMaxDuration: 600,
    };
    const r = camara
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);
    if (!r.canceled) await subir(r.assets);
  }

  async function mandar(textoLibre?: string) {
    if (!encargo || enviando || subidas.some((s) => s.estado === "subiendo")) return;
    const listas = subidas.filter((s) => s.estado === "lista");
    const texto =
      textoLibre ??
      mensajeConNotas(
        borrador.texto,
        listas.filter((s) => s.tipo === "foto").map((s) => s.nombre),
        listas.filter((s) => s.tipo === "video").map((s) => s.nombre),
        encargo.carpeta,
      );
    if (textoLibre === undefined && !texto) return setError(t("chat_vacio"));
    setEnviando(true);
    setError("");
    try {
      await pedir(`/datos/director/${encargo.id}`, { metodo: "POST", cuerpo: { texto } });
      borrador.descartar();
      setSubidas([]);
      setPlaceholder("chat_placeholder");
    } catch (e) {
      // Si el mensaje quedó guardado aunque la IA fallara, el cuadro se limpia igual: ya está arriba.
      if (e instanceof ErrorDeApi && e.status >= 500) {
        borrador.descartar();
        setSubidas([]);
      }
      setError(e instanceof ErrorDeApi && e.message ? e.message : t("error_red"));
    } finally {
      setEnviando(false);
      await cargar();
      setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 300);
    }
  }

  async function aprobar(propuestaId: number) {
    try {
      await pedir(`/datos/app/propuestas/${propuestaId}/aprobar`, { metodo: "POST" });
    } catch (e) {
      setError(e instanceof ErrorDeApi && e.message ? e.message : t("error_red"));
    }
    await cargar();
  }

  async function otraVez(trabajoId: number) {
    await pedir(`/datos/app/trabajos/${trabajoId}/otra-vez`, { metodo: "POST" }).catch(() =>
      setError(t("error_red")),
    );
    await cargar();
  }

  const yaMostradas = new Set<number>();
  const tarjetaDe = (propuestaId: number | null) => {
    if (!encargo || propuestaId === null || yaMostradas.has(propuestaId)) return null;
    const p = encargo.propuestas.find((x) => x.id === propuestaId);
    if (!p) return null;
    yaMostradas.add(propuestaId);
    return (
      <Tarjeta
        key={`p${p.id}`}
        p={p}
        aprobar={(pid) => void aprobar(pid)}
        cambiar={() => {
          setPlaceholder("tarjeta_cambiar_placeholder");
          campo.current?.focus();
        }}
        otraVez={(tid) => void otraVez(tid)}
      />
    );
  };

  const subiendo = subidas.some((s) => s.estado === "subiendo");

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: C.fondo }}>
      <Stack.Screen
        options={{
          title: encargo ? tituloDelProyecto(encargo.titulo, idioma) : "",
          headerBackTitle: t("volver"),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={lista}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {!encargo ? <ActivityIndicator color={C.acento} style={{ marginTop: 30 }} /> : null}
          {encargo?.videos.map((v) => (
            <View
              key={`v${v.id}`}
              style={{
                backgroundColor: C.panel,
                borderRadius: 12,
                padding: 10,
                borderWidth: 1,
                borderColor: C.borde,
              }}
            >
              <Text style={{ color: C.suave }} numberOfLines={1}>
                🎬 {v.nombre} ·{" "}
                <Text
                  style={{
                    color: v.estado === "listo" ? C.exito : v.estado === "error" ? C.error : C.acento,
                  }}
                >
                  {v.estado === "listo"
                    ? `${Math.floor(v.duracionSeg / 60)}:${String(Math.floor(v.duracionSeg % 60)).padStart(2, "0")} · ${t("chat_mac_listo")}`
                    : v.estado === "error"
                      ? t("chat_video_error")
                      : t("chat_mac_mirando")}
                </Text>
              </Text>
            </View>
          ))}
          {encargo?.mensajes.map((m) => (
            <View key={`m${m.id}`} style={{ gap: 10 }}>
              {m.rol === "aviso" ? (
                <Text style={{ color: C.exito, textAlign: "center", fontSize: 13, paddingHorizontal: 12 }}>
                  {m.texto}
                </Text>
              ) : (
                <View
                  style={{
                    alignSelf: m.rol === "yo" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    backgroundColor: m.rol === "yo" ? C.burbujaYo : C.panel,
                    borderRadius: 16,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      color: m.rol === "yo" ? C.suave : C.acento,
                      fontSize: 12,
                      fontWeight: "700",
                      marginBottom: 4,
                    }}
                  >
                    {m.rol === "yo" ? t("chat_yo") : t("chat_director")}
                  </Text>
                  <Text style={{ color: C.texto, fontSize: 16, lineHeight: 22 }}>{m.texto}</Text>
                </View>
              )}
              {m.rol !== "aviso" ? tarjetaDe(m.propuestaId) : null}
            </View>
          ))}
          {encargo?.propuestas.map((p) => tarjetaDe(p.id))}
          {enviando ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <ActivityIndicator color={C.acento} />
              <Text style={{ color: C.suave }}>{t("chat_pensando")}</Text>
            </View>
          ) : null}
          {!enviando && sinRespuesta ? (
            <Pressable
              onPress={() => void mandar("")}
              accessibilityRole="button"
              style={{
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: C.borde,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text style={{ color: C.texto }}>{t("chat_reintentar")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: C.borde,
            padding: 12,
            gap: 8,
            backgroundColor: C.fondo,
          }}
        >
          {error ? <Text style={{ color: C.error }}>{error}</Text> : null}
          {borrador.recuperado && borrador.texto ? (
            <Text style={{ color: C.suave, fontSize: 13 }}>
              {t("chat_recuperado")}{" "}
              <Text onPress={borrador.descartar} style={{ color: C.acento, fontWeight: "700" }}>
                {t("chat_empezar_de_nuevo")}
              </Text>
            </Text>
          ) : null}
          {subidas.map((s) => (
            <Text
              key={s.clave}
              style={{
                color: s.estado === "error" ? C.error : s.estado === "lista" ? C.exito : C.suave,
                fontSize: 13,
              }}
            >
              {s.tipo === "video" ? "🎬" : "🖼"} {s.nombre} ·{" "}
              {s.estado === "subiendo"
                ? `${t("chat_subiendo")}${s.pct !== undefined ? ` ${s.pct}%` : "…"}`
                : s.estado === "lista"
                  ? t("chat_subido")
                  : s.error}
            </Text>
          ))}
          {!borrador.texto ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {ATAJOS.map(([titulo, texto]) => (
                <Pressable
                  key={titulo}
                  onPress={() => {
                    borrador.escribir(t(texto));
                    campo.current?.focus();
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: C.borde,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: C.texto, fontSize: 13 }}>{t(titulo)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <TextInput
            ref={campo}
            value={borrador.texto}
            onChangeText={borrador.escribir}
            placeholder={t(placeholder)}
            placeholderTextColor={C.suave}
            multiline
            style={{
              color: C.texto,
              fontSize: 16,
              minHeight: 48,
              maxHeight: 140,
              backgroundColor: C.panel,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.borde,
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => void elegir(false)}
              accessibilityRole="button"
              style={{
                borderWidth: 1,
                borderColor: C.borde,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 11,
              }}
            >
              <Text style={{ color: C.texto, fontWeight: "600" }}>🖼 {t("chat_subir")}</Text>
            </Pressable>
            <Pressable
              onPress={() => void elegir(true)}
              accessibilityRole="button"
              style={{
                borderWidth: 1,
                borderColor: C.borde,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 11,
              }}
            >
              <Text style={{ color: C.texto, fontWeight: "600" }}>📷 {t("chat_camara")}</Text>
            </Pressable>
            <Pressable
              onPress={() => void mandar()}
              disabled={enviando || subiendo}
              accessibilityRole="button"
              style={{
                marginLeft: "auto",
                backgroundColor: C.acento,
                borderRadius: 12,
                paddingHorizontal: 18,
                paddingVertical: 11,
                opacity: enviando || subiendo ? 0.6 : 1,
              }}
            >
              <Text style={{ color: C.sobreAcento, fontWeight: "800" }}>
                {enviando ? t("chat_mandando") : subiendo ? `${t("chat_subiendo")}…` : t("chat_mandar")}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
