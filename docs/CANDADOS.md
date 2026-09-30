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

## C-VOZ-5 — Cifras en pantalla, letras en la voz (28 sep 2026)

- **Qué se rompía / cómo se veía:** en el video de Luis Miguel (trabajo 20) el
  primer Short se tituló «Mil novecientos ochenta y seis» y los subtítulos
  decían «ochenta y cinco ganó». El prompt pedía los números en letras en la
  narración (por la voz), y como el conversor de la Estación (C-VOZ-2) ya
  resuelve eso, el texto escrito quedaba feo en pantalla y en los títulos.
- **Qué se hizo:** (1) el prompt pide cifras en todos los campos (1985, 14
  años, 250.000, 15%, $22; rangos 1925-2003); (2) `emparejarConLetras`
  (`compartido/numeros.ts`) empareja cada palabra escrita con las palabras que
  la voz dice por ella, y `generarVoz` arma los subtítulos con la palabra
  escrita y los tiempos de lo dicho. Si no cuadra, se dejan las de la voz.
- **Cómo se comprueba:** `pruebas/numeros.test.ts` («empareja cada cifra…»);
  en vivo, un guion con «1985» en la narración muestra «1985» en el subtítulo
  y el título del Short no sale en letras.
- **Qué NO tocar:** el conversor a letras sigue delante de la voz; solo cambió
  lo que se muestra. El prompt no debe volver a pedir «números en letras».

## C-MARCA-1 — Un video de Full Código sale con la marca de Full Código (30 sep 2026)

- **Qué faltaba / cómo se veía:** el canal de tecnología se llamaba «Canal de
  IA», sin nombre ni @ (el cierre de los Shorts salía sin tarjeta de canal), y
  sus videos se veían igual que una biografía de Caprichoso TV: ámbar, sin logo.
  En el panel no había forma de separar los guiones de un canal de los del otro.
- **Qué se hizo:** (1) el canal es **Full Código** (@FullCodigo) por defecto
  (`compartido/canales.ts`, `NOMBRE_CANAL`); (2) `compartido/marcas.ts` dice qué
  canal tiene marca; la Estación la resuelve por la temática del trabajo y
  `produccion.ts` copia el logo y la pasa en las props (`marca`); (3) la
  plantilla dibuja la marca con las piezas de `estacion/src/remotion/Marca.tsx`:
  logo fijo, letra de código, título de terminal, rótulos `// …`, ventana de
  noticias, cierre con «SUSCRÍBETE», logo en el cierre de los Shorts y en la
  miniatura; (4) temática nueva `novedades-ia`; (5) separador de canales en
  Guiones, Nuevo video y Calendario (`FiltroCanal`, `ChipCanal`). Todo el
  detalle en [MARCA.md](MARCA.md).
- **Cómo se comprueba:** `pruebas/marca.test.ts` y `pruebas/filtro-canal.test.tsx`
  (comprobadas en rojo: sin marca para el canal, y sin pasar la marca a la
  plantilla, fallan). A la vista: `npx tsx src/muestra-marca.ts` desde
  `estacion/` deja 15 cuadros en `out/muestra-marca/`.
- **Qué NO tocar:** `Marca.tsx` y `props.ts` no pueden importar de
  `@compartido` (el empaquetador de Remotion no resuelve ese alias): por eso los
  colores viajan dentro de `marca` en las props. Si falta el logo, el video sale
  SIN marca y la Estación lo dice en el registro («MARCA: falta el logo…»); no
  quitar ese aviso. El cierre del canal dura `COLA_CON_MARCA_MS`; si se acorta,
  el botón de suscribirse no llega a leerse.

## C-MUSICA-2 — La música es del mundo del video, no solo del mismo ánimo (30 sep 2026)

- **Qué se rompía:** la pista se elegía por palabras en común con el estilo del
  guion, y el ánimo contaba igual que el género. Un video de tecnología que
  pedía algo «upbeat» se habría quedado con una salsa, porque la salsa también
  es «upbeat» y el catálogo solo tenía música latina.
