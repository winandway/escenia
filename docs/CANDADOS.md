# Candados — lo que ya funciona y cómo se protege

Cada candado tiene su prueba automática en `pruebas/`. Si alguien rompe la
pieza, la prueba se pone en rojo antes de que llegue a producción.

| Candado      | Qué protege                                                                                        | Dónde vive                                                      | Prueba                                                        |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| C-MODELOS-1  | Ningún modelo de IA fuera de la lista puede correr, ni desde Ajustes                               | `compartido/modelos.ts` (`asegurarModelo`, `asegurarModeloVoz`) | `pruebas/modelos.test.ts`                                     |
| C-GASTO-1    | Tope de gasto diario; sin valor válido el tope es $0                                               | `src/lib/presupuesto.ts`                                        | `pruebas/sesion-presupuesto.test.ts`                          |
| C-OPINION-1  | No se aprueba un guion sin la opinión de Richard (≥ 40 letras)                                     | `src/app/guiones/[id]/acciones.ts` + `OPINION_MINIMA`           | `pruebas/guion.test.ts` (inserción)                           |
| C-VARIEDAD-1 | Aviso si un guion se parece a uno reciente o repite estructura 3 veces                             | `src/lib/variedad.ts`                                           | `pruebas/variedad.test.ts`                                    |
| C-SUBT-1     | Letras → palabras con tiempos exactos, escenas sin huecos                                          | `compartido/subtitulos.ts`                                      | `pruebas/subtitulos.test.ts`                                  |
| C-SESION-1   | Sesión con huella en la base; cerrar sesión la mata en el servidor; 5 intentos por IP / 15 min     | `src/lib/sesion.ts`, `src/lib/clave.ts`                         | `pruebas/sesion-presupuesto.test.ts`, `pruebas/clave.test.ts` |
| C-BORRADOR-1 | Ningún formulario pierde lo escrito; contraseñas nunca se guardan                                  | `src/componentes/useBorrador.ts`                                | `pruebas/borrador.test.tsx`                                   |
| C-ESTACION-1 | Solo la Mac con el secreto exacto toma trabajos                                                    | `src/lib/estacion-auth.ts`                                      | `pruebas/escudos.test.ts`                                     |
| C-PILOTO-1   | Publicar en Caprichoso TV está cerrado (`PUBLICACION_PERMITIDA`); producir y revisar sus videos sí | `compartido/tematicas/index.ts`                                 | `pruebas/escudos.test.ts`                                     |
| C-PROMPT-1   | El prompt no lleva temas concretos y exige no inventar datos                                       | `src/lib/prompt.ts`                                             | `pruebas/escudos.test.ts`                                     |

| C-RANGO-1 | Los videos del almacén se sirven por rangos (206) para que el reproductor funcione y se pueda saltar | `src/lib/rango.ts` + `datos/archivos/[...clave]` | `pruebas/rango.test.ts` |

| C-LICENCIA-1 | Solo entran fotos con licencia libre para uso comercial (CC BY, CC BY-SA, CC0, dominio público); NC/ND se rechazan | `compartido/licencias.ts` + `estacion/src/fotos.ts` | `pruebas/licencias.test.ts` |

| C-IMAGEN-1 | Solo corre el modelo de imagen permitido (~$0.03) y nada por encima de $0.05, ni como respaldo | `compartido/modelos.ts` (`asegurarModeloImagen`) + `estacion/src/imagenes.ts` | `pruebas/modelos.test.ts` |

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

## C-VOZ-1 — La voz pedida por el guion es la que suena (26 sep 2026)

- **Qué se rompía / cómo se veía:** Richard pidió poder narrar algunos videos con
  una voz femenina. El riesgo de una segunda voz es que, si su id falta en la Mac,
  el video salga en silencio con la otra voz y nadie se entere hasta verlo.
- **Causa real:** antes había un solo `ELEVENLABS_VOICE_ID` y, si faltaba, la
  Estación caía sin aviso a la voz de prueba del sistema.
