// Selector de idioma estilo Amazon (regla global de Richard): botón «🇺🇸 EN ▾» en blanco y negrita, y
// al tocarlo una ventanita blanca con piquito, «Change language», y las opciones con círculo (el elegido
// en naranja) separadas por una línea gris. En una capa flotante (Modal) para que nada la tape. Se
// cierra al elegir o al tocar fuera. Español con la bandera de España; inglés con la de EE. UU.
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEstado } from "./estado";
import type { Idioma } from "./logica";

const IDIOMAS: { codigo: Idioma; bandera: string; nombre: string }[] = [
  { codigo: "en", bandera: "🇺🇸", nombre: "English" },
  { codigo: "es", bandera: "🇪🇸", nombre: "español" },
];
const TITULO = { en: "Change language", es: "Cambiar idioma" } as const;
const NARANJA = "#E47911";

export function SelectorIdioma() {
  const { idioma, cambiarIdioma } = useEstado();
  const [abierto, setAbierto] = useState(false);
  const margen = useSafeAreaInsets();
  const actual = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0]!;
  return (
    <View>
      <Pressable
        onPress={() => setAbierto((a) => !a)}
        accessibilityRole="button"
        accessibilityLabel={TITULO[idioma]}
        accessibilityState={{ expanded: abierto }}
        hitSlop={8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: abierto ? "#fff" : "transparent",
        }}
      >
        <Text style={{ fontSize: 18 }}>{actual.bandera}</Text>
        <Text style={{ color: "#fff", fontWeight: "800" }}>{actual.codigo.toUpperCase()}</Text>
        <Text style={{ color: "#fff", fontSize: 11 }}>▾</Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setAbierto(false)} accessibilityLabel={TITULO[idioma]}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={TITULO[idioma]}
            style={{
              position: "absolute",
              right: 12,
              top: margen.top + 52,
              width: 230,
              backgroundColor: "#fff",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#d5d9d9",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 6,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: -8,
                right: 22,
                width: 14,
                height: 14,
                backgroundColor: "#fff",
                borderLeftWidth: 1,
                borderTopWidth: 1,
                borderColor: "#d5d9d9",
                transform: [{ rotate: "45deg" }],
              }}
            />
            <Text style={{ marginBottom: 6, color: "#101010" }}>{TITULO[idioma]}</Text>
            {IDIOMAS.map((i, n) => {
              const elegido = idioma === i.codigo;
              return (
                <Pressable
                  key={i.codigo}
                  onPress={() => {
                    cambiarIdioma(i.codigo);
                    setAbierto(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: elegido }}
                  accessibilityLabel={`${i.nombre} - ${i.codigo.toUpperCase()}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                    borderTopWidth: n > 0 ? 1 : 0,
                    borderTopColor: "#e7e7e7",
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: elegido ? NARANJA : "#8d9096",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {elegido ? (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: NARANJA }} />
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 16 }}>{i.bandera}</Text>
                  <Text style={{ fontSize: 16, color: "#101010" }}>
                    {i.nombre} - {i.codigo.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