- **Qué se hizo:** `elegirPista` (`compartido/musica.ts`) exige coincidir en algo
  de fondo (género, época, instrumento, origen); las palabras de ánimo
  (`ANIMOS`) solo desempatan. Y el motor trae su propia pista electrónica,
  `estacion/recursos/musica/electronic-tech-synth-minimal-curious-pulse.mp3`,
  escrita nota por nota por `scripts/musica-tech.mjs` (propia, sin derechos de
  terceros; por eso sí va en el repositorio).
- **Cómo se comprueba:** `pruebas/musica.test.ts`, bloque C-MUSICA-2 (en rojo:
  sin la regla, el video de tecnología se queda con la salsa). En la Estación,
  el paso «música: electronic-tech-…» al producir un video de Full Código.
- **Qué NO tocar:** el nombre del archivo ES su ficha (con esas palabras se
  elige). Si se regenera la pista, conservar el nombre.

## C-ENTREGA-1 — Un corte de red no tumba una producción, y reintentar no produce dos veces (30 sep 2026)

- **Qué se rompió / cómo se veía:** el guion 6 (Prince Royce) se armó completo
  (video largo y cuatro Shorts) y al subirlo al panel se cortó la red un
  instante. El panel mostró «Producción: Falló · subiendo el video al panel 28%
  · fetch failed». Un solo trozo que no subió tumbó el trabajo entero, y el
  botón «Reintentar» habría vuelto a producir todo desde cero (otra vez la
  voz, otra media hora).
- **Causa:** las llamadas de la Estación al panel no reintentaban, y producir y
  entregar eran un solo paso.
- **Qué se hizo:** (1) toda llamada al panel pasa por `conReintentos`
  (`compartido/reintentos.ts`): ante un fallo de red o un código pasajero
  (429, 500, 502, 503, 504) espera 2, 5, 15, 30 y 60 segundos y vuelve a
  intentar; un rechazo del panel (400, 401, 404, 409, 422) falla de una.
  (2) al terminar de producir, la Estación guarda `resultado.json` en la
  carpeta del trabajo con la huella del guion; si un trabajo nuevo trae el
  mismo guion y hay una producción completa sin entregar, **retoma la
  entrega** y no produce (`estacion/src/entrega.ts`,
  `elegirProduccionSinEntregar`). Al entregar se marca `entregado`.
- **Cómo se comprueba:** `pruebas/entrega.test.ts` (en rojo al quitar «fetch
  failed» de lo que se reintenta: fallaron 3). En vivo, el 30 sep 2026 el
  trabajo 22 retomó la entrega del 21, la red volvió a fallar en un trozo y el
  registro dijo «reintento 1 en 2 s»; terminó en «hecho».
- **Qué NO tocar:** no volver a llamar al panel con `fetch` suelto; no borrar
  `resultado.json` de un trabajo sin entregar. Para producir de nuevo un guion
  ya entregado, «Reintentar» sí produce desde cero (la producción entregada no
  se retoma).

## C-PUBLICACION-2 — Palabras clave de más no tumban los textos de YouTube (30 sep 2026)

- **Qué se rompió:** al pedir que parte de las 30 palabras clave fueran en
  inglés, la IA devolvió 30 en español más las de inglés y el panel rechazó
  todo con «expected array to have <=30 items». Los textos anteriores quedaron
  intactos, pero no se podían volver a escribir.
- **Qué se hizo:** a la IA se le piden dos listas (`etiquetas` en español y
  `etiquetas_ingles`) con holgura (`esquemaPublicacionDeLaIA`), y `unirEtiquetas`
  deja exactamente 30: hasta 8 en inglés y el resto en español, sin repetir.
  Lo que se guarda sigue validándose con el esquema de 30.
