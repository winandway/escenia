// La casilla de contraseña con su ojito (regla global): arranca oculta, el ojito la muestra y la
// esconde, y su etiqueta cambia para quien usa el lector de pantalla. Nunca se guarda en un borrador.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useEstado } from "./estado";
import { C } from "./tema";

export function CampoClave({
  valor,
  cambiar,
  alMandar,
}: {
  valor: string;
  cambiar: (v: string) => void;
  alMandar: () => void;
}) {
  const { t } = useEstado();
  const [visible, setVisible] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: C.borde,
        borderRadius: 12,
        backgroundColor: C.panel,
      }}
    >
      <TextInput
        value={valor}
        onChangeText={cambiar}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        placeholder={t("entrar_clave")}
        placeholderTextColor={C.suave}
        returnKeyType="go"
        onSubmitEditing={alMandar}
        accessibilityLabel={t("entrar_clave")}
        style={{ flex: 1, color: C.texto, fontSize: 17, paddingHorizontal: 16, paddingVertical: 14 }}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? t("clave_ocultar") : t("clave_ver")}
        hitSlop={10}
        style={{ paddingHorizontal: 14, paddingVertical: 10 }}
      >
        <Text style={{ fontSize: 20 }}>{visible ? "🙈" : "👁"}</Text>
      </Pressable>
    </View>
  );
}
