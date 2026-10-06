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

## C-ENTREGA-2 — Los créditos de un video con cien fotos caben en la entrega (2 oct 2026)

- **Qué se rompió / cómo se veía:** el primer video con el ritmo nuevo (146
  imágenes) se armó completo y falló en el último paso: «El panel respondió 400
  en /datos/estacion/archivos…». La lista de créditos viajaba en la dirección
  de la petición, con tope de 4.000 letras, y con cien fotos no cabía.
- **Qué se hizo:** la ficha del archivo (`meta`, con los créditos) viaja ahora
  en una cabecera (`x-escenia-meta`, en base64) con tope de 60.000 letras
  (`compartido/meta.ts`). La ruta del panel lee la cabecera y, si no viene, el
  parámetro viejo. La producción no se perdió: se retomó la entrega
  (C-ENTREGA-1).
- **Cómo se comprueba:** `pruebas/meta.test.ts` (150 créditos pasan enteros).
- **Qué NO tocar:** no devolver la ficha a la dirección de la petición.

## C-IMAGEN-6 — La foto con rótulo es de quien dice el rótulo (2 oct 2026)

- **Qué se vio al revisar el primer video con planos:** una miniatura de
  YouTube con el letrero «MIX 2025» de otro canal, un dibujo de un fan sacado
  de Pinterest, y una foto de una galería de «famosos en la alfombra roja» que
  no se podía saber de quién era, las tres con el rótulo «Romeo Santos».
- **Qué se hizo:** `elegirCandidata` (`compartido/fotosweb.ts`) ordena las
  candidatas por señales: primero la foto de un medio cuya dirección NOMBRA a
  la persona buscada («…/romeo-santos.jpeg»); YouTube, Pinterest y arte de fans
  quedan «de segunda» y solo entran si no hay otra. Además, el archivo de caché
  de las fotos se escribe en fila (`estacion/src/serie.ts`): al pedir de a tres
  se pisaban y se perdía de dónde salió cada foto.
- **Cómo se comprueba:** `pruebas/fotosweb.test.ts` (bloques C-IMAGEN-6) y
  `pruebas/serie.test.ts`. Al revisar un video: cada foto con rótulo se coteja
  con su página de origen en `cache/fotos-web/consultas.json`.
- **Para corregir una foto de un video ya armado:**
  `npx tsx src/cambiar-foto.ts <trabajo> <foto.jpg> "<búsqueda nueva>"` y
  después `rearmar.ts`.
- **Qué NO tocar:** la IA no puede reconocer a una persona por la cara: la
  única comprobación válida es la fuente (el nombre en la dirección o un texto
  visible en la propia imagen). Una foto con rótulo y sin fuente clara se cambia.

## C-GUION-3 — A la IA se le exige un formato simple, sin opcionales (5 oct 2026)

- **Qué se rompió y cómo se veía:** al pedir un guion (cualquier temática), la
  API respondió «Schema is too complex» y no se escribía ninguno.
- **Causa real:** el formato que se le exigía a la IA era el mismo del guion
  guardado: 16 campos opcionales, varios dentro de listas que van dentro de
  otras listas (escenas → planos, escenas → diagrama → objetos). La API admite
  24 opcionales, pero además tiene un tope de complejidad que no publica, y esa
  combinación lo pasó. Contar opcionales (C-ESTILOS-1) no alcanzó para verlo
  venir. (Dato que salió al mirar el formato: la librería no le manda a la API
  las listas cerradas de valores; las pone como texto de ayuda y las valida
  después. O sea que el problema eran los opcionales, no las listas.)
- **Qué se hizo:** dos formatos. `compartido/guion-ia.ts` tiene el que se le
  exige a la IA (`esquemaGuionDeLaIA`): ni un opcional ni un campo de dos
  tipos; lo que no aplica va vacío. El ícono es texto libre, para no rechazar
  un guion porque la IA escribió «bodega» en vez de «deposito». Y
  `guionDesdeLaIA` lo pasa al guion de verdad: quita los vacíos, recorta lo
  largo sin cortar palabras, lleva cada ícono al dibujo que existe
  (`iconoDeDiagrama`), y un «diagrama» sin objetos queda como frase en grande.
  El guion guardado (`esquemaGuionGenerado`) no cambió.
- **Segunda parte, el mismo día:** con el formato ya aceptado, el primer plan
  de una grabación se rechazó porque la IA dejó `foto_de` vacío. La librería no
  le manda a la API las listas cerradas de valores (van como texto de ayuda) y
  las comprueba después: un valor fuera de lista tumbaba el guion entero. Ahora
  en `esquemaGuionDeLaIA` todo es texto, y `parteValida`, `tipoVisualValido` y
  `tipoDePlanoValido` llevan cada valor al válido más cercano.
- **Cómo se comprueba:** `pruebas/estilos.test.ts` (bloques C-GUION-3 y
  C-ESTILOS-1) y `pruebas/generador.test.ts`. **En vivo**, que es lo que
  manda: `estacion/node_modules/.bin/tsx scripts/crear-guion-remoto.ts < tema.json`
  tiene que dejar un borrador.
- **Comprobado en rojo:** con un opcional de vuelta en el formato de la IA, la
  prueba falla.
- **Qué NO tocar:** no agregar `.optional()`, `.nullable()`, uniones ni
  `z.enum` a `esquemaGuionDeLaIA`. Un campo nuevo entra obligatorio y
  vacío cuando no aplica, y se limpia en `guionDesdeLaIA`.