- **Cómo se comprueba:** `pruebas/publicacion.test.ts` («si la IA manda palabras
  clave de más…»), en rojo al quitar el recorte.
- **También ese día:** un título de Short afirmó algo de otra parte del video
  («número 1 con Shakira», que el guion no dice). Ahora el mensaje a la IA
  lleva debajo de cada short el texto de SUS escenas, y la regla dice que el
  título solo puede afirmar lo que está ahí.
- **Qué NO tocar:** no volver a validar lo que escribe la IA con el tope
  exacto; el tope se aplica al unir.

## C-VERSIONES-1 — En el panel se ve la última entrega, no todas mezcladas (30 sep 2026)

- **Qué pasaba:** al corregir dos fotos del video de Prince Royce y entregarlo
  otra vez, la página del guion listaba los dos videos largos y los ocho
  Shorts juntos. Richard podía descargar la versión vieja sin darse cuenta.
- **Qué se hizo:** `separarEntregas` (`compartido/videos.ts`) deja a la vista el
  video largo más nuevo y los Shorts que subieron después; lo anterior queda
  plegado en «Versiones anteriores».
- **Cómo se comprueba:** `pruebas/videos.test.ts` (en rojo al mostrar todo).
- **Qué NO tocar:** los videos viejos no se borran del almacén desde aquí.

## C-IMAGEN-4 — Ni fotos con marca de agua ni gente que no es de la historia (30 sep 2026)

- **Qué se veía:** en el video de Prince Royce salió una foto con la marca de
  agua de una agencia de fotos encima, y la escena de «Latin Grammy Las Vegas»
  mostró a una artista cualquiera en la alfombra roja, porque a toda foto de
  internet se le exigía una cara.
- **Qué se hizo:** (1) `esDeAgencia` (`compartido/fotosweb.ts`) descarta las
  agencias de fotos (Getty, iStock, Shutterstock, Alamy y otras) al leer la
  respuesta del buscador, y una foto de agencia guardada en el caché deja de
  valer; (2) el guion puede marcar `visual.foto_de: "lugar"`: ahí no se exige
  cara, se prefiere la foto sin una persona en primer plano y no se cae de
  reserva en el nombre del artista. El prompt pide buscar el sitio concreto
  («MGM Grand Garden Arena Las Vegas»), no el nombre de la premiación.
- **Cómo se comprueba:** `pruebas/fotosweb.test.ts` (en rojo al apagar el
  filtro de agencias). Las dos fotos del video de Prince Royce se cambiaron y
  el video se volvió a armar con la misma voz.
- **También ese día:** una escena de relleno («award trophy backstage») salió
  con un trofeo de fútbol americano. El prompt ahora pide que, en historias de
  música, los clips de relleno se busquen en el mundo de la música y evita las
  palabras que traen deportes. Y el fondo difuminado de una escena de foto es
  su propia foto: al cambiar una foto a mano hay que cambiar también su fondo.
- **Qué NO tocar:** la lista de agencias solo crece; para una persona la cara
  sigue siendo obligatoria.

## C-VERSION-1 — El canario dice qué versión está en vivo (29 sep 2026)

- **Qué pasaba:** después de publicar no había forma de comprobar desde fuera
  que la versión nueva ya se estaba sirviendo; lo nuevo vivía en pantallas con
  contraseña. Richard abrió la app y no supo si ya tenía el cambio.
- **Qué se hizo:** la publicación compila con `NEXT_PUBLIC_VERSION` (el commit)
  y `/datos/salud` lo devuelve en `version`. `scripts/humo.mjs` lo imprime.
- **Cómo se comprueba:** `curl -s https://escenia.sitios.dev/datos/salud` tiene
  que decir los 7 primeros caracteres del último commit de `main`.
- **Qué NO tocar:** no afirmar «publicado y comprobado en vivo» sin ver esa
  versión en el canario.

## C-CALENDARIO-1 — Dos videos no salen a la misma hora ni demasiado juntos (29 sep 2026)

