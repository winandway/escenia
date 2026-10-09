# Avatar parlante de Richard — plan

> **Estado: EN PAUSA desde el 29 sep 2026.** Richard pidió guardarlo y hacer
> otras cosas antes. No se genera ni se gasta nada hasta que él diga que se
> retoma. Al retomarlo, volver a leer los precios en fal.ai.

> Pedido por Richard el 28 y 29 sep 2026. Primer avatar: él mismo, con una foto
> suya y su voz clonada (ya lista en ElevenLabs). Primera prueba: un clip de 20
> a 30 segundos. Precios y límites leídos en las páginas oficiales de fal.ai el
> **29 sep 2026**; antes de integrar se vuelven a leer.

## La decisión, en corto

- **Dónde:** fal.ai, la misma cuenta prepago que ya usamos para las imágenes
  (`FAL_KEY`). No hay cuenta nueva ni clave nueva que sacar.
- **Con qué modelo:** **Kling AI Avatar v2 Standard**. Recibe una foto y un
  audio y devuelve el video de la persona hablando, con los labios
  sincronizados. Es el más barato de los que aceptan una foto propia.
- **Dónde sale el avatar en el video:** solo en la escena **«Mi opinión»** (y
  más adelante en el gancho). Nunca en el video entero: sería caro y aburrido.
- **Tope:** 40 segundos de avatar por video. Bloqueado en código.

## Cómo funciona

```
  FOTO de Richard ──┐
  (avatar/richard.jpg)│
                     ├──►  fal.ai · Kling AI Avatar v2  ──►  clip MP4 del avatar
  VOZ de la escena ──┘      (2 a 5 minutos de espera)        (se guarda en caché)
  (ElevenLabs, ya                                                   │
   nivelada y a ritmo)                                               ▼
                                          Video 16:9: presentador al lado del titular
                                          Shorts 9:16: recorte en la cara, a pantalla llena
```

El clip se genera con **el audio final de la escena** (después de nivelar el
volumen y ajustar el ritmo). Así los labios calzan con lo que se oye.

## Precios verificados (fal.ai, 29 sep 2026)

| Modelo                          | Precio por segundo | Clip de 20 s | Clip de 30 s | Fuente                                                         |
| ------------------------------- | ------------------ | ------------ | ------------ | -------------------------------------------------------------- |
| **Kling AI Avatar v2 Standard** | **$0.0562**        | **$1.12**    | **$1.69**    | https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/standard |
| Creatify Aurora (480p)          | $0.07              | $1.40        | $2.10        | https://fal.ai/models/fal-ai/creatify/aurora                   |
| VEED Fabric 1.0 (480p)          | $0.08              | $1.60        | $2.40        | https://fal.ai/models/veed/fabric-1.0                          |
| Kling AI Avatar v2 Pro          | $0.115             | $2.30        | $3.45        | https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/pro      |
| OmniHuman v1.5 (ByteDance)      | $0.16              | $3.20        | $4.80        | https://fal.ai/models/fal-ai/bytedance/omnihuman/v1.5          |
| InfiniTalk                      | $0.20              | $4.00        | $6.00        | https://fal.ai/models/fal-ai/infinitalk                        |

Límites del modelo elegido (de su página): audio de 2 a 60 segundos, máximo
5 MB, en mp3, wav o m4a; foto jpg o png de al menos 300 px por lado.

**Costo en marcha:** un video al día con 30 segundos de avatar son $1.69 al
día, unos $51 al mes. Con el tope de 40 segundos, un video nunca pasa de $2.25
de avatar.

## La foto (lo único que pone Richard)

- De frente, mirando a la cámara, **de los hombros para arriba**.
- Boca cerrada o sonrisa leve. Sin lentes de sol, sin gorra, sin manos en la cara.
- Buena luz en la cara, fondo simple (pared, oficina ordenada).
- Tomada con el celular en horizontal o vertical, da igual. Mínimo 1080 px.
- Se guarda como `richard.jpg` en `/Users/windocellc/Motor-Escenia/avatar/`.
- La foto **no se sube al repositorio** (la carpeta está en `.gitignore`). Sí
  viaja a fal.ai para generar el clip, igual que las fotos de referencia.

## Fases

### Fase 1 — Prueba suelta (un clip de 20 segundos)

1. **Qué es:** un clip de Richard diciendo un texto corto, fuera de cualquier
   video, para juzgar la calidad antes de tocar el motor.
2. **Quién:** Richard pone la foto y da el visto bueno al gasto ($1.12). La IA
   hace todo lo demás.