- **Lección:** el tope de la API no se puede medir desde aquí. Todo cambio en
  ese formato se prueba pidiendo un guion de verdad, el mismo día.

## C-PRESENTADOR-1 — El formato Presentador no le corta la cabeza ni le tapa la cara (5 oct 2026)

- **Qué se agregó:** el formato donde Richard sale grabado encima de los
  gráficos. Guía: [PRESENTADOR.md](PRESENTADOR.md).
- **Qué se rompió en la primera prueba y cómo se veía:** el presentador salía
  **sin cabeza**: el recorte empezaba en el cuello.
- **Causa real:** para saber qué espacio ocupa la figura se usaba el filtro
  `cropdetect` de ffmpeg, que decide por el promedio de cada fila. Una fila
  donde solo está la cabeza es casi toda negra, así que la daba por vacía.
- **Qué se hizo:** `quitarCroma` (`estacion/src/croma.ts`) mide el recuadro con
  el filtro `bbox` (cualquier punto de la figura cuenta) en toda la grabación,
  y `recorteDeFigura` toma el mayor, con margen, y nunca recorta por abajo. La
  cadena lleva `format=yuva420p,alphaextract,format=gray` (sin eso, ffmpeg no
  arranca).
- **Lo que vigila (`pruebas/presentador.test.ts`):** el recorte incluye la
  cabeza y llega hasta abajo; solo se quita un croma verde o azul parejo (un
  fondo negro va en ventana); cada escena empieza donde él dice sus primeras
  palabras y ninguna se pierde; abre en grande, va a la esquina y en la opinión
  se queda en grande; los ruidos de la transcripción no entran como palabras.
- **Comprobado en rojo** el 5 oct 2026 (tres fallos metidos a propósito).
- **Comprobado de punta a punta** con una grabación sintética (un muñeco sobre
  verde y la voz de la Mac): transcripción real, croma, video largo y Short, con
  fondo de Neón y de Cómic. **Falta probarlo con una grabación de Richard**: el
  borrado del verde con imagen real se rehízo después: ver C-CROMA-1.
- **Qué NO tocar:** no acelerar ni recortar pausas de la voz grabada sin cortar
  igual el video (se desfasa la boca); no volver a `cropdetect`.

## C-GRABACIONES-1 — Subir una grabación desde el panel: no se pierde, no se duplica, no se borra (5 oct 2026)

- **Qué se agregó:** la página **Grabaciones** del panel. Richard sube un video
  suyo hablando y la Estación lo convierte sola en un video del formato
  Presentador. Guía: [PRESENTADOR.md](PRESENTADOR.md).
- **Cómo funciona (lo que no hay que cambiar sin pensar):**
  - El archivo sube **por trozos de 8 MB** (multipart del almacén; el mínimo es
    5 MB por trozo y el panel acepta hasta 10). Un video no cabe en una sola
    petición.
  - La dirección en el almacén la arma el panel (`grabaciones/<fecha>-<azar>.<ext>`)
    y **se lee de la base** en cada trozo: el navegador nunca manda una ruta.
  - Sube quien tenga **sesión, desde el propio panel**, o la Estación con su
    secreto (`src/lib/permiso-subida.ts`).
  - La Estación solo ve grabaciones **terminadas de subir**, y las toma de a una.
    Una «tomada» sin señales por 40 minutos vuelve a la fila.
  - Con el plan nace **un** guion aprobado y **un** trabajo. El pedido del plan
    se hace una sola vez (sin reintentos automáticos: cuesta dinero), y si
    igual llega dos veces, `registrarPlan` reclama la grabación antes de crear
    nada: el segundo pedido devuelve el mismo guion.
  - Lo que falla queda **escrito en la grabación**, en palabras normales, con el
    botón «Intentar otra vez». Un error técnico de la IA no se le muestra crudo.
  - «Quitar» cambia el estado a `quitada`: no se borra ni la fila, ni el
    archivo, ni el guion, ni los videos.
- **Canario:** pieza `grabaciones` en `/datos/salud`. En rojo si falta la tabla
  o si, con la Mac encendida, hay una grabación esperando hace más de tres horas.
- **Lo que vigilan las pruebas** (`pruebas/grabaciones.test.ts`,
  `pruebas/permiso-subida.test.ts`): una subida a medias no se entrega; el plan
  duplicado no crea otro guion; la clave no usa el nombre del archivo; quitar
  no borra; al seguir una subida cortada no se repiten los trozos que ya
  llegaron; con la sesión cerrada no se insiste; sin sesión o desde otro sitio
  no se sube nada; las temáticas del Presentador no salen en «Nuevo video».
- **Comprobado en rojo** el 5 oct 2026: nueve fallos metidos a propósito, uno
  por uno; todos tumbaron su prueba. (El de la subida a medias tiene dos
  guardas —la consulta y la toma— y la prueba cae cuando se quitan las dos.)
- **Comprobado en local** con el panel empaquetado: subida desde el navegador de
  un archivo de 20 MB en tres trozos, toma por la Estación, bajada por rangos
  (206 y 416), avance, error corto y canario.