- **Qué pasaba:** con producción para publicar a diario, Richard programaba en
  YouTube Studio sin ver qué había ya ese día: dos Shorts el mismo día sin
  saber a qué hora, y riesgo de pisar un video con otro.
- **Qué se hizo:** calendario de publicaciones en el panel (`/calendario`,
  guía en [CALENDARIO.md](CALENDARIO.md)). Toda escritura pasa por `agendar`
  (`src/lib/calendario.ts`), que llama a `revisarHueco`
  (`compartido/calendario.ts`): misma hora, separación mínima, máximo por día,
  Short antes que su largo y fechas pasadas. Además la base tiene el índice
  único `calendario_hueco_3` (canal, plataforma, fecha, hora, solo para lo
  «agendado»): aunque el código fallara, no entran dos planes a la misma hora.
  Lo ya «programado» en la plataforma y lo ya «publicado» son hechos: se
  anotan tal como están y `agendar` devuelve un `aviso` si quedaron pegados a
  otra publicación (cambio del 29 sep 2026, al cargar las fechas reales de
  Richard: dos videos a 15 minutos y tres Shorts el mismo día).
- **Qué se ve (29 sep 2026):** una sola lista con lo que falta por publicarse,
  agrupada por día (`porDia`), con la red de cada video como etiqueta de color
  y un filtro por red arriba. «Publicar también en» (`plataformasFaltantes`)
  manda una pieza de Escenia a otra red como una publicación más. Lección de
  ese día: al simplificar la pantalla se quitaron las redes de golpe y Richard
  lo notó; la red es parte central de una publicación y no se esconde. `yaSalio` y
  `sePasoLaFecha` (`compartido/calendario.ts`) deciden qué se oculta y qué se
  avisa. Lo ya publicado sigue en la base y sigue contando para las reglas.
- **Cómo se comprueba:** `pruebas/calendario.test.ts` (comprobada en rojo el 29
  sep 2026 rompiendo la revisión de la misma hora: fallaron 2 pruebas); el
  canario dice `calendario: ok`.
- **Qué NO tocar:** no escribir en la tabla `calendario` sin pasar por
  `agendar`; no quitar el índice `calendario_hueco_3`; las horas se guardan en el
  reloj de Richard, no en UTC.

## C-APP-1 — El panel se instala en el teléfono y no guarda datos en él (29 sep 2026)

- **Qué se pidió:** Richard quería el panel instalado en el teléfono, y ver
  cada publicación del calendario con su miniatura.
- **Qué se hizo:** manifiesto, íconos, servicio mínimo y pantalla «Sin
  conexión» (guía en [APP.md](APP.md)). El proxy deja pasar sin sesión solo
  `RUTAS_DE_LA_APP` y `/iconos/`. La política de seguridad suma
  `https://i.ytimg.com` (miniaturas), `worker-src` y `manifest-src`.
- **Cómo se comprueba:** `pruebas/app-instalable.test.ts` (comprobada en rojo
  quitando las rutas de la app del proxy) y `node scripts/probar-app.mjs
https://escenia.sitios.dev` en un navegador de teléfono real.
- **Fallo del 29 sep 2026 (el mismo día):** instalada en el iPhone, el menú
  quedaba debajo de la hora y de la cámara, porque la app instalada ocupa toda
  la pantalla. Se corrigió con el margen de la franja en `body`
  (`env(safe-area-inset-*)`). Además la app abre en el calendario
  (`alAbrirLaApp`). Las dos cosas tienen su prueba; la del margen se comprobó
  en rojo quitándolo.
- **Qué NO tocar:** el servicio (`public/sw.js`) no debe guardar pantallas ni
  datos del panel; las pantallas se piden siempre a la red. Al cambiar el
  servicio se sube `VERSION`. No abrir más rutas sin sesión.

## C-BORRADOR-2 — El borrador no guarda los campos internos del formulario (29 sep 2026)