- **Qué se hizo:** el guion lleva `voz` (`richard` | `femenina`, en
  `compartido/guion.ts`; la IA no la elige: `esquemaGuionGenerado` no la tiene).
  El panel la muestra en «Quién narra» (crear y editar). La Estación resuelve el
  id con `elegirIdDeVoz` (`compartido/voces.ts`) ANTES de la primera llamada a
  ElevenLabs: si falta el id de la voz pedida, el trabajo falla con el nombre de
  la variable, sin gastar. Sin `ELEVENLABS_API_KEY` sigue la voz de prueba del
  sistema (masculina o femenina según el guion).
- **Cómo se comprueba:** `pruebas/voces.test.ts` (comprobada en rojo el 26 sep
  2026 metiendo un fallback a propósito). En vivo: crear un guion con «Voz
  femenina», producirlo y oír la voz; y el arranque de la Estación dice
  `Voz: ElevenLabs (mi voz: sí · femenina: sí)`.
- **Qué NO tocar:** no volver a leer `config.ELEVENLABS_VOICE_ID` directo en
  `voz.ts`; no meter `voz` en `esquemaGuionGenerado` (rompe el formato que se le
  exige a Claude).

## C-MUSICA-1 — La música de fondo nunca tapa la voz (26 sep 2026)

- **Qué se rompía / cómo se veía:** al meter música de fondo, el riesgo es que
  una pista suene más fuerte que otra (cada canción viene con su volumen) o que
  suba donde hay voz y no se entienda la narración.
- **Causa real:** no había música; se construyó con el candado desde el día uno.
- **Qué se hizo:** (1) cada pista se normaliza una sola vez a -20 LUFS
  (`estacion/src/musica.ts`, `ffmpeg loudnorm`) y queda en `cache/musica/`;
  (2) el volumen lo decide una sola función pura, `volumenMusica` en
  `estacion/src/remotion/musica.ts`: 12 % mientras hay voz, 50 % solo dentro de
  los interludios (escenas `parte: "interludio"`, sin voz) y en la cola final,
  con rampas de 0,8 s y apagado de 1,5 s; (3) la pista se elige por palabras del
  nombre del archivo (`compartido/musica.ts`) y, si no hay ninguna, el trabajo
  dice «música: ninguna» en el panel en vez de fallar en silencio.
- **Cómo se comprueba:** `pruebas/musica.test.ts` recorre todo el video y exige
  que fuera de los interludios el volumen nunca pase de `VOLUMEN_BAJO`
  (comprobada en rojo el 26 sep 2026 subiendo el volumen base a propósito).
  En vivo: render local con `estacion/pruebas/guion-interludio.json`.
- **Qué NO tocar:** no poner un `<Audio>` de música con volumen fijo en la
  plantilla; todo pasa por `volumenMusica`. No subir `VOLUMEN_BAJO` de 0.15 sin
  oírlo con voz real.

## C-LATIDO-1 — El panel no da la Estación por apagada mientras produce (27 sep 2026)

- **Qué se rompía / cómo se veía:** Richard aprobó el guion 4, el panel decía
  «#4 Produciendo» y a la vez «Estación: apagada». Confunde: parece que nada
  avanza.
- **Causa real:** el latido solo se escribía cuando la Estación pedía trabajo
  (`/datos/estacion/siguiente`), cada 30 s. Mientras produce no pide trabajo, y
  a los 2 minutos el panel la daba por muerta aunque estuviera avisando avances.
- **Qué se hizo:** `tocarLatido(db)` en `src/lib/estacion-estado.ts`, y lo
  llaman tanto la ruta de pedir trabajo como la de avisar avance/error/hecho.
  Además la Estación repite el último avance cada 45 s durante los pasos largos
  (empaquetar y render pueden pasar minutos sin avisar).
- **Cómo se comprueba:** `pruebas/estacion-estado.test.ts`. En vivo: aprobar un
  guion y mirar la portada del panel durante el render: «Estación: conectada».
- **Qué NO tocar:** no volver a escribir el `INSERT` del latido a mano en una
  ruta; siempre `tocarLatido`.

## C-VOZ-2 — La voz suena pareja y lee bien los números (27 sep 2026)

