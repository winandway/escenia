// El estado de toda la app: la sesión (quién entró) y el idioma (inglés primero; se recuerda).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { alCerrarSesion, borrarSesion, cargarSesion, guardarSesion, pedir, type Cuenta } from "./api";
import type { Idioma } from "./logica";
import { TEXTOS, type LlaveTexto } from "./textos";

type Estado = {
  listo: boolean;
  cuenta: Cuenta | null;
  idioma: Idioma;
  cambiarIdioma: (i: Idioma) => void;
  t: (llave: LlaveTexto) => string;
  entrar: (token: string, cuenta: Cuenta) => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<Estado | null>(null);
const LLAVE_IDIOMA = "escenia.idioma";

export function ProveedorDeEstado({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [idioma, setIdioma] = useState<Idioma>(() => (getLocales()[0]?.languageCode === "es" ? "es" : "en"));

  useEffect(() => {
    alCerrarSesion(() => setCuenta(null));
    void (async () => {
      const [sesion, guardado] = await Promise.all([
        cargarSesion().catch(() => null),
        AsyncStorage.getItem(LLAVE_IDIOMA).catch(() => null),
      ]);
      if (guardado === "en" || guardado === "es") setIdioma(guardado);
      setCuenta(sesion?.cuenta ?? null);
      setListo(true);
    })();
  }, []);

  const cambiarIdioma = useCallback((i: Idioma) => {
    setIdioma(i);
    void AsyncStorage.setItem(LLAVE_IDIOMA, i).catch(() => undefined);
  }, []);

  const entrar = useCallback(async (token: string, c: Cuenta) => {
    await guardarSesion(token, c);
    setCuenta(c);
  }, []);

  const salir = useCallback(async () => {
    // Se avisa al servidor para que la sesión muera allá; si falla, se sale igual.
    await pedir("/datos/app/salir", { metodo: "POST" }).catch(() => undefined);
    await borrarSesion();
    const llaves = (await AsyncStorage.getAllKeys().catch(() => [])).filter((k) => k.startsWith("borrador:"));
    if (llaves.length) await AsyncStorage.multiRemove(llaves).catch(() => undefined);
    setCuenta(null);
  }, []);

  const valor = useMemo<Estado>(
    () => ({ listo, cuenta, idioma, cambiarIdioma, t: (llave) => TEXTOS[idioma][llave], entrar, salir }),
    [listo, cuenta, idioma, cambiarIdioma, entrar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado(): Estado {
  const v = useContext(Contexto);
  if (!v) throw new Error("useEstado fuera del proveedor");
  return v;
}
