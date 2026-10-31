// El chat con el Director, al estilo de las apps de chat: los mensajes del Director a lo ancho, los tuyos
// en burbuja, las tarjetas con su precio y lo que va a salir en el video, y abajo la barra con «+» y la
// flecha. Sin mensajes, sugerencias para empezar. Lo escrito se guarda solo (useBorrador). Mientras algo
// está en marcha (un video que el estudio mira o arma), la pantalla vuelve a preguntar cada 4 segundos.
import * as ImagePicker from "expo-image-picker";
import { Redirect, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { Composer, type Adjunto } from "../../src/Composer";
import { useEstado } from "../../src/estado";
import { mensajeConNotas, nombreDeArchivo, tituloDelProyecto } from "../../src/logica";
import { subirFoto, subirVideo } from "../../src/subir";
import { Tarjeta } from "../../src/Tarjeta";
import { C } from "../../src/tema";
import type { LlaveTexto } from "../../src/textos";
import type { EncargoApp } from "../../src/tipos";
import { useBorrador } from "../../src/useBorrador";

const SUGERENCIAS: [LlaveTexto, LlaveTexto, LlaveTexto][] = [
  ["atajo_maggie", "atajo_maggie_sub", "atajo_maggie_texto"],
  ["atajo_fotos", "atajo_fotos_sub", "atajo_fotos_texto"],
  ["atajo_vivo", "atajo_vivo_sub", "atajo_vivo_texto"],
  ["atajo_voz", "atajo_voz_sub", "atajo_voz_texto"],
];

/** Tres puntos que laten mientras el Director piensa. */
function Pensando() {
  const { t } = useEstado();
  const [valor] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const ciclo = Animated.loop(
      Animated.timing(valor, { toValue: 3, duration: 1200, useNativeDriver: true }),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [valor]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: C.acento,
            opacity: valor.interpolate({
              inputRange: [i, i + 0.5, i + 1],
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            }),
          }}
        />
      ))}
      <Text style={{ color: C.suave, marginLeft: 4 }}>{t("chat_pensando")}</Text>
    </View>
  );
}

