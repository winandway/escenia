// «Tus casos» de ayuda en este iPhone (C-AYUDA-1): los enlaces de los casos que se abrieron desde aquí.
// No hay cuentas para pedir ayuda, así que los recuerda el teléfono. Sin almacenamiento, todo sigue andando.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { agregarCaso } from "./logica";

const LLAVE = "escenia.casos";

export async function misCasos(): Promise<string[]> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(LLAVE)) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export async function anotarCaso(codigo: string): Promise<void> {
  await AsyncStorage.setItem(LLAVE, JSON.stringify(agregarCaso(await misCasos(), codigo))).catch(
    () => undefined,
  );
}

export type EstadoCaso = "abierto" | "respondido" | "cerrado";