- **Comprobado en vivo** el 5 oct 2026, versión `1eb4b9f`: una grabación
  sintética de 19 MB (un muñeco sobre verde con la voz de la Mac) subida al
  panel real en tres trozos con `subir-grabacion.ts`; la Estación la tomó a los
  veinte segundos, la bajó, la transcribió (110 palabras), el panel armó el plan
  (guion 10, trabajo 31) y salió el video largo, un Short, los textos y dos
  miniaturas. Dos minutos y medio en total y menos de cinco centavos. Se
  revisaron cuadros del largo y del Short. Después la prueba se sacó de las
  listas con `scripts/retirar-prueba-remota.ts` (no borra nada).
- **Lo que NO se pudo comprobar en vivo:** la subida desde el navegador con la
  sesión de Richard (se probó en local con el mismo paquete que se publica; en
  vivo, sin sesión, las rutas responden 401 y la página manda a «Entrar»), y el
  borrado del verde con una grabación real suya.
- **Qué NO tocar:** no subir `TAMANO_PARTE` por encima de 10 MB ni bajarlo de 5;
  no dejar que el navegador mande la clave del almacén; no volver a ponerle
  reintentos automáticos al pedido del plan; no convertir «Quitar» en un borrado.

## C-IMAGENES-1 y C-COMERCIAL-1 — La biblioteca de imágenes y el comercial de un cliente (5 oct 2026)

- **Qué se agregó:** el menú **Imágenes** (carpetas con logos, capturas y PDF, muchos
  archivos de una vez) y el menú **Comerciales** (un video publicitario con el texto
  del cliente, nuestra voz, sus imágenes, en español o inglés). Guía:
  [COMERCIALES.md](COMERCIALES.md).
- **Lo que no puede pasar, y lo que lo vigila (`pruebas/comerciales.test.ts`):**
  - En el video de un cliente **no entra una foto de internet**: el plan prohíbe
    «foto» y «stock», `planComercialLimpio` los quita si la IA los pone igual, y en la
    producción `dejarSoloFiguras` deja solo las imágenes del cliente y los datos.
  - Una imagen que la IA pide y **no existe** no entra (`buscarImagenPorNombre`
    devuelve `null`); una que escribe distinto («pro in shop horizontal») sí se
    encuentra.
  - El **mismo nombre** en la misma carpeta reemplaza al anterior (se aparta, no se
    borra); «Quitar» no borra nada.
  - En **inglés** la voz recibe el texto tal cual: «100» y «here» no se tocan
    (`textoParaLaVoz`); en español siguen las cifras en letras y la H muda.
  - Un comercial da **un** guion aunque el plan se pida dos veces; sale sin canal, sin
    marca y sin Shorts (`producir` con `sinShorts` y `canal`/`marca` nulos).
- **Comprobado en rojo** el 5 oct 2026: diez fallos metidos a propósito, uno por uno.
- **Comprobado en vivo** el 5 oct 2026 con el material real de Andreea Blidar (16 logos
  PNG, un PDF de 19 capturas, el texto en inglés de su gig de logos): subida desde la
  Mac con `subir-imagenes.ts` y `pedir-comercial.ts`, plan de la IA con 11 imágenes y
  2 diagramas, video de 58 segundos con la voz femenina en inglés, miniatura con su logo.
  Lo que salió mal en la primera pasada y se arregló en la segunda: «Paso 2 de 4» en
  español dentro del video en inglés (ahora `idioma` en las props de la plantilla); la
  voz frenada con la regla de letras por segundo del español; la portada oscura del PDF
  ofrecida como captura (`paginaVacia`); la miniatura en español y sin el logo del
  cliente (`mensajePublicacion` con idioma y `logoDelCliente`); dos logos montados al
  cambiar de plano; las escenas de imágenes sin su título.
- **Qué NO tocar:** no volver a permitir «foto» en un comercial; el formato de un
  comercial se valida en el código (la tabla no lleva CHECK sobre `formato`).

## C-PORTADA-2 — La miniatura de un video con presentador lleva a Richard, y el fondo de rayos morados no vuelve (5 oct 2026)

- **Qué se rompió y cómo se veía:** las dos miniaturas del primer video de
  Richard (guion 12) salieron **vacías**: «CERO / IA GRATIS / PAGAS O VES
  ANUNCIOS» sobre rayos morados, sin ninguna persona. Sus palabras: «no es un
  diseño serio, no es de enganche… si no hay una miniatura que valga la pena,
  todo el trabajo estará perdido».
- **Causa real:** la portada buscaba a la persona entre las fotos con rótulo del
  video, y un video de Neón con presentador no tiene ninguna. A nadie se le
  ocurrió que la persona era él. El diseño «sin persona» era solo el fondo.
- **Qué se hizo:** en un video con presentador sin fondo, la persona de la
  portada sale de su grabación (`mejorCuadroDePresentador` e
  `instantesDeMuestra` en `compartido/portada.ts`; el recorte y la cara, con el
  mismo motor de macOS de siempre). Fondo nuevo, palabra tachada, marcas en
  pastillas y reglas nuevas para el texto que escribe la IA. Todo en
  [PORTADA.md](PORTADA.md), sección «El diseño de hoy».
- **Lo que vigila (`pruebas/portada.test.ts`):** se elige el cuadro de gesto más
  abierto con la cara a la vista; el Short no repite el momento del largo; la
  palabra tachada; las marcas (hasta tres) y que la IA sabe pedirlas; que
  «CERO IA GRATIS» queda como ejemplo de lo que no se escribe; que el fondo de
  rayos y el morado no vuelven.