- **Qué se rompía / cómo se veía:** en el primer video con la voz clonada de
  Richard (guion 4, trabajo 9) la voz «iba y venía»: unas escenas sonaban al
  frente y otras al fondo. Y «1925» se leía mal.
- **Causa real:** (1) la voz se genera escena por escena (una llamada por
  escena) y cada generación sale con un volumen distinto: medido entre -15,9 y
  -24,0 dB de una escena a otra. (2) El modelo Flash v2.5 no convierte cifras a
  palabras en español (la API no permite `apply_text_normalization` en Flash).
- **Qué se hizo:** en `estacion/src/voz.ts`: (a) `nivelar()` deja cada pieza a
  -16 LUFS en dos pasadas de `ffmpeg loudnorm` con ganancia lineal (no cambia
  los tiempos: comprobado, mismas duraciones antes y después, y las tres piezas
  de prueba quedaron en -16,3/-16,4/-16,3 dB); (b) se mandan `previous_text`,
  `next_text` y `previous_request_ids` (hasta 3) para que la entonación siga
  de una escena a la otra; (c) `numerosEnLetras` (`compartido/numeros.ts`)
  convierte años, miles, decimales, porcentajes, dólares y horas a palabras
  antes de mandar el texto, y los subtítulos muestran lo mismo que se dice. El
  prompt además pide los números en letras desde el guion.
- **Cómo se comprueba:** `pruebas/numeros.test.ts` (falló en rojo con «v2.5»
  antes del arreglo). Volumen: medir `out/t<id>/escena-*.mp3` con
  `ffmpeg -af volumedetect`: todas alrededor de -16 dB.
- **Qué NO tocar:** no quitar `nivelar` ni pasar `linear=false` (comprime la
  voz); no mandar cifras a ElevenLabs.

## C-IMAGEN-2 — Las imágenes con IA son fotografías y se parecen a la persona (27 sep 2026)

- **Qué se rompía / cómo se veía:** Richard vio el video de Celia (trabajo 10):
  «parecen caricaturas de mala muerte, es otra cantante». Con razón: el estilo
  pedido era «ilustración pictórica» y el modelo no conoce la cara de la artista.
- **Causa real:** `ESTILO_BASE` pedía pintura, y el modelo de texto a imagen
  inventa una cara cualquiera.
- **Qué se hizo:** (1) estilo fotográfico realista; (2) en biografías, la
  Estación busca una foto libre de la persona en Wikimedia Commons y la manda
  como referencia al modelo de edición de Seedream 4 (`…/seedream/v4/edit`,
  $0,03 por imagen, mismo precio; en `IMAGENES_PERMITIDAS`), con la orden de
  conservar la cara. Probado el 27 sep 2026: con referencia nítida sí se parece
  (foto de concierto años 70). Wikimedia no deja que fal baje la foto: se manda
  en base64, reducida a 1280 px (`referenciaEnBase64`). Si no hay foto libre,
  avisa en el paso del trabajo y genera sin referencia.
- **Cómo se comprueba:** `pruebas/modelos.test.ts` (el modelo con referencia
  está permitido y bajo el tope); en vivo, el paso «foto de referencia de X: sí»
  y las imágenes de `out/t<id>/ia/`.
- **Qué NO tocar:** no volver al estilo «painterly»; no mandar la URL de
  Wikimedia a fal (falla); la referencia se pasa por `opciones.referencia`.
- **Si no alcanza:** el generador de ChatGPT (gpt-image, calidad baja) conoce a
  los famosos; requiere clave de OpenAI de Richard (pendiente en PENDIENTES.md).

## C-VOZ-3 — La H muda no se aspira (27 sep 2026)

- **Qué se rompía:** «Habana» sonaba «Jabana» con la voz clonada (Flash v2.5).
- **Qué se hizo:** `compartido/pronunciacion.ts` quita la H muda solo en el
  texto que se manda a la voz (con lista de préstamos donde sí suena: Houston,
  hardware, hip hop…); los subtítulos conservan la palabra original porque
  `paraLaVoz` nunca cambia la cantidad de palabras y `voz.ts` repone el texto.
- **Cómo se comprueba:** `pruebas/pronunciacion.test.ts`.