- **Qué se rompía:** `useBorrador` guardaba también los campos ocultos que el
  framework mete en los formularios (`$ACTION_KEY`, `$ACTION_…`) y los
  devolvía al volver. Con un valor viejo, el envío del formulario podía fallar
  después de una publicación nueva. Afectaba a todos los formularios.
- **Qué se hizo:** `guardarBorrador` y `rellenarFormulario` saltan todo campo
  cuyo nombre empieza por `$`. Los campos ocultos (`type="hidden"`)
  tampoco se guardan ni se pisan al volver: los pone el programa, no la persona.
- **Cómo se comprueba:** `pruebas/borrador.test.tsx` («no guarda ni devuelve
  los campos internos…»), comprobada en rojo con el código anterior.
- **Qué NO tocar:** los formularios nuevos siguen usando `useBorrador`; si el
  servidor rechaza, lo escrito vuelve con `rellenarFormulario` (ver
  `FormularioManual.tsx`).

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

## C-PUBLICACION-1 — Al terminar un video, Escenia escribe los textos de YouTube (27 sep 2026)

- **Qué pidió Richard:** el título del largo, un título por Short y las 30
  palabras clave que YouTube pide, sin tener que inventarlos él cada vez.
- **Qué se hizo:** al terminar la producción, la Estación llama a
  `POST /datos/estacion/publicacion/<id>` (con el secreto) con la lista
  de shorts (índice, título provisional, escenas que abarca, duración). El
  panel (`src/lib/publicacion.ts`) le pide a Claude, con formato estricto
  (`esquemaPublicacionGenerada`): título ≤ 70 letras, un título distinto por
  short ≤ 60, descripción de 3 párrafos + hashtags y exactamente 30 palabras
  clave. Queda en `contenido.publicacion` del guion y la página del guion lo
  muestra en «Para YouTube» con botón de copiar por campo (las etiquetas en una
  sola línea de máximo 500 letras, como pide YouTube) y un botón «Volver a
  escribir». Pasa por el tope de gasto diario.
- **Cómo se comprueba:** `pruebas/publicacion.test.ts`; en vivo, la sección
  «Para YouTube» del guion 4.
- **Qué NO tocar:** la ruta es la única que escribe `publicacion`; la Estación
  no tiene clave de Anthropic (la clave vive solo en el panel).

## C-CIERRE-1 — El cierre de los Shorts manda al video completo, con miniatura y canal (28 sep 2026)

- **Qué pidió Richard:** el cierre de sus videos presenciales (hecho con su app
  en Beellon): «¿Te gustó?», «VER VIDEO COMPLETO», la miniatura del largo como
  un video con ▶ y barra, la caja de búsqueda con el título (en un Short no hay
  enlace: la gente busca el título) y la tarjeta del canal. Y 100 % automático.
- **Qué se hizo:** (1) la Estación renderiza la **miniatura** del largo
  (composición `Miniatura`, 1280×720, PNG: la mejor foto con cara, nombre grande
  y gancho del título) con el mismo empaquetado, la sube al panel como archivo
  `miniatura` y la mete en las props del short como data URI (así no hace falta
  re-empaquetar); (2) `CierreShort` la dibuja con ▶, barra que avanza, la caja
  de búsqueda con el título y la tarjeta del canal; dura 5 s
  (`CIERRE_SHORT_MS`); (3) el nombre y el @ del canal viven en Ajustes
  (`canal_ia_*`, `canal_caprichoso_*`, `compartido/canales.ts`) y el panel los
  manda en cada trabajo según el canal de la temática.
- **Cómo se comprueba:** `pruebas/miniatura.test.ts`; en vivo, los últimos 5 s
  de cualquier short y el archivo `miniatura.png` en `out/t<id>/`.
- **Qué NO tocar:** la miniatura viaja como data URI en `props.cierre` porque
  el publicDir se copia al empaquetar (C-EMPAQUE-1); no leerla con `staticFile`.