3. **Qué pasa:** la IA genera el audio con la voz clonada, llama al modelo y
   deja el clip en `estacion/out/avatar-prueba/`.
4. **Cómo se comprueba:** Richard lo mira con esta lista: ¿es mi cara?, ¿los
   labios calzan?, ¿dientes y ojos se ven normales?, ¿parpadea natural?, ¿el
   fondo se queda quieto?
5. **Si no convence:** segunda prueba con OmniHuman v1.5 ($3.20 los 20
   segundos). Necesita su autorización aparte, porque pasa el tope por segundo.

### Fase 2 — Integración en el motor

1. **Candado de gasto** en `compartido/modelos.ts`: lista de avatares
   permitidos con su precio, tope por segundo ($0.06) y tope de 40 segundos por
   video. Un modelo caro configurado por error no corre.
2. **Visual nuevo «presentador»** en el guion y en la plantilla: el clip del
   avatar sin su audio, montado sobre la voz maestra.
3. **Caché** por foto y audio: volver a armar un video no paga dos veces.
4. **Respaldo visible:** si el avatar falla o se acaba el saldo, la escena sale
   como hoy (texto «Mi opinión») y queda escrito en el registro y en los
   créditos. Nunca falla en silencio.
5. **Pruebas en rojo comprobado** del candado, del tope y del respaldo.
6. **Cómo se comprueba:** `npm run verify` en verde y un video de prueba con la
   escena «Mi opinión» hablada por el avatar.

### Fase 3 — Primer video real con avatar

1. El siguiente guion sale con Richard dando su opinión en cámara.
2. En los Shorts, el mismo clip recortado en la cara, a pantalla llena.
3. **Cómo se comprueba:** cuadros del largo y de los Shorts, labios en
   sincronía, costo del trabajo dentro del tope.

### Fase 4 — Después

- Varias fotos de Richard (otra ropa, otro fondo) para que no sea siempre la
  misma toma.
- Avatar también en el gancho de los Shorts de producto.
- Otros presentadores (una presentadora con la voz femenina).

## Riesgos y cómo se cubren

| Riesgo                                  | Cómo se cubre                                                             |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Que se vea artificial                   | Prueba suelta antes de integrar; Richard decide con la lista de la Fase 1 |
| Que el gasto se dispare                 | Tope por segundo y por video en código, más el tope diario del panel      |
| Audio de más de 60 segundos             | La escena «Mi opinión» se parte en dos clips                              |
| fal.ai tarda o falla                    | Respaldo visible: la escena sale como hoy                                 |
| Cambio de precio del modelo             | La tabla de precios vive en el candado y se revisa contra la página       |
| Aviso de contenido sintético en YouTube | Se verifica la regla oficial al integrar y se marca al subir              |

## Qué NO se hace

- No se usa HeyGen ni D-ID: piden cuenta y suscripción aparte. Con fal.ai ya
  tenemos la cuenta, el prepago y el candado.
- No se genera el video entero con avatar.
- No se enciende ningún modelo fuera de la lista sin autorización escrita de
  Richard con el costo por segundo.

## 8 oct 2026 — El personaje «Caribe» (muñeco) y el reel de referencia

Richard mandó la hoja de personaje de un muñeco tipo Ken caribeño («Caribe»: rubio de rizos, ojos
azules, short rojo, camiseta de palmeras; energético, carismático, optimista; 30 cm) y un reel de
Instagram de referencia: una muñeca tipo Barbie, fotografiada de verdad frente a un centro
comercial, que habla a cámara 30 segundos con labios sincronizados y GESTOS de manos (se toca el
pecho, saluda, se peina). Quiere probar un sistema de Shorts de 15 a 30 segundos con ese muñeco,
un guion corto y una voz paisa colombiana, para ver si así el algoritmo responde.

Lo que se ve en el reel (mirado cuadro por cuadro, sin oír): una sola foto del muñeco animada por
el audio; la cara, el pelo y el fondo son de la foto; las manos se mueven con naturalidad. Eso es
lo que hacen los modelos de «avatar guiado por audio». El que ya habíamos elegido, Kling AI
Avatar v2 Standard, anima la cara y la cabeza (su página, releída el 8 oct 2026: «animates facial
features and subtle head movements»; 5,62 centavos por segundo); los gestos de manos como los del
reel los dan los modelos de cuerpo entero, tipo OmniHuman v1.5 (16 centavos por segundo en la
tabla del 29 sep 2026; releer antes de encender).

