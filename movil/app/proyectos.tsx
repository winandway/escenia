// La lista de proyectos (encargos del Director). Archivar y cerrar sesión van dentro de su menú de tres
// puntos (regla global: nada que quite cosas queda a la vista).
import { Redirect, Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorDeApi, pedir } from "../src/api";
import { useEstado } from "../src/estado";
import { dinero, tituloDelProyecto } from "../src/logica";
import { SelectorIdioma } from "../src/SelectorIdioma";
import { C } from "../src/tema";

type Proyecto = { id: number; titulo: string; costoUsd: number; actualizadoEn: string; ultimo: string };

function menuDeTresPuntos(
  opciones: string[],
  destructiva: number,
  cancelar: string,
  elegir: (i: number) => void,
) {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: [...opciones, cancelar],
      destructiveButtonIndex: destructiva,
      cancelButtonIndex: opciones.length,
    },
    (i) => {
      if (i < opciones.length) elegir(i);
    },
  );
}

export default function Proyectos() {
  const { t, idioma, cuenta, salir } = useEstado();
  const router = useRouter();
  const [lista, setLista] = useState<Proyecto[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await pedir<{ encargos: Proyecto[] }>("/datos/app/encargos");
      setLista(r.encargos);
      setError("");
    } catch (e) {
      setError(e instanceof ErrorDeApi && e.status === 401 ? t("error_sesion") : t("error_red"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  if (!cuenta) return <Redirect href="/entrar" />;

  async function nuevo() {
    if (creando) return;
    setCreando(true);
    try {
      const r = await pedir<{ id: number }>("/datos/app/encargos", { metodo: "POST" });
      router.push({ pathname: "/proyecto/[id]", params: { id: String(r.id) } });
    } catch (e) {
      setError(e instanceof ErrorDeApi && e.message ? e.message : t("error_red"));
    } finally {
      setCreando(false);
    }
  }

  function archivar(p: Proyecto) {
    Alert.alert(tituloDelProyecto(p.titulo, idioma), t("proyectos_archivar_pregunta"), [
      { text: t("proyectos_cancelar"), style: "cancel" },
      {
        text: t("proyectos_archivar"),
        style: "destructive",
        onPress: () =>
          void pedir(`/datos/app/encargos/${p.id}/archivar`, { metodo: "POST" })
            .then(cargar)
            .catch(() => setError(t("error_red"))),
      },
    ]);
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: C.fondo }}>
      <Stack.Screen
        options={{
          title: t("proyectos_titulo"),
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <SelectorIdioma />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("proyectos_mas")}
                hitSlop={10}
                onPress={() =>
                  menuDeTresPuntos(
                    [t("ayuda_menu"), t("proyectos_salir")],
                    1,
                    t("proyectos_cancelar"),
                    (i) => (i === 0 ? router.push("/ayuda") : void salir()),
                  )
                }
                style={{ paddingHorizontal: 8 }}
              >
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>⋮</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      {cuenta === "demo" ? (
        <View style={{ backgroundColor: "#1d2b1f", paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: "#bbf7d0" }}>{t("demo_franja")}</Text>
        </View>
      ) : null}
      {error ? <Text style={{ color: C.error, padding: 16 }}>{error}</Text> : null}
      {lista === null ? (
        <ActivityIndicator color={C.acento} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(p) => String(p.id)}
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={() => void cargar()} tintColor={C.acento} />
          }
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: "center", paddingVertical: 60 }}>
              <Text style={{ color: C.texto, fontSize: 22, fontWeight: "800" }}>
                {t("proyectos_vacio_titulo")}
              </Text>
              <Text style={{ color: C.suave, fontSize: 16, marginTop: 8, lineHeight: 22 }}>
                {t("proyectos_vacio_texto")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/proyecto/[id]", params: { id: String(item.id) } })}
              style={({ pressed }) => ({
                backgroundColor: C.panel,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.borde,
                padding: 14,
                flexDirection: "row",
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.texto, fontSize: 17, fontWeight: "700" }} numberOfLines={1}>
                  {tituloDelProyecto(item.titulo, idioma)}
                </Text>
                {item.ultimo ? (
                  <Text style={{ color: C.suave, marginTop: 4 }} numberOfLines={2}>
                    {item.ultimo}
                  </Text>
                ) : null}
                <Text style={{ color: C.suave, fontSize: 12, marginTop: 6 }}>
                  {t("proyectos_lleva")}: {dinero(item.costoUsd, idioma)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("proyectos_mas")}
                hitSlop={10}
                onPress={() =>
                  menuDeTresPuntos([t("proyectos_archivar")], 0, t("proyectos_cancelar"), () =>
                    archivar(item),
                  )
                }
                style={{ paddingHorizontal: 6 }}
              >
                <Text style={{ color: C.suave, fontSize: 22, fontWeight: "800" }}>⋮</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
      <View style={{ padding: 16 }}>
        <Pressable
          onPress={() => void nuevo()}
          accessibilityRole="button"
          style={({ pressed }) => ({
            backgroundColor: C.acento,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: pressed || creando ? 0.75 : 1,
          })}
        >
          <Text style={{ color: C.sobreAcento, fontSize: 17, fontWeight: "800" }}>
            + {t("proyectos_nuevo")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
