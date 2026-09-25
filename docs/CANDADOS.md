# Candados — lo que ya funciona y cómo se protege

Cada candado tiene su prueba automática en `pruebas/`. Si alguien rompe la
pieza, la prueba se pone en rojo antes de que llegue a producción.

| Candado      | Qué protege                                                                                    | Dónde vive                                                      | Prueba                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| C-MODELOS-1  | Ningún modelo de IA fuera de la lista puede correr, ni desde Ajustes                           | `compartido/modelos.ts` (`asegurarModelo`, `asegurarModeloVoz`) | `pruebas/modelos.test.ts`                                     |
| C-GASTO-1    | Tope de gasto diario; sin valor válido el tope es $0                                           | `src/lib/presupuesto.ts`                                        | `pruebas/sesion-presupuesto.test.ts`                          |
| C-OPINION-1  | No se aprueba un guion sin la opinión de Richard (≥ 40 letras)                                 | `src/app/guiones/[id]/acciones.ts` + `OPINION_MINIMA`           | `pruebas/guion.test.ts` (inserción)                           |
| C-VARIEDAD-1 | Aviso si un guion se parece a uno reciente o repite estructura 3 veces                         | `src/lib/variedad.ts`                                           | `pruebas/variedad.test.ts`                                    |
| C-SUBT-1     | Letras → palabras con tiempos exactos, escenas sin huecos                                      | `compartido/subtitulos.ts`                                      | `pruebas/subtitulos.test.ts`                                  |
| C-SESION-1   | Sesión con huella en la base; cerrar sesión la mata en el servidor; 5 intentos por IP / 15 min | `src/lib/sesion.ts`, `src/lib/clave.ts`                         | `pruebas/sesion-presupuesto.test.ts`, `pruebas/clave.test.ts` |
| C-BORRADOR-1 | Ningún formulario pierde lo escrito; contraseñas nunca se guardan                              | `src/componentes/useBorrador.ts`                                | `pruebas/borrador.test.tsx`                                   |
| C-ESTACION-1 | Solo la Mac con el secreto exacto toma trabajos                                                | `src/lib/estacion-auth.ts`                                      | `pruebas/escudos.test.ts`                                     |
| C-PILOTO-1   | Solo temáticas del canal de IA están activas                                                   | `compartido/tematicas/index.ts`                                 | `pruebas/escudos.test.ts`                                     |
| C-PROMPT-1   | El prompt no lleva temas concretos y exige no inventar datos                                   | `src/lib/prompt.ts`                                             | `pruebas/escudos.test.ts`                                     |

## Fallos encontrados y cómo se arreglaron

### 25 sep 2026 — La Estación fallaba con «404 voz.mp3» (C-EMPAQUE-1)

- **Cómo se veía:** el trabajo llegaba a «armando el video» y moría con
  `Received a status code of 404 while downloading .../public/t1/voz.mp3`.
- **Causa real:** Remotion **copia** la carpeta `publicDir` en el momento de
  empaquetar. La Estación empaquetaba una vez al arrancar, y la voz se
  escribía después: para Remotion ese archivo no existía.
- **Arreglo:** `renderizar()` empaqueta en cada trabajo con la carpeta pública
  de ESE trabajo (`cache/public/t<id>/`, con `voz.mp3` y sus `clips/`). Los
  clips se guardan en un caché aparte (`cache/clips/`) y se enlazan al trabajo.
- **Commit:** ver `git log --grep=C-EMPAQUE-1`.
- **Cómo se comprueba:** aprobar un guion con la Estación encendida y ver el
  trabajo llegar a «hecho» con su MP4 en `estacion/out/t<id>/`.
- **No tocar:** no volver a un `bundle()` global «para ahorrar tiempo».

### 25 sep 2026 — La subida de la voz al panel daba 500 (C-SUBIDA-1)

- **Cómo se veía:** el trabajo llegaba al 99 % («subiendo voz y subtítulos») y
  fallaba con «El panel respondió 500 en /datos/estacion/archivos».
- **Causa real:** el almacén (R2) exige conocer el largo del cuerpo; el stream
  que entrega Next no lo trae (`Provided readable stream must have a known length`).
- **Arreglo:** `archivos/route.ts` lee el cuerpo entero con `req.arrayBuffer()`
  (tope 40 MB) antes de `bucket.put`.
- **Cómo se comprueba:** un trabajo llega a «hecho» y en la página del guion
  suena el reproductor de la voz (`/datos/archivos/guiones/<id>/voz-….mp3` → 200).
- **No tocar:** no volver a pasar `req.body` directo al almacén.

### 25 sep 2026 — gitleaks bloqueaba el push por el `_worker.js` publicado

- **Cómo se veía:** `husky - pre-push script failed`, «leaks found: 7», todos en
  `_worker.js` de la rama `yapanel-build`.
- **Causa real:** el paquete compilado de Next trae `previewModeSigningKey`,
  `previewModeEncryptionKey` y `encryptionKey`, valores que Next genera al azar
  en cada build. No son secretos nuestros y cambian con cada publicación.
- **Arreglo:** `.gitleaks.toml` excluye solo la ruta `^_worker\.js$`. Todo lo
  demás se sigue escaneando (ningún secreto real vive en el repo: van en el
  panel de YaDominios y en `estacion/.env`, que está en `.gitignore`).
- **No tocar:** no ampliar esa lista blanca a otras rutas.

## Canario en vivo

`https://escenia.sitios.dev/datos/salud` responde `{estado, piezas}` con
`variables`, `base`, `almacen`, `anthropic`, `turnstile`, `estacion`. Un
`error` en cualquiera devuelve 503.

## Cómo se comprueban en rojo

`npm run test` corre todo. Para verificar que un candado de verdad protege,
se rompe a propósito (por ejemplo, quitar `asegurarModelo` en `generador.ts`
no rompe la prueba porque la prueba es del candado mismo: para eso la prueba
llama directamente a `asegurarModelo("claude-opus-5")` y espera el error).

## Lo que NO hay que tocar

- `schema.sql` corre en cada publicación: nunca `DROP`, solo `IF NOT EXISTS`.
- Rutas de backend siempre en `/datos/*`, nunca `/api/*` (YaDominios Cloud).
- Los MP4 no se suben al almacén: 512 MB gratis / 5 GB pagos se llenarían en días.