- **Comprobado en rojo** el 5 oct 2026: siete fallos metidos a propósito.
- **Comprobado a la vista:** las dos miniaturas del guion 12, a tamaño completo
  y a tamaño de lista de YouTube (336 puntos de ancho): se leen la cara, «SE
  ACABÓ» y el remate.
- **Qué NO tocar:** no volver a `repeating-conic-gradient` ni al morado de
  fondo; no dejar una portada sin persona si el video tiene presentador.
- **Qué falta:** que Richard elija el momento y cambie el texto desde el panel.

## C-NOMBRES-1 — El producto de Richard sale bien escrito aunque la transcripción lo escriba «como suena» (5 oct 2026)

- **Qué se rompió y cómo se veía:** en su primera grabación dijo «Beellon.com» y
  el video salió con «**Billon.com**»: en los subtítulos, en el título del
  diagrama («Billon.com: tu alternativa») y en la barra de secciones. Justo en
  la escena donde vende su producto.
- **Causa real:** la transcripción (ElevenLabs Scribe) no conoce sus marcas y
  las escribe por el sonido; el plan de la IA copia esa transcripción.
- **Qué se hizo:** `NOMBRES_PROPIOS` y `corregirNombres` en
  `compartido/presentador.ts`. Cada palabra que llega con mayúscula inicial y
  es una forma mal escrita de un nombre suyo se cambia por el nombre correcto,
  conservando lo que lleve pegado («Billon.com,» → «Beellon.com,»). Se aplica al
  leer la transcripción (`palabrasDeTranscripcion` y el texto que va al plan),
  así que también corrige las transcripciones ya guardadas. «un billón de
  dólares», en minúscula, es una cifra y no se toca.
- **El guion 12** (ya planeado con el nombre mal) se corrigió en la base con un
  reemplazo exacto y se volvió a armar (trabajo 35).
- **Lo que vigila (`pruebas/presentador.test.ts`):** el caso real, la cifra que
  no se toca, y que los subtítulos salen corregidos.
- **Comprobado en rojo** el 5 oct 2026 (tres fallos metidos a propósito).
- **Para agregar un nombre:** una línea en `NOMBRES_PROPIOS`, con sus formas mal
  escritas en minúsculas y sin tilde. Solo sirve para nombres de UNA palabra;
  «Ya Dominios» o «QR Bot» partidos en dos todavía no se juntan.
- **Qué falta:** pasarle a la transcripción la lista de nombres para que los
  escriba bien de entrada (si el servicio lo permite), y que Richard pueda
  agregar nombres desde el panel.

## C-CROMA-1 — El fondo verde se encuentra donde esté, se borra sin comerse la ropa, y el video empieza cuando Richard habla (5 oct 2026)

Primera grabación real de Richard («videoFile-rendered 14.MOV», vertical, 109
segundos, grabación 3, guion 12). Salieron tres fallos que con el muñeco de
prueba no se veían:

1. **«Tu grabación no tiene fondo de croma: va en una ventana».** Sí lo tenía.
   El detector miraba las dos esquinas de arriba, y en su estudio el tercio de
   arriba del cuadro es techo blanco y a la izquierda hay un panel gris.
   **Arreglo:** `detectarCroma` (`estacion/src/croma.ts`, con la lógica en
   `compartido/croma.ts`) mira cinco cuadros enteros, busca la tela verde o azul
   **donde esté** (al menos el 12 % del cuadro), toma su color (la mediana) y
   devuelve la **zona** que cubre. Todo lo de afuera de esa zona se recorta
   antes de borrar el color.
2. **El borrado se comía la chaqueta negra y la camiseta** (quedaban la cara y
   las manos flotando). El `chromakey` de ffmpeg compara el tono sin mirar la
   luz, y con una tela de verde apagado (`0x53b367`, luz de ventana) lo negro,
   lo gris y lo blanco le quedan «cerca». **Arreglo:** ya no se usa. El alfa se
   saca de **cuánto verde le sobra a cada punto** sobre sus otros dos colores
   (`umbralesDeCroma` y `filtroDeCroma`: planos sueltos, `blend` y `lut`, todo
   filtros rápidos). Lo negro, lo gris, lo blanco y la piel no tienen exceso de
   verde. De paso el verde de cada punto se baja al mayor de los otros dos, y
   no queda borde verde. La grabación entera se procesa en 14 segundos.
3. **El video abría con Richard de lado, callado**, acercándose a la cámara
   (tres segundos antes de hablar y cuatro después). **Arreglo:**
   `corteDeGrabacion` usa solo el trozo entre la primera y la última palabra
   (con un respiro), y la voz y la imagen se cortan igual.

- **Lo que vigila (`pruebas/presentador.test.ts`):** un cuadro como el suyo
  (techo arriba, panel a un lado, él en el centro) da croma, con la zona
  correcta; una sala, un fondo negro o una planta no; la tela y sus arrugas se
  borran enteras y nada de la persona llega al umbral; el corte y las palabras
  corridas.
- **Comprobado en rojo** el 5 oct 2026: siete fallos metidos a propósito.
- **Comprobado con su grabación:** cuadros revisados del video transparente y
  del video armado (trabajo 34): sale entero, con gorra, lentes y chaqueta.
