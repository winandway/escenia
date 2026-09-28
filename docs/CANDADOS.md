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
  `estacion/src/remotion/musica.ts`: 12 % mientras hay voz, 80 % solo dentro de
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
  **Ni usar `loop` en el `<Audio>` de la música**: con `loop`, el frame que recibe
  `volume` se reinicia en cada vuelta y los interludios después del primer bucle
  salían bajos (visto el 27 sep 2026, trabajo 13: -31,6 dB en vez de subir). El
  bucle se hace a mano con una `<Sequence>` por vuelta, cada una con su
  desplazamiento.

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
- **Segunda vuelta (27 sep 2026, Richard: «el mismo vestido en todas»):** la
  referencia se usa SOLO para la cara: el prompt le prohíbe al modelo copiar la
  ropa, el peinado, la pose y el fondo, y el guion describe ropa y peinado
  distintos en cada cuadro más el año y la edad. Además hay varias fotos de
  referencia, una por década (`buscarReferencias` en `estacion/src/fotos.ts`,
  año del título o de la cámara), y cada cuadro usa la de la época más cercana
  (`compartido/referencias.ts`); en la infancia no se usa ninguna (una foto
  adulta daría una adulta). Probado: 1950 en la radio con blusa blanca y 1998
  en Miami con peluca rubia y vestido naranja, las dos con su cara.
- **Si no alcanza:** el generador de ChatGPT (gpt-image, calidad baja) conoce a
  los famosos; requiere clave de OpenAI de Richard (pendiente en PENDIENTES.md).

## C-VOZ-3 — La H muda no se aspira (27 sep 2026)

- **Qué se rompía:** «Habana» sonaba «Jabana» con la voz clonada (Flash v2.5).
- **Qué se hizo:** `compartido/pronunciacion.ts` quita la H muda solo en el
  texto que se manda a la voz (con lista de préstamos donde sí suena: Houston,
  hardware, hip hop…); los subtítulos conservan la palabra original porque
  `paraLaVoz` nunca cambia la cantidad de palabras y `voz.ts` repone el texto.
- **Cómo se comprueba:** `pruebas/pronunciacion.test.ts`.

## C-VOZ-4 — Ritmo de lectura parejo (27 sep 2026)

- **Qué se rompía / cómo se veía:** Richard: «a veces se acelera y a veces se
  pone lento, y cuando se pone lento aburre». Medido en el trabajo 14: de 104
  a 163 palabras por minuto según la escena, porque cada escena es una
  generación distinta de la voz.
- **Qué se hizo:** `compartido/ritmo.ts` mide letras pronunciadas por segundo
  de cada pieza y calcula un factor hacia 11 letras/s (≈150 palabras por
  minuto, «un poco rápido»), acotado entre 0,85 y 1,25; `voz.ts` aplica
  `ffmpeg atempo` (no cambia el tono) y reescala los tiempos de la alineación
  para que los subtítulos sigan clavados. Después se nivela el volumen (C-VOZ-2).
- **Cómo se comprueba:** `pruebas/ritmo.test.ts`; en vivo, el registro de la
  Estación dice «ritmo escena N: ×1.18» y las escenas quedan todas entre 140 y
  160 palabras por minuto.
- **Qué NO tocar:** el orden es tempo → reescalar alineación → nivelar; el
  factor máximo 1,25 (más se nota artificial).

## C-SHORTS-1 — Cada video largo sale con sus Shorts 9:16 (27 sep 2026)

- **Qué pidió Richard:** el mismo video en trozos verticales de 1 a 3 minutos,
  cortados donde está la fuerza, con las imágenes y letras adaptadas (nada
  cortado), 3 a 5 por video, mismo audio.
- **Qué se hizo:** `compartido/shorts.ts` planifica los trozos (escenas
  contiguas, nunca partidas; arrancan en gancho/dato/titular/periódico; 45 s a
  3 min; 3 a 5 según el largo; nunca arrancan en interludio ni en la opinión).
  La plantilla recibe `ventana` y dibuja solo ese tramo con título propio
  (2,2 s), voz recortada con `startFrom/endAt`, música y subtítulos en el reloj
  del short, foto a lo ancho sin recortar, y cierre «¿Te gustó? Ver video
  completo» (3,2 s). La Estación empaqueta una sola vez y renderiza el 16:9 y
  luego cada short (`short-N.mp4`), los sube como `9x16` y los lista en
  `renders`.
- **Cómo se comprueba:** `pruebas/shorts.test.ts`; en vivo, la página del guion
  muestra el 16:9 y los shorts (9x16) debajo.
- **Qué NO tocar:** `tMs` en la plantilla es SIEMPRE tiempo del video largo;
  todo lo que se posiciona pasa por `aFrame()` / `aLocalMs()`.

## C-SHORTS-2 — En los Shorts la foto llena la pantalla, recortada sobre la persona (27 sep 2026)

- **Qué pidió Richard:** nada de «video horizontal chiquito dentro del short»:
  la imagen a pantalla completa en vertical, cortada donde está el artista (nos
  mandó ocho capturas con el cuadro rojo), y las letras encima.
- **Qué se hizo:** la Mac detecta las caras con Vision
  (`estacion/herramientas/caras.swift`, se compila solo a `estacion/bin/caras`
  la primera vez); `compartido/enfoque.ts` elige el punto de enfoque (la cara
  más grande, o el medio de la pareja si están cerca) y calcula el
  `object-position` para que al llenar el marco 9:16 la cara quede en cuadro;
  la Estación guarda ese enfoque en cada foto de las props (con caché en
  `cache/enfoques.json`); la plantilla, en vertical, dibuja la foto a pantalla
  completa con ese recorte, movimiento suave y un degradado abajo para que los
  subtítulos se lean. Cada foto ENTRA deslizada (alternando derecha e izquierda, con rebote
  corto) y con su silbido («whoosh») al 60 %, estilo TikTok/CapCut, como pidió
  Richard. El 16:9 no cambia (fundidos).
- **Cómo se comprueba:** `pruebas/enfoque.test.ts`; en vivo, un short de una
  biografía: la cara siempre dentro del cuadro. Sin compilador Swift, la
  Estación avisa y recorta por el centro (no falla).
- **Qué NO tocar:** el detector devuelve fracciones con origen arriba-izquierda
  (Vision las da con origen abajo; el `.swift` ya invierte la Y).
  **La plantilla (`estacion/src/remotion/*`) NO puede importar de `@compartido`**:
  el empaquetador de Remotion no resuelve ese alias y el render falla con
  «Module not found». Lo que necesite la plantilla vive en `src/remotion/`.

## C-GANCHO-1 — Los primeros 3 segundos son imagen y voz, sin portada (27 sep 2026)

- **Qué pidió Richard:** «el intro mata; hay tres segundos para enganchar». La
  portada oscura con el título (3,2 s) y una primera escena de ambientación
  hacían que la gente deslizara.
- **Qué se hizo:** la plantilla ya no tiene portada: la primera imagen y la voz
  arrancan en el segundo cero y el título pasa como una banda pequeña arriba
  (`TituloBanda`, 3 s), en el 16:9 y en los shorts (`INTRO_SHORT_MS = 0`). El
  prompt exige que la primera escena abra con la persona en imagen y un dato o
  emoción concreta, nunca con «titular», «texto» ni contexto general. Al guion
  4 se le quitó la escena de ambientación.
- **Cómo se comprueba:** cualquier video nuevo: en el segundo 1 ya se ve la
  imagen y se oye la voz.
- **Qué NO tocar:** no volver a poner una portada al inicio (el componente
  `Titulo` se eliminó).
