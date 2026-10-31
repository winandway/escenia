// Ningún formulario pierde lo escrito (regla global de Richard): se guarda solo medio segundo después de
// escribir, vuelve al abrir otra vez, y se borra al mandar con éxito, al descartar y al cerrar sesión.
// La llave lleva el formulario y la cuenta. Las contraseñas NUNCA pasan por aquí.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { llaveDelBorrador } from "./logica";

export function useBorrador(formulario: string, cuenta: string) {
  const llave = llaveDelBorrador(formulario, cuenta);
  const [texto, setTexto] = useState("");
  const [recuperado, setRecuperado] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;
    void AsyncStorage.getItem(llave)
      .then((guardado) => {
        if (vivo && guardado) {
          setTexto(guardado);
          setRecuperado(true);
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [llave]);

  const escribir = useCallback(
    (nuevo: string) => {
      setTexto(nuevo);
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => {
        void (nuevo.trim() ? AsyncStorage.setItem(llave, nuevo) : AsyncStorage.removeItem(llave)).catch(
          () => undefined,
        );
      }, 500);
    },
    [llave],
  );

  const descartar = useCallback(() => {
    if (espera.current) clearTimeout(espera.current);
    setTexto("");
    setRecuperado(false);
    void AsyncStorage.removeItem(llave).catch(() => undefined);
  }, [llave]);

  return { texto, escribir, recuperado, descartar };
}
