// El video terminado dentro de la tarjeta: se baja una vez al teléfono (con la sesión), se ve aquí mismo
// y se guarda en Fotos o se comparte. En la cuenta de demostración es el video de ejemplo público.
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { cabeceras, PANEL } from "./api";
import { useEstado } from "./estado";
import { C } from "./tema";

const MUESTRA = "/muestras/escenia-muestra.mp4";

function Reproductor({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      allowsPictureInPicture={false}
      style={{
        width: "100%",
        aspectRatio: 9 / 16,
        maxHeight: 460,
        borderRadius: 12,
        backgroundColor: "#000",
      }}
    />
  );
}

const archivoLocal = (clave: string, muestra: boolean) =>
  new File(Paths.cache, muestra ? "escenia-muestra.mp4" : `video-${clave.replace(/[^a-z0-9]+/gi, "-")}.mp4`);

export function VideoTerminado({ clave, muestra }: { clave: string; muestra: boolean }) {
  const { t } = useEstado();
  // Si ya se bajó antes, se usa el del teléfono sin volver a pedirlo.
  const [local, setLocal] = useState<string | null>(() => {
    const f = archivoLocal(clave, muestra);
    return f.exists && f.size > 0 ? f.uri : null;
  });
  const [aviso, setAviso] = useState("");
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    if (local) return;
    let vivo = true;
    const destino = archivoLocal(clave, muestra);
    File.downloadFileAsync(PANEL + (muestra ? MUESTRA : `/datos/archivos/${clave}`), destino, {
      headers: muestra ? {} : cabeceras(),
      idempotent: true,
    })
      .then((f) => vivo && setLocal(f.uri))
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, [clave, muestra, local]);

  async function guardar() {
    if (!local) return;
    const permiso = await MediaLibrary.requestPermissionsAsync(true);
    if (!permiso.granted) return setAviso(t("resultado_permiso"));
    await MediaLibrary.Asset.create(local);
    setAviso(t("resultado_guardado"));
  }

  if (fallo) return <Text style={{ color: C.error, marginTop: 10 }}>{t("error_red")}</Text>;
  if (!local)
    return (
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 12 }}>
        <ActivityIndicator color={C.acento} />
        <Text style={{ color: C.suave }}>{t("resultado_bajando")}</Text>
      </View>
    );
  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      <Reproductor uri={local} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => void guardar()}
          accessibilityRole="button"
          style={{
            flex: 1,
            backgroundColor: C.exito,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#052e14", fontWeight: "800" }}>{t("resultado_guardar")}</Text>
        </Pressable>
        <Pressable
          onPress={() => void Sharing.shareAsync(local, { mimeType: "video/mp4", UTI: "public.mpeg-4" })}
          accessibilityRole="button"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: C.borde,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.texto, fontWeight: "700" }}>{t("resultado_compartir")}</Text>
        </Pressable>
      </View>
      {aviso ? (
        <Text style={{ color: aviso === t("resultado_guardado") ? C.exito : C.suave }}>{aviso}</Text>
      ) : null}
    </View>
  );
}