- **Qué NO tocar:** no volver a `chromakey`; no volver a mirar solo las
  esquinas; `extractplanes` entrega los planos SIEMPRE en el orden rojo, verde,
  azul (no en el que se le piden: al revés, la piel se vuelve transparente).
- **Lo que sigue faltando:** si una parte de él sale de la tela (un codo sobre
  el panel, la gorra por encima del borde), esa parte se corta recta.

## C-FORMATO-MIXTO-1 — «Neón con personajes», y el formato ya no vive en un CHECK de la base (5 oct 2026)

- **Qué se agregó:** el cuarto formato, `mixto`: diagramas de neón y las
  personas que se nombran, dibujadas sobre el mismo neón. Guía:
  [ESTILOS.md](ESTILOS.md).
- **Lo que se encontró al agregarlo:** la tabla `grabaciones` había nacido ese
  mismo día con `CHECK (formato IN (…tres…))`. SQLite **no deja cambiar un
  CHECK**: con el cuarto formato, guardar la grabación habría fallado en vivo
  aunque todas las pruebas pasaran (las pruebas arman la tabla desde
  `schema.sql`, que sí se puede editar).
- **Qué se hizo:** el formato se valida **en el código** (`esquemaGrabacionNueva`
  con `ESTILOS_VIDEO`), no en la tabla. En vivo se armó la tabla nueva sin ese
  CHECK, se copiaron las filas y se cambiaron los nombres
  (`scripts/migrar-grabaciones-formato.ts`, que se puede correr dos veces). **No
  se borró nada:** la tabla vieja quedó como `grabaciones_v1`, con su índice
  `grabaciones_estado`; el índice nuevo se llama `grabaciones_por_estado`.
- **Regla que queda:** una lista que va a crecer (formatos, estilos) no se pone
  en un CHECK de la base. Los CHECK se dejan para lo que no cambia (estados).
- **La plantilla de video repite la lista** de formatos (`props.ts`), porque no
  puede importar código de fuera de su carpeta (el empaquetador de Remotion no
  conoce el alias `@compartido`; intentarlo tumba el armado). Una prueba
  compara las dos listas.
- **Lo que vigila (`pruebas/formato-mixto.test.ts`):** el formato existe con su
  nombre; se puede elegir y la base lo guarda; un formato inventado no pasa del
  formulario; el plan le explica a la IA cuándo va persona y cuándo diagrama, y
  que una empresa no es una persona; en una escena de personas solo queda lo
  dibujado; la plantilla conoce los mismos formatos que el panel.
- **Comprobado en rojo** el 5 oct 2026: diez fallos metidos a propósito, uno por
  uno; todos tumbaron su prueba.
- **Comprobado en vivo** el 5 oct 2026, versión `3495bcc`: la grabación sintética
  (el muñeco sobre verde diciendo el texto de Sam Altman) subida con el formato
  nuevo. La IA armó cuatro escenas: dos con la persona dibujada y sus datos, y
  dos diagramas. Video largo, un Short, textos y miniaturas en cuatro minutos
  (guion 11, trabajo 32). Se revisaron los cuadros.
- **Lo que salió mal en esa prueba y ya está arreglado:** debajo de un titular
  apareció escrito «[opinión del editor]». Es el relleno que las reglas
  generales del guion le piden a la IA para la escena de opinión; en una
  grabación no hay nada que rellenar. Ahora a la IA se le dice que no lo
  escriba, y `planSinInventos` quita cualquier texto entre corchetes de lo que
  se ve en pantalla (y si un diagrama se queda sin título, toma el de su sección).
- **De paso** (también le sirve al Cómic): la tilde de un titular en mayúsculas
  («PASÓ», «FRENÓ») se cortaba, porque el degradado solo pinta dentro de la caja
  de la línea; y con presentador el titular tocaba la marca del canal.
- **Qué NO tocar:** no volver a poner un CHECK sobre `formato`; no importar
  `@compartido` con código (solo tipos) desde `estacion/src/remotion/`; no dejar
  pasar fotos reales en un video de neón.

## C-IA-SALDO-1 — Si la cuenta de la IA se queda sin saldo, el canario lo dice (5 oct 2026)

- **Qué se rompió y cómo se veía:** al pedir un guion, la API respondió «Your
  credit balance is too low to access the Anthropic API». El panel mostraba ese
  texto en inglés y el canario seguía diciendo `anthropic: ok`, porque solo
  miraba que la clave existiera.
- **Causa real:** la cuenta de Anthropic del panel es prepago (así lo manda la
  regla de cuentas) y se le acabó el saldo. Eso lo arregla solo Richard,
  recargando en la consola de Anthropic → Plans & Billing.
- **Qué se hizo:** `src/lib/ia-estado.ts`. Cada pedido a la IA (guion y textos de
  YouTube) pasa por `conEstadoIA`: si falla por la cuenta (sin saldo, clave
  inválida, sin permiso), queda anotado en `ajustes.ia_ultimo_error` y el panel
  recibe una frase clara en español. El canario (`/datos/salud`) pone
  `anthropic: error` con esa frase. El primer pedido que salga bien lo borra.
  Un error pasajero (red, saturación) no anota nada.
- **Cómo se comprueba:** `pruebas/generador.test.ts` (bloque C-IA-SALDO-1). En
  vivo: `/datos/salud` → `anthropic`.
- **Comprobado en rojo:** sin reconocer el mensaje de saldo, fallan las pruebas.
- **Qué NO tocar:** el canario no hace pedidos de prueba a la IA (gastaría en
  cada mirada); se entera por los pedidos de verdad.