export default function Proyecto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const encargoId = Number(id);
  const { t, cuenta, idioma } = useEstado();
  const borrador = useBorrador(`chat-${encargoId}`, cuenta ?? "");
  const [encargo, setEncargo] = useState<EncargoApp | null>(null);
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
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

  const anotar = (a: Adjunto) => setAdjuntos((todos) => [...todos.filter((x) => x.clave !== a.clave), a]);

  async function subir(assets: ImagePicker.ImagePickerAsset[]) {
    if (!encargo) return;
    for (const [n, a] of assets.entries()) {
      const tipo = a.type === "video" ? "video" : "foto";
      const nombre = nombreDeArchivo(a.fileName, tipo, Date.now() + n);
      const base = { clave: `${a.uri}-${n}`, uri: a.uri, nombre, tipo } as const;
      anotar({ ...base, estado: "subiendo", pct: 0 });
      try {
        if (tipo === "video")
          await subirVideo(a.uri, nombre, encargo.id, (pct) => anotar({ ...base, estado: "subiendo", pct }));
        else await subirFoto(a.uri, nombre, encargo.carpeta);
        anotar({ ...base, estado: "lista" });
      } catch (e) {
        anotar({
          ...base,
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
    if (!encargo || enviando || adjuntos.some((a) => a.estado === "subiendo")) return;
    const listas = adjuntos.filter((a) => a.estado === "lista");
    const texto =
      textoLibre ??
      mensajeConNotas(
        borrador.texto,
        listas.filter((a) => a.tipo === "foto").map((a) => a.nombre),
        listas.filter((a) => a.tipo === "video").map((a) => a.nombre),
        encargo.carpeta,
      );
    if (textoLibre === undefined && !texto) return setError(t("chat_vacio"));
    setEnviando(true);
    setError("");
    try {
      await pedir(`/datos/director/${encargo.id}`, { metodo: "POST", cuerpo: { texto } });
      borrador.descartar();
      setAdjuntos([]);
      setPlaceholder("chat_placeholder");
    } catch (e) {
      // Si el mensaje quedó guardado aunque la IA fallara, el cuadro se limpia igual: ya está arriba.
      if (e instanceof ErrorDeApi && e.status >= 500) {
        borrador.descartar();
        setAdjuntos([]);
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

  const vacio = encargo !== null && encargo.mensajes.length === 0;

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
          contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {vacio ? (
            <View style={{ flex: 1, justifyContent: "center", gap: 18, paddingVertical: 20 }}>
              <View style={{ alignItems: "center", gap: 8 }}>
                <Text style={{ color: C.acento, fontSize: 30 }}>▶</Text>
                <Text style={{ color: C.texto, fontSize: 24, fontWeight: "800", textAlign: "center" }}>
                  {t("chat_vacio_titulo")}
                </Text>
                <Text style={{ color: C.suave, textAlign: "center", lineHeight: 20, paddingHorizontal: 12 }}>
                  {t("chat_vacio_sub")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {SUGERENCIAS.map(([titulo, sub, texto]) => (
                  <Pressable
                    key={titulo}
                    onPress={() => {
                      borrador.escribir(t(texto));
                      campo.current?.focus();
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      width: "47%",
                      flexGrow: 1,
                      backgroundColor: C.panel,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: C.borde,
                      padding: 14,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: C.texto, fontWeight: "700" }}>{t(titulo)}</Text>
                    <Text style={{ color: C.suave, marginTop: 4, fontSize: 13 }}>{t(sub)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {encargo?.videos.map((v) => (
            <Text key={`v${v.id}`} style={{ color: C.suave, fontSize: 13 }} numberOfLines={1}>
              🎬 {v.nombre} ·{" "}
              <Text
                style={{ color: v.estado === "listo" ? C.exito : v.estado === "error" ? C.error : C.acento }}
              >
                {v.estado === "listo"
                  ? `${Math.floor(v.duracionSeg / 60)}:${String(Math.floor(v.duracionSeg % 60)).padStart(2, "0")} · ${t("chat_mac_listo")}`
                  : v.estado === "error"
                    ? t("chat_video_error")
                    : t("chat_mac_mirando")}
              </Text>
            </Text>
          ))}
          {encargo?.mensajes.map((m) => (
            <View key={`m${m.id}`} style={{ gap: 12 }}>
              {m.rol === "aviso" ? (
                <Text style={{ color: C.exito, textAlign: "center", fontSize: 13, paddingHorizontal: 12 }}>
                  {m.texto}
                </Text>
              ) : m.rol === "yo" ? (
                <View
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "85%",
                    backgroundColor: C.burbujaYo,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: C.texto, fontSize: 16, lineHeight: 22 }}>{m.texto}</Text>
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: C.acento, fontSize: 13, fontWeight: "700" }}>
                    ▶ {t("chat_director")}
                  </Text>
                  <Text style={{ color: C.texto, fontSize: 16, lineHeight: 24 }}>{m.texto}</Text>
                </View>
              )}
              {m.rol !== "aviso" ? tarjetaDe(m.propuestaId) : null}
            </View>
          ))}
          {encargo?.propuestas.map((p) => tarjetaDe(p.id))}
          {enviando ? <Pensando /> : null}
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
          style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, gap: 6, backgroundColor: C.fondo }}
        >
          {error ? <Text style={{ color: C.error, paddingHorizontal: 6 }}>{error}</Text> : null}
          {adjuntos
            .filter((a) => a.estado === "error")
            .map((a) => (
              <Text key={`e${a.clave}`} style={{ color: C.error, fontSize: 13, paddingHorizontal: 6 }}>
                {a.nombre}: {a.error}
              </Text>
            ))}
          {borrador.recuperado && borrador.texto ? (
            <Text style={{ color: C.suave, fontSize: 13, paddingHorizontal: 6 }}>
              {t("chat_recuperado")}{" "}
              <Text onPress={borrador.descartar} style={{ color: C.acento, fontWeight: "700" }}>
                {t("chat_empezar_de_nuevo")}
              </Text>
            </Text>
          ) : null}
          <Composer
            ref={campo}
            texto={borrador.texto}
            escribir={borrador.escribir}
            placeholder={t(placeholder)}
            adjuntos={adjuntos}
            quitar={(clave) => setAdjuntos((todos) => todos.filter((a) => a.clave !== clave))}
            elegir={(camara) => void elegir(camara)}
            mandar={() => void mandar()}
            enviando={enviando}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
