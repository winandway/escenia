// La tarjeta del Director: el precio arriba, el texto que dirá la voz (con su segundo en la prueba en
// vivo y la locución), la voz, quién lo presenta, y los dos botones. Aprobar pide confirmación con el
// precio: es el único momento en que algo se hace y se cobra (C-DIRECTOR-1).
import { Alert, Pressable, Text, View } from "react-native";
import { useEstado } from "./estado";
import { dinero, reloj } from "./logica";
import { C } from "./tema";
import type { PropuestaApp } from "./tipos";
import { VideoTerminado } from "./VideoTerminado";

export function Tarjeta({
  p,
  aprobar,
  cambiar,
  otraVez,
}: {
  p: PropuestaApp;
  aprobar: (id: number) => void;
  cambiar: () => void;
  otraVez: (trabajoId: number) => void;
}) {
  const { t, idioma } = useEstado();
  const tipo =
    p.tipo === "anuncio"
      ? t("tarjeta_anuncio")
      : p.tipo === "demostracion"
        ? t("tarjeta_demostracion")
        : t("tarjeta_locucion");
  const r = p.resultado;
  const apagada = p.estado === "reemplazada";

  function confirmar() {
    Alert.alert(p.nombre, `${t("tarjeta_aprobar_pregunta")} ${dinero(p.precioUsd, idioma)}.`, [
      { text: t("proyectos_cancelar"), style: "cancel" },
      { text: t("tarjeta_aprobar_si"), onPress: () => aprobar(p.id) },
    ]);
  }

  return (
    <View
      style={{
        backgroundColor: C.panel,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: p.estado === "propuesta" ? C.acento : C.borde,
        padding: 16,
        opacity: apagada ? 0.55 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: C.suave, fontWeight: "700", fontSize: 13 }}>{tipo.toUpperCase()}</Text>
        <Text style={{ color: C.acento, fontWeight: "800", fontSize: 16 }}>
          {t("tarjeta_cuesta")} {dinero(p.precioUsd, idioma)}
        </Text>
      </View>
      <Text style={{ color: C.texto, fontSize: 18, fontWeight: "800", marginTop: 6 }}>{p.nombre}</Text>
      <Text style={{ color: C.suave, marginTop: 4 }}>
        ~{p.segundos} {t("tarjeta_segundos")} · {t("tarjeta_voz")}: {p.voz} ·{" "}
        {p.persona ? `${t("tarjeta_presenta")}: ${p.persona}` : t("tarjeta_sin_persona")}
      </Text>
      <View style={{ marginTop: 10, gap: 6 }}>
        {p.frases.map((f, i) => (
          <Text key={i} style={{ color: C.texto, lineHeight: 21 }}>
            {f.enSeg !== null ? (
              <Text style={{ color: C.acento, fontWeight: "700" }}>{reloj(f.enSeg)} · </Text>
            ) : null}
            {f.texto}
          </Text>
        ))}
      </View>

      {apagada ? <Text style={{ color: C.suave, marginTop: 10 }}>{t("tarjeta_reemplazada")}</Text> : null}

      {p.estado === "propuesta" ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <Pressable
            onPress={confirmar}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: C.acento,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: C.sobreAcento, fontWeight: "800", fontSize: 16 }}>
              {t("tarjeta_aprobar")} · {dinero(p.precioUsd, idioma)}
            </Text>
          </Pressable>
          <Pressable
            onPress={cambiar}
            accessibilityRole="button"
            style={{
              borderWidth: 1,
              borderColor: C.borde,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: C.texto, fontWeight: "700" }}>{t("tarjeta_cambiar")}</Text>
          </Pressable>
        </View>
      ) : null}

      {r ? (
        <View style={{ marginTop: 14 }}>
          {r.estado === "listo" ? (
            <>
              <Text style={{ color: C.exito, fontWeight: "800" }}>
                {r.muestra
                  ? t("resultado_muestra")
                  : `${t("resultado_listo")} · ${Math.round(r.duracionSeg)} s · ${dinero(r.costoUsd, idioma)}`}
              </Text>
              <VideoTerminado clave={r.video} muestra={r.muestra} />
            </>
          ) : r.estado === "error" ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.error, fontWeight: "700" }}>
                {t("resultado_error")}
                {r.error ? `: ${r.error}` : ""}
              </Text>
              {r.trabajoId ? (
                <Pressable
                  onPress={() => otraVez(r.trabajoId!)}
                  accessibilityRole="button"
                  style={{
                    borderWidth: 1,
                    borderColor: C.borde,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: C.texto, fontWeight: "700" }}>{t("resultado_otra_vez")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.acento, fontWeight: "700" }}>
                {r.estado === "armando" ? t("resultado_armando") : t("resultado_fila")}
              </Text>
              <View style={{ height: 6, backgroundColor: C.borde, borderRadius: 3, overflow: "hidden" }}>
                <View
                  style={{
                    width: r.estado === "armando" ? "60%" : "15%",
                    height: 6,
                    backgroundColor: C.exito,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