## C-GUION-2 — El guion se le pide a la IA por streaming (5 oct 2026)

- **Qué se rompió y cómo se veía:** desde el panel no se podía escribir ningún
  guion. La respuesta era: «Streaming is required for operations that may take
  longer than 10 minutes». Nadie lo había visto porque desde el 2 de octubre no
  se había pedido un guion nuevo (el de Prince Royce se rehízo como versión).
- **Causa real:** el 2 de octubre se subió el tope de salida a 30.000 tokens para
  que cupieran los planos (C-RITMO-1). Con un tope tan alto, la librería de
  Anthropic se niega a hacer el pedido de una sola vez: calcula que podría pasar
  de diez minutos y exige streaming (el corte está en unos 21.333 tokens).
- **Qué se hizo:** `generarGuion` (`src/lib/generador.ts`) pide el guion con
  `cliente.messages.stream(…).finalMessage()`. El guion llega igual, validado en
  `parsed_output`. El tope quedó como `MAX_TOKENS_GUION`.
- **Cómo se comprueba:** `pruebas/generador.test.ts` simula la respuesta por
  eventos y exige que el pedido salga con `stream: true`. En vivo: crear un
  guion (panel, o `scripts/crear-guion-remoto.ts`) y que quede en borrador.
- **Comprobado en rojo:** al volver a `messages.parse`, la prueba falla con el
  mismo mensaje que salió en producción.
- **Qué NO tocar:** no volver a `messages.parse` / `messages.create` sin
  streaming mientras el tope pase de 21.000. Si algún otro pedido a la IA sube
  su tope por encima de eso, también va por streaming.
- **Lección:** un cambio en lo que se le pide a la IA se prueba pidiendo un
  guion de verdad antes de darlo por bueno; compilar no alcanza.

## C-AUDITORIA-1 — La compuerta audita lo que se publica; lo de desarrollo se mira aparte (5 oct 2026)

- **Qué pasó:** el 5 oct 2026 la auditoría de dependencias se puso en rojo sola,
  sin ningún cambio nuestro: salió un aviso nuevo (GHSA-vfj7-8cjw-p6xm, agotar la
  pila con patrones muy anidados) contra **todas** las versiones de `braces`.
  No existe versión corregida (la última, 3.0.3, es de 2024). El «arreglo» que
  ofrece npm es bajar `eslint-config-next` a la 14, que rompe el proyecto.
- **A quién le toca de verdad:** `braces` entra solo por la herramienta que revisa
  el código (`eslint-config-next` → `fast-glob` → `micromatch`). No va en el
  panel publicado ni en la Estación: `npm ls braces --omit=dev` sale vacío y
  `npm audit --omit=dev` da cero.
- **Qué se hizo:** `npm run audit` (el que frena un push, en la Mac y en GitHub)
  audita **lo que se publica** (`--omit=dev`). La auditoría completa sigue a
  mano: `npm run audit:todo`. No se apagó la compuerta: se le quitó lo que no
  llega a producción y no tiene arreglo.
- **Cómo se comprueba:** `npm run audit` → 0 vulnerabilidades. `npm run audit:todo`
  → lista lo de desarrollo; cuando salga `braces` corregido, tiene que dar cero.
- **Pendiente:** cuando exista la versión corregida, actualizar y dejar anotado
  aquí la fecha. Está en PENDIENTES.
- **Qué NO tocar:** no bajar `--audit-level`, no quitar el paso, y no meter en
  `dependencies` (lo que sí se publica) nada que traiga un aviso alto.

## C-ESTILOS-1 — Los estilos nuevos no rompen la escritura de guiones ni dibujan a quien no es (5 oct 2026)

- **Qué se agregó:** dos diseños de video, el ilustrado y el de neón. Guía
  completa: [ESTILOS.md](ESTILOS.md).
- **El riesgo que se vio antes de publicar:** el formato que se le exige a la IA
  para escribir un guion admite **24 campos opcionales en total** (límite de la
  API de Anthropic, leído en su documentación el 5 oct 2026; con más, responde
  error 400 y no se escribe ningún guion). El guion llevaba 15; con
  `visual.diagrama` lleva 16. Por eso **dentro del diagrama todo es
  obligatorio** y lo que no aplica va vacío.
- **Lo que se vio en la primera prueba del ilustrado:** la búsqueda «Sam Altman
  conference stage» trajo una foto de tres personas en un escenario. El dibujo
  se quedó con una de ellas y el rótulo decía «Sam Altman». Ahora, antes de
  dibujar, se cuenta cuántas caras hay en la foto: solo se dibuja si hay una.
- **Lo que vigila (`pruebas/estilos.test.ts`):**
  1. El guion no pasa de 24 opcionales y el diagrama no agrega ninguno.
  2. Cada ícono que el guion puede pedir tiene su dibujo, y la IA recibe la lista entera.
  3. Solo se dibuja la foto de una sola cara; un dibujo sin fondo quitado no se usa.
  4. La figura «sigue» en los datos que vienen después y vuelve a entrar tras un clip.
  5. Ningún objeto de un diagrama se pierde ni se enciende fuera de su escena, y la
     escena no abre apagada.
  6. Los objetos caben entre el titular y los subtítulos, sin encimarse y sin caer
     bajo los botones de un Short.
  7. Un video de antes (sin estilo) se sigue pudiendo volver a armar.
