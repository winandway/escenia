// La barra de escribir, al estilo de las apps de chat (ChatGPT): un «+» para agregar fotos o video, el
// texto que crece y la flecha redonda para mandar. Lo que se va subiendo aparece arriba como miniaturas,
// con su avance, y se puede quitar. La flecha solo se prende cuando hay algo que mandar y nada subiendo.
import { Image } from "expo-image";
import { forwardRef } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEstado } from "./estado";
import { C } from "./tema";

export type Adjunto = {
  clave: string;
  uri: string;
  nombre: string;
  tipo: "foto" | "video";
  estado: "subiendo" | "lista" | "error";
  pct?: number;
  error?: string;
};

type Props = {
  texto: string;
  escribir: (t: string) => void;
  placeholder: string;
  adjuntos: Adjunto[];
  quitar: (clave: string) => void;
  elegir: (camara: boolean) => void;
  mandar: () => void;
  enviando: boolean;
};

export const Composer = forwardRef<TextInput, Props>(function Composer(
  { texto, escribir, placeholder, adjuntos, quitar, elegir, mandar, enviando },
  campo,
) {
  const { t } = useEstado();
  const subiendo = adjuntos.some((a) => a.estado === "subiendo");
  const hayAlgo = texto.trim().length > 0 || adjuntos.some((a) => a.estado === "lista");
  const puede = hayAlgo && !subiendo && !enviando;

  function menu() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [t("chat_subir"), t("chat_camara"), t("proyectos_cancelar")], cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) elegir(false);
        if (i === 1) elegir(true);
      },
    );
  }

  return (
    <View
      style={{ backgroundColor: C.panel, borderRadius: 26, borderWidth: 1, borderColor: C.borde, padding: 6 }}
    >
      {adjuntos.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, padding: 6 }}
        >
          {adjuntos.map((a) => (
            <View key={a.clave} style={{ width: 64, height: 64 }}>
              {a.tipo === "foto" ? (
                <Image
                  source={{ uri: a.uri }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    borderWidth: a.estado === "error" ? 2 : 0,
                    borderColor: C.error,
                  }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    backgroundColor: C.borde,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: a.estado === "error" ? 2 : 0,
                    borderColor: C.error,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🎬</Text>
                </View>
              )}
              {a.estado === "subiendo" ? (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 12,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {a.pct !== undefined && a.pct > 0 ? (
                    <Text style={{ color: "#fff", fontWeight: "800" }}>{a.pct}%</Text>
                  ) : (
                    <ActivityIndicator color="#fff" />
                  )}
                </View>
              ) : null}
              {a.estado !== "subiendo" ? (
                <Pressable
                  onPress={() => quitar(a.clave)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("chat_quitar")} ${a.nombre}`}
                  hitSlop={8}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "#000",
                    borderWidth: 1,
                    borderColor: C.borde,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Pressable
          onPress={menu}
          accessibilityRole="button"
          accessibilityLabel={t("chat_mas")}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: C.borde,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 2,
          }}
        >
          <Text style={{ color: C.texto, fontSize: 24, lineHeight: 26, fontWeight: "400" }}>+</Text>
        </Pressable>
        <TextInput
          ref={campo}
          value={texto}
          onChangeText={escribir}
          placeholder={placeholder}
          placeholderTextColor={C.suave}
          multiline
          style={{
            flex: 1,
            color: C.texto,
            fontSize: 17,
            maxHeight: 150,
            paddingHorizontal: 6,
            paddingTop: 9,
            paddingBottom: 9,
          }}
        />
        <Pressable
          onPress={mandar}
          disabled={!puede}
          accessibilityRole="button"
          accessibilityLabel={t("chat_mandar")}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: puede ? C.acento : C.borde,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 2,
          }}
        >
          {enviando || subiendo ? (
            <ActivityIndicator color={C.sobreAcento} />
          ) : (
            <Text style={{ color: puede ? C.sobreAcento : C.suave, fontSize: 20, fontWeight: "900" }}>↑</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});