Propuesta de prueba (espera el «sí» de Richard, porque el avatar estaba en pausa y gasta):
un mismo guion de 15 segundos con la voz paisa, dos clips del muñeco Caribe: uno con Kling
Standard (unos 84 centavos) y otro con OmniHuman v1.5 (unos 2,40 dólares), para comparar gestos
y naturalidad. Con el que convenza, un lote de 5 Shorts (uno al día) y medir a las 48 horas.
La imagen del muñeco recortada de la hoja quedó en `avatar/caribe-hoja.png` (fuera de git), y el
reel en `avatar/referencia-muneca-reel.mp4`. Falta: la voz paisa (cuál, en ElevenLabs) y, si
existe, la imagen original del muñeco en mejor resolución.

Sobre «cuántos videos hay que subir para que el algoritmo nos preste atención»: no hay una cifra
publicada por YouTube que lo diga, y no se afirma ninguna de memoria. Lo que sí está escrito en
su ayuda (ver docs/FORMATOS.md) es que recomienda por lo que la gente mira y se queda viendo. La
prueba sensata es un personaje fijo, un Short diario a la misma hora durante 2 a 4 semanas, y
comparar retención y vistas a las 48 horas de cada uno.

## 8 oct 2026 — Chase Montes, aventurero («Chase, el Mono Caribe»): el MVP

El muñeco se llama **Chase Montes — aventurero**, y su apodo es **Chase, el Mono Caribe** (lo
fijó Richard el 8 oct 2026). Es el personaje fijo de una serie de Shorts hablados de 15 a 30
segundos con voz paisa, para Caprichoso TV. Todo lo suyo vive en `avatar/chase-montes/`
(fuera de git: `avatar/` está en `.gitignore`):

| Carpeta o archivo                      | Qué es                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `fotos/cuerpo-entero-fondo-blanco.png` | La foto buena que mandó Richard (1024×1536, cuerpo entero, fondo blanco) |
| `fotos/hoja-con-coco.png`              | Recorte de la hoja de personaje (570×800), el muñeco con un coco         |
| `fotos/hoja-de-personaje.webp`         | La hoja de personaje completa                                            |
| `referencia-reel-muneca.mp4`           | El reel de Instagram de referencia (la muñeca que habla con gestos)      |
| `guion-prueba.txt`                     | El guion paisa de 15 segundos de la prueba                               |
| `voces/`                               | Los audios de la voz (hoy: la prueba con la voz de Richard, 13 s)        |
| `pruebas/`                             | Los clips generados y `gastos.txt` con fecha, modelo, segundos y costo   |

### Cómo se genera un clip (la pieza de código)

- **El candado** está en `compartido/modelos.ts`: `AVATARES_PERMITIDOS` solo admite dos modelos,
  **Kling AI Avatar v2 Standard** (5,62 centavos por segundo) y **OmniHuman v1.5** (16 centavos
  por segundo), los dos autorizados por Richard el 8 oct 2026 con el precio delante. Ningún otro
  corre, ni como respaldo. `TOPE_AVATAR_SEG = 40`: un audio más largo revienta antes de pedir
  nada. `costoAvatarUsd(modelo, segundos)` calcula el gasto a partir de los segundos del audio
  (el video dura lo que dura el audio). Prueba: `pruebas/modelos.test.ts` (C-AVATAR-1).
- **El generador** es `estacion/src/avatar.ts` (`generarAvatar`): manda la foto y el audio a la
  cola de fal.ai (`queue.fal.run/<modelo>`) como datos en base64, espera hasta 15 minutos
  avisando el puesto en la cola, y baja el mp4. Solo sigue direcciones de `queue.fal.run`.
- **La prueba suelta** es `estacion/src/avatar-prueba.ts`: foto, audio, modelo (`kling` u
  `omnihuman`) y salida; imprime el costo antes de encolar y lo anota en `pruebas/gastos.txt`.
  Desde `estacion/`:
  `npx tsx src/avatar-prueba.ts --imagen ../avatar/chase-montes/fotos/cuerpo-entero-fondo-blanco.png --audio ../avatar/chase-montes/voces/prueba-voz-richard.mp3 --modelo omnihuman --salida ../avatar/chase-montes/pruebas/omnihuman-1.mp4`