- **Comprobado en rojo** el 5 oct 2026: seis fallos metidos a propósito, seis
  pruebas en rojo.
- **Comprobado de punta a punta** el mismo día, con la voz de prueba de la Mac:
  `estacion/ejemplos/guion-neon.json` y `guion-ilustrado.json` produjeron su
  video largo y su Short.
- **Qué NO tocar:** agregar un `.optional()` al guion sin contar; quitar la
  cuenta de caras; subir `MAXIMO_DE_DIBUJOS` o cambiar de modelo de imagen sin
  la aprobación de Richard con el costo por escrito.

## C-PORTADA-1 — Cada pieza tiene su miniatura, y es de quien dice ser (2 oct 2026)

- **Qué faltaba / cómo se veía:** el video largo salía con una miniatura de
  título sobre foto y los Shorts sin ninguna. Richard: «sin las miniaturas va a
  ser difícil que esos videos tengan vida».
- **Qué se hizo:** al terminar cada video, la Estación arma una portada de
  impacto por pieza (horizontal para el largo, vertical para cada Short) con el
  texto que escribe el panel, y cada una sale en el panel al lado de su título.
  Guía completa: [PORTADA.md](PORTADA.md).
- **Lo que este candado vigila (`pruebas/portada.test.ts`, `pruebas/calendario.test.ts`):**
  1. **La miniatura de un Short nunca pasa a ser la del video largo**
     (`miniaturasPorPieza`): antes valía «la más nueva del guion», y al subir
     las verticales el largo habría mostrado la del último Short.
  2. **La portada de impacto le gana a la automática** aunque una entrega
     repetida suba otra automática después.
  3. **En la miniatura solo sale la persona pedida o el protagonista**, nunca
     otra (`candidatasDePortada`), y solo de fotos con rótulo.
  4. **Solo sirve el recorte de una sola cara** (`recorteSirve`): ni fotos de
     grupo, ni lugares, ni una carátula entera.
  5. **La persona no queda flotando** (`encuadre`) y un guion viejo sin texto
     de portada sigue siendo válido.
- **Comprobado en rojo** el 2 oct 2026: con todas las miniaturas contadas como
  del largo fallan dos pruebas; aceptando fotos de grupo falla una.
- **Qué NO tocar:** que la falta del texto de una miniatura tumbe los textos de
  YouTube (en `esquemaPublicacionDeLaIA` la portada tiene valor por defecto), ni
  que un fallo al armar las miniaturas tumbe la entrega del video (va dentro
  del mismo `catch` que los textos, después de marcar el trabajo como hecho).

## C-RITMO-1 — Ninguna imagen se queda quieta más de cinco segundos (2 oct 2026)

- **Qué se rompía / cómo se veía:** la gente comentaba que los videos eran
  aburridos. Medido en el de Prince Royce: 15 imágenes en 410 segundos, cada
  una entre 24 y 39 s. La voz nombraba a Shakira o a Romeo Santos y en pantalla
  seguía la misma foto o el mismo titular.
- **Causa real:** una escena = una imagen. El guion no tenía forma de decir
  «aquí, cuando digo Shakira, cambia».
- **Qué se hizo:** (1) `visual.planos` en el guion (`compartido/guion.ts`): cada
  plano trae la frase literal donde entra y qué mostrar (foto, clip o cifra en
  grande); (2) `compartido/planos.ts` calcula el momento con los tiempos de las
  palabras de la voz (`tiemposDePlanos`) y dónde hay que rellenar
  (`rellenarHuecos`: nada quieto más de 5 s); (3) `estacion/src/planos.ts` trae
  cada imagen y rellena con fotos del propio video o clips nuevos; (4) la
  plantilla (`estacion/src/remotion/Planos.tsx`) dibuja cada plano con una
  entrada distinta, movimiento continuo, el nombre de la persona y un sonido en
  cada corte (`sfx.corte`); (5) subtítulos al estilo CapCut: pocas palabras,
  borde grueso y una sola palabra encendida; (6) las instrucciones del
  guionista (`src/lib/prompt.ts`) piden los planos en todo guion nuevo.
  Guía completa: [RITMO.md](RITMO.md).
- **Cómo se comprueba:** `pruebas/planos.test.ts` (en rojo: sin el relleno, una
  escena de 30 s se queda con una imagen y la prueba falla). En cada
  producción, el paso «ritmo visual: N imágenes en M s»; si dice «OJO: tramos
  quietos», hay una escena que se quedó sin imágenes. A la vista:
  `npx tsx src/cuadros.ts <trabajo> <segundos>`.
- **Qué NO tocar:** la `frase` de un plano tiene que ser literal (se compara
  sin acentos ni signos, pero palabra por palabra); `QUIETO_MAXIMO_MS` es el
  candado: subirlo es volver a aburrir. La palabra encendida del subtítulo
  salta y VUELVE a su tamaño: si se queda grande se come el espacio de la de al
  lado (pasó en la primera prueba).

## C-VOZ-6 — Las pausas de la voz duran todas lo mismo (2 oct 2026)

- **Qué se rompía:** «el ritmo de la voz como que no se mantiene». Medido: 50
  pausas de más de 0,3 s en un video, unas de 0,3 y otras de más de 1,5 s; y el
  ajuste de ritmo (C-VOZ-4) medía cada escena CON sus pausas, así que una
  escena con silencios largos se aceleraba de más.