## C-IMAGEN-3 — El artista es el artista: fotos reales de internet y sin carrera al reducir la referencia (28 sep 2026)

- **Qué se rompía / cómo se veía:** en el video de Luis Miguel (trabajo 19) no
  salía Luis Miguel por ningún lado. Dos causas: (1) tres imágenes se pedían a
  la vez y las tres corrían `sips` sobre la MISMA foto de referencia: se
  pisaban el archivo temporal y TODAS las imágenes con IA fallaban (el registro
  decía «Imagen IA falló: Cannot to rename temporary file»); (2) Wikimedia
  Commons no tiene fotos de niño de casi nadie, así que las escenas de
  infancia se inventaban con un niño cualquiera.
- **Decisión de Richard (28 sep 2026):** contar las historias con fotos reales
  de internet (Google Imágenes); se genera con IA solo lo que no existe en foto.
- **Ojo (28 sep 2026):** la API oficial de Google (Custom Search JSON) está
  **cerrada a clientes nuevos** (lo dice su página desde el 18 feb 2026 y se
  apaga el 1 ene 2027). Por eso se busca por **Serper** (serper.dev), que
  devuelve los resultados de Google Imágenes: 2.500 consultas gratis, después
  prepago ($50 por 50.000). Guía: [docs/FOTOS-INTERNET.md](FOTOS-INTERNET.md).
- **Qué se hizo:** (1) `referenciaEnBase64` reduce cada referencia UNA sola vez
  (mapa de promesas en curso); (2) `estacion/src/fotosweb.ts`: búsqueda de
  imágenes de Google vía Serper (`POST google.serper.dev/images`,
  `SERPER_API_KEY` en `estacion/.env`; `candidatasDeSerper` lee la
  respuesta), baja hasta 5 candidatas (y salta las que llegan como página
  HTML en vez de foto: `esImagen` mira el tipo de contenido y los primeros
  bytes; TikTok y Pinterest hacen eso), exige cara
  (detector de la Mac) y tamaño, elige la mejor (`compartido/fotosweb.ts`) y
  la guarda en `cache/fotos-web` con caché por consulta; (3) `buscarFoto` mira
  primero internet y después Commons; `buscarReferencias` pide una foto real
  por década del guion («Luis Miguel 1985») y una de niño si el guion tiene
  infancia (`ES_INFANCIA`), y `elegirReferencia` usa la de niño para esas
  escenas; (4) el prompt pide «foto» (nombre + año) para todo lo público y «ia»
  solo para lo íntimo. Sin la clave de Serper, todo sigue con Commons y el
  arranque de la Estación lo dice.
- **Cómo se comprueba:** `pruebas/fotosweb.test.ts`, `pruebas/referencias.test.ts`;
  en vivo, el paso «fotos de referencia de X: N (…)» y `creditos.txt` con
  «Foto de internet (uso editorial): …».
- **Qué NO tocar:** no volver a llamar `sips` en paralelo sobre el mismo
  archivo; la clave de Serper solo en `estacion/.env`; no volver a la API de
  Google Custom Search (cerrada a cuentas nuevas).

## C-FONDO-1 — Los fondos son de la persona, no clips ajenos (28 sep 2026)

- **Qué se rompía:** detrás de los titulares y recortes de una biografía
  salían clips de Pexels de «pantallas de trading» (las búsquedas de reserva
  eran de tecnología) y se repetían de un video a otro.
- **Qué se hizo:** en biografías, detrás de fotos, titulares, recortes e
  interludios va una foto de la persona difuminada (`fondoFoto` en las props,
  `Fondo` en la plantilla); solo las escenas «stock» llevan clip, y sus
  búsquedas de reserva son de música y época (`RESERVA_DOCUMENTAL`).
- **Cómo se comprueba:** en un documental, ningún titular tiene fondo de
  oficina o pantallas; `creditos.txt` casi sin Pexels.