- **La voz** se sintetiza como siempre con ElevenLabs (`estacion/src/voz.ts`, modelo
  multilingual v2). La clave de `estacion/.env` no puede leer la biblioteca de voces (401
  «missing_permissions: voices_read»), pero **sí puede diseñar voces nuevas** con Voice Design
  (`POST /v1/text-to-voice/design`, comprobado el 8 oct 2026) y **crearlas** a partir de una
  vista previa (`POST /v1/text-to-voice`). Así se hicieron las voces paisa: tres descripciones
  (joven, relajado, animador), tres vistas previas cada una, las nueve guardadas en
  `voces/diseno-<nombre>-<n>.mp3` con sus ids en `voces/disenos.json`. La primera («paisa joven 1»)
  quedó creada en la cuenta como «Chase Montes - paisa joven 1 (prueba)» y con ella se sintetizó
  el guion (`voces/chase-paisa-joven-1.mp3`, 12,9 s). Richard oye las nueve y elige; la que elija
  se crea con el mismo código y se guarda su id en `estacion/.env` como `ELEVENLABS_VOICE_ID_CHASE`.
- **El muñeco va sobre un fondo real, de la cintura para arriba** (`estacion/src/avatar-fondo.ts`):
  la foto de Richard es un PNG recortado con transparencia, y fal.ai la aplana a NEGRO: los dos
  primeros clips salieron con el muñeco sobre negro y con ruido alrededor. La herramienta pone el
  recorte sobre una foto de fondo (una que mande Richard, o una playa generada con Seedream por
  3 centavos), lo deja a 1080×1920 y recorta de la cintura para arriba, como en el reel. Ojo: si el
  fondo generado se pide «tomado con un teléfono», la IA dibuja una mano con el teléfono en la
  esquina; en el recorte de cintura no se ve.
- **Foto y audio se suben primero al almacén de fal** (`rest.alpha.fal.ai/storage/upload/initiate`
  y un PUT): OmniHuman rechaza el audio en base64 («Failed to download the file», 8 oct 2026) y
  el pedido falló sin generar nada. Con la subida, el mismo pedido entra.

### El guion de la prueba (15 segundos, paisa)

> ¿Qué más pues, parceros? Yo soy Chase Montes, el Mono Caribe. Rubio, pero con sabor. Hoy
> arranco una aventura: playa, coco frío y una historia que no me van a creer. ¿Se le miden?
> Pilas, que ya empezamos.

Con la voz de Richard dura 13,2 segundos y con la paisa 12,9: Kling cuesta unos 72 centavos y
OmniHuman unos 2,06 dólares. El resultado de la prueba se anota más abajo.

### Resultado de la prueba (8 oct 2026)

| Clip                            | Modelo            | Voz           | Qué se ve                                                                                                                                                | Costo |
| ------------------------------- | ----------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `pruebas/kling-1.mp4`           | Kling v2 Standard | la de Richard | El muñeco casi no se mueve: solo la boca y un poco la cabeza. Fondo negro (transparencia).                                                               | 0,74  |
| `pruebas/omnihuman-1.mp4`       | OmniHuman v1.5    | paisa joven 1 | Gestos de verdad: saluda con las dos manos, se toca el pecho, señala a cámara. Fondo negro con ruido.                                                    | 2,06  |
| `pruebas/omnihuman-2-playa.mp4` | OmniHuman v1.5    | paisa joven 1 | Chase en la playa, de la cintura para arriba: saluda con las dos manos, mano al pecho al presentarse, señala a cámara; fondo limpio. **Este es el MVP.** | 2,06  |

Más 3 centavos del fondo de playa. **Decisión:** para la serie de Chase se usa **OmniHuman v1.5**:
es el único de los dos que hace lo que hace el reel de referencia (las manos). Kling queda para la
cara de Richard en «Mi opinión», donde no hacen falta gestos. El primer pedido a OmniHuman con el
audio en base64 falló sin cobrar.

### Lo que dijo Richard al verlo (8 oct 2026) y qué se hizo

- «La voz no es de paisa»: la voz diseñada «paisa joven 1» suena neutra. Las voces diseñadas con
  Voice Design no garantizan el acento; la salida es una voz de la biblioteca de ElevenLabs
  etiquetada como colombiana (la busca Richard en la web de ElevenLabs y la agrega a su cuenta; con
  el nombre se sintetiza) o una clonada de una grabación suya imitando el paisa.