- **Qué se hizo:** en `estacion/src/voz.ts`, cada escena se nivela, después se
  le recortan los silencios largos (`apretarPausas`: ninguno pasa de 0,34 s; el
  del arranque y el del final casi desaparecen) y los tiempos de las letras se
  corren igual que el audio; y recién entonces se mide el ritmo. Las reglas
  están en `compartido/pausas.ts`. El ritmo objetivo subió de 11 a 11,6 letras
  por segundo, porque ahora se mide sin pausas. Además la voz se pide un poco
  más rápida desde el origen (`voice_settings.speed` de ElevenLabs,
  `ELEVENLABS_VELOCIDAD`, por defecto 1.1; admite de 0.7 a 1.2, comprobado el
  2 oct 2026 con `npx tsx src/prueba-velocidad.ts`): antes 6 de 14 escenas
  quedaban aceleradas al tope de ×1.25 con ffmpeg y aun así más lentas que las
  demás; ahora los ajustes van de ×0.85 a ×1.14 y ninguna llega al tope.
- **Cómo se comprueba:** `pruebas/pausas.test.ts` (en rojo: sin recortar las
  pausas largas, falla). En la Estación, las líneas «pausas escena N: -X s».
- **Qué NO tocar:** el orden nivelar → pausas → ritmo (los silencios se miden
  contra un nivel fijo). Si los subtítulos se desfasan, el problema está en
  `tiempoTrasCortes`, no en la plantilla.

## C-SONIDOS-1 — La música y los efectos de Richard viven en el panel (2 oct 2026)

- **Qué faltaba:** Richard pidió varias veces un fondo con bombo y, para la
  historia de Prince Royce, una bachata; el catálogo solo tenía lo que hubiera
  en una carpeta de la Mac, y sin pista del género salía «algo parecido».
- **Qué se hizo:** página **Sonidos** del panel (`src/app/sonidos`): sube
  música (con su género) y efectos (con su uso), los escucha y los quita desde
  los tres puntos. Se guardan en el almacén (`sonidos/…`) y en la tabla
  `sonidos`. La Estación los baja antes de cada producción
  (`estacion/src/sonidos.ts`) a `recursos/musica-panel` y `recursos/sfx-panel`.
  En `elegirPista`, la pista del género pedido gana a cualquier otra, y entre
  las del género gana la de Richard. El canario dice `sonidos: ok`.
- **Cómo se comprueba:** `pruebas/sonidos.test.ts` (en rojo: si «Quitar» borra
  de verdad, falla). En vivo: subir un MP3 en Sonidos y producir un video de
  ese género; el paso «música: …» lo nombra.
- **Lo que falló la primera vez que Richard subió su bachata (2 oct 2026):** la
  Estación eligió igual la bachata provisional del motor. Dos causas: (1) para
  saber si una pista era «del motor» se miraba si su ruta EMPEZABA por
  `recursos/musica`, y `recursos/musica-panel` empieza igual: ninguna pista
  contaba como de Richard (`estaEnCarpeta` lo corrige); (2) la pista del motor
  tiene más palabras en el nombre y sumaba más puntos: ahora la de Richard del
  género pedido gana siempre. Las dos cosas están en `pruebas/sonidos.test.ts`
  con el catálogo real.
- **Volumen por video (2 oct 2026):** Richard pidió la bachata «un poquitico»
  más alta en el video de Prince Royce. Cada video puede llevar `musica.nivel`
  (de 0.5 a 1.25; 1 = lo normal) y `volumenBajoLaVoz` nunca deja pasar de 0.15
  bajo la voz, pida lo que se pida (sigue valiendo C-MUSICA-1). Se pone con
  `cambiar-musica.ts … --nivel 1.25`.
- **La IA no oye:** la primera pista que subió Richard traía el clic de un
  metrónomo y no se notó al revisar. Lo único que se puede medir es contar los
  golpes agudos (la pista con clic tenía 114 en 40 s; la limpia, 81). Si una
  pista nueva suena rara, quien lo sabe es Richard: se le pide que la escuche
  en Sonidos antes de usarla.
- **Cambiar la música de un video ya armado:**
  `npx tsx src/cambiar-musica.ts <trabajo> "<estilo>"` y después `rearmar.ts`.
- **Qué NO tocar:** «Quitar» apaga `activo`, nunca borra. No agregar la opción
  «canción comercial» al origen: YouTube la detecta y el video no monetiza.

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

## C-IMAGEN-5 — En un video de tecnología no se busca la foto de «GPT» (30 sep 2026)

- **Qué se iba a romper:** cuando la foto que pide el guion no aparece, la
  Estación buscaba de reserva el nombre que abre el título. En una biografía
  eso es la persona («Celia Cruz: …»). En el primer video de Full Código el
  título es «GPT-6.1 Astra: …» y la reserva habría sido «GPT», exigiendo una
  cara: salía la foto de cualquiera.
- **Qué se hizo:** `busquedasDeFoto` (`compartido/fotosweb.ts`) solo agrega esa
  reserva en biografías de persona. En los demás videos, sin foto la escena cae
  en un clip con su rótulo.
- **Cómo se comprueba:** `pruebas/fotosweb.test.ts`, bloque C-IMAGEN-5 (en rojo:
  con la reserva siempre puesta, falla).

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