- «Faltó el sonido de las olas»: ahora cada clip de Chase lleva ambiente debajo de la voz.
  `estacion/src/avatar-ambiente.ts` (`mezclarAmbiente`) repite el ambiente hasta cubrir el clip,
  lo pone al 20 % con un fundido de un segundo a cada lado y lo mezcla sin tocar la voz
  (prueba: `pruebas/avatar-ambiente.test.ts`). `avatar-prueba.ts --ambiente olas.mp3` lo hace al
  generar. El ambiente de hoy, `avatar/chase-montes/sonidos/olas-playa.mp3`, es **sintetizado** con
  ffmpeg (ruido con oleaje lento), porque la clave de ElevenLabs no tiene permiso de efectos de
  sonido (401 `sound_generation`); es provisional: una grabación real de olas que Richard suba en
  «Sonidos» lo reemplaza con el mismo comando.

### Cómo trae Richard una voz de la biblioteca de ElevenLabs (tutorial, 8 oct 2026)

La clave de la Estación no puede leer la biblioteca, así que la voz la elige Richard en la web y
me pasa su **ID de voz** (unas veinte letras y números, como el de la voz creada hoy).

1. **Dónde:** en la web de ElevenLabs, con su cuenta, menú **Voices** y dentro la **Library**
   (la biblioteca de voces de la comunidad). Quién lo hace: Richard.
2. **Filtrar:** idioma **Spanish**, acento **Colombian** (o **Latin American** si no sale),
   género **Male**; y en el buscador probar «colombiano», «paisa», «Medellín», «antioqueño».
   Darle play a cada una: la que suene paisa y natural.
3. **Agregarla a la cuenta:** botón **Add to my voices** (o «Add voice») en esa voz. Sin este paso
   la voz no se puede usar desde la API, aunque se tenga el ID.
4. **Copiar el ID:** en **My Voices**, en la tarjeta de esa voz, el menú de los tres puntos →
   **Copy voice ID** (también está dentro de la voz, en sus ajustes, como «Voice ID»).
5. **Pasármelo:** pegar el ID en el chat. Yo lo guardo en `estacion/.env` como
   `ELEVENLABS_VOICE_ID_CHASE` (nunca en el repositorio), sintetizo el guion y rehago el clip.
   Qué se comprueba: el audio nuevo en `voces/` y el clip nuevo en `pruebas/`.

Si no aparece ninguna paisa que convenza, se queda la «paisa joven 1» para empezar (lo dijo
Richard el 8 oct 2026). Para más naturalidad, con la voz elegida se prueba también el modelo
`eleven_v3` (ya permitido en `compartido/modelos.ts`, mismo precio), que es más expresivo.

### Segundo clip: «El jalón de pelo» (8 oct 2026)

Richard eligió dos voces de la biblioteca de ElevenLabs y pasó sus IDs; quedaron en
`estacion/.env` como `ELEVENLABS_VOICE_ID_CHASE` (voz 1) y `ELEVENLABS_VOICE_ID_CHASE_2` (voz 2).
Se sintetizan con **`eleven_v3`**, que entiende etiquetas como `[laughs]` y suena más natural.

Historia que pidió: Chase llega a la playa, un niño se le acerca, él se agacha a hablarle, el niño
le da un jalón en el pelo y le pregunta si es peluca o pelo de verdad; Chase se ríe. Personalidad:
coqueto, enamoradizo, que se quiere mostrar. Guion en `avatar/chase-montes/guion-2-jalon-de-pelo.txt`,
con el cierre que pidió: «Suscríbete a Caprichoso TV y síguenos».

- Audio: `voces/chase-voz1-jalon-v3.mp3` (25,8 s) y `voces/chase-voz2-jalon-v3.mp3` (26,1 s).
- Clip: `pruebas/chase-jalon-de-pelo-voz1-ambiente.mp4`, OmniHuman con la voz 1 y las olas,
  4,13 dólares. Se ve: risa con la boca abierta, brazos abiertos, mano en la cintura varias veces,
  el mar en movimiento. No se ve: tocarse el pelo (el prompt lo pedía). Leve borrón de color en
  las piernas, al borde de abajo.
- **Regla nueva (Richard, 8 oct 2026):** el texto se le muestra ANTES de sintetizar o generar.
  Este clip se generó sin que lo viera (su mensaje llegó a mitad del trabajo).

### Regla: cada video cambia de escenografía y de ropa (Richard, 8 oct 2026)

Richard: «hiciste dos videos iguales, con el mismo fondo, mismo todo, y eso no está bien». Cada
video de Chase lleva **otro lugar, otra pose y otra ropa**: la orilla de la playa como hasta ahora,
sentado debajo de una palmera, recostado a un carro, en un kiosco playero con mesitas de plástico
y ambiente festivo, en un restaurante. **Mejor con un fondo real** detrás (mandó de ejemplo la foto
de una terraza de restaurante en un muelle: `avatar/chase-montes/fondos/ejemplo-restaurante-muelle.webp`).

- **La herramienta:** `estacion/src/avatar-escena.ts` arma la foto nueva con Seedream edit (3 ¢):
  el muñeco con la misma cara y el mismo pelo, la ropa y la escena que se le digan, vertical, de
  la cintura para arriba y mirando a cámara. Con `--fondo foto-real.jpg` usa ese lugar real de fondo.
  Primeras dos: `fotos/escena-restaurante-muelle.png` (camisa de lino azul, jugo verde, con la foto
  de Richard de fondo) y `fotos/escena-kiosco-playero.png` (camisa de flores, sombrero de paja,
  coco en una mesita de plástico). Seis centavos las dos.
- **El candado (C-AVATAR-2):** cada foto usada en un clip queda anotada por su huella en
  `pruebas/escenas-usadas.txt`, y `avatar-prueba.ts` revienta ANTES de gastar si se intenta repetir
  una (`--rehacer` solo para corregir ese mismo video). Las fotos de los cuatro clips de hoy ya están
  anotadas.
- Ojo con la foto de ejemplo: es de un restaurante real con un barco de una empresa; para un video
  publicado, mejor fotos de Richard o lugares sin marcas legibles.

### Cuánto cuesta un clip y qué alternativas hay (precios oficiales de fal.ai, 8 oct 2026)

Precios leídos de la API de precios de fal.ai (`api.fal.ai/v1/models/pricing`), no de memoria.
OmniHuman v1.5 cobra 0,16 dólares por segundo de video: el clip del jalón de pelo (25,8 s) son
4,13 dólares. El cobro real de la cuenta no se puede ver desde aquí: la clave de la Estación no
tiene permiso de facturación (`billing:usage:read`); se ve en el panel de fal.ai, en Usage.

| Modelo en fal.ai                   | Precio          | Un clip de 26 s  | Nota                                                               |
| ---------------------------------- | --------------- | ---------------- | ------------------------------------------------------------------ |
| FlashTalk (SoulX-FlashTalk 14B)    | 0,02 $/s        | 0,52 $           | El más barato; pide «imagen de la cara»: probar si mueve el cuerpo |
| Hunyuan Avatar                     | 0,40 $ por clip | 0,80 $ (2 clips) | Hasta 16 s por clip (401 cuadros a 25 por s)                       |
| Kling AI Avatar v2 Standard        | 0,0562 $/s      | 1,46 $           | Ya probado: casi no mueve el muñeco                                |
| VEED Fabric 1.0                    | 0,08 $/s        | 2,08 $           |                                                                    |
| OmniHuman v1                       | 0,14 $/s        | 3,64 $           |                                                                    |
| **OmniHuman v1.5 (el que usamos)** | **0,16 $/s**    | **4,16 $**       | Gestos de verdad                                                   |
| LongCat Avatar                     | 0,15 $/s a 480p | 3,90 $           | 720p cuesta cuatro veces más                                       |

Propuesta: probar FlashTalk y Hunyuan con el mismo audio y una escena nueva (unos 1,30 dólares) y
comparar contra OmniHuman. Ninguno de los dos está en `AVATARES_PERMITIDOS`: hace falta el «sí»
escrito de Richard con el precio antes de encenderlos.

### Pendiente: voz de un viral adaptada a Chase (punto dos de Richard, sin empezar)

Montar el audio de una conversación viral de 5 a 10 segundos, convertirlo a la voz de Chase, y que
los gestos sigan ese audio. Cómo se haría: ElevenLabs «voz a voz» (speech-to-speech) con la voz
de Chase, y OmniHuman con el audio convertido. Antes de empezar: comprobar que la clave tenga ese
permiso, y tener en cuenta que el audio de un viral ajeno puede tener dueño y que YouTube puede
reclamarlo.

### Lo que falta para la serie (en orden)

1. Hecho el 8 oct 2026: Richard eligió dos voces de la biblioteca (ver arriba).
2. Tres a cinco fotos del muñeco en escenas reales (playa, calle, mercado), verticales, de la
   cintura para arriba y mirando a cámara; dos sin gafas de sol y una de hombros para arriba.
3. Cinco guiones de 15 a 30 segundos acordados con Richard (temas, no inventados).
4. Un Short diario a la misma hora durante dos a cuatro semanas y medir a las 48 horas.
