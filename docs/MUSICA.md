# Música de fondo — cómo funciona y las 50 pistas para crear en Suno

> Pedido por Richard el 26 de septiembre de 2026, viendo la biografía de Celia
> Cruz: «hace falta una salsa de los 60 hecha con IA, con trompetas, bajita
> debajo de la voz; y en alguna parte que el locutor deje de hablar, la música
> suba y pasen imágenes».

## Desde el 2 de octubre de 2026: la música se sube en el panel

Richard sube su música en **Sonidos** (en el panel), eligiendo el género. Queda
guardada y la Estación la baja sola; ya no hace falta dejar archivos en una
carpeta de la Mac (las carpetas de antes siguen valiendo). El motor trae además
dos pistas propias de reserva: la del **bombo** («tum, pum, pum», para todo
video sin música de su género) y una **bachata** provisional. Todo el detalle
en [RITMO.md](RITMO.md).

## La pista propia del motor (30 sep 2026)

Para los videos de tecnología (Full Código) el motor trae su propia pista
electrónica, `estacion/recursos/musica/electronic-tech-synth-minimal-curious-pulse.mp3`.
La escribe nota por nota `scripts/musica-tech.mjs`: es nuestra, sin derechos de
terceros, y por eso sí va en el repositorio. Las pistas de Suno de esta lista
siguen yendo en la Mac. Una pista se elige por género, época o instrumento; el
ánimo solo desempata (C-MUSICA-2): un video de tecnología no sale con salsa.

## Qué hace el motor (ya construido)

1. **Cada guion trae un estilo de música** (`musica`, en inglés, lo escribe la
   IA y Richard lo puede cambiar en el editor: «Música de fondo»). Ej.:
   `1950s Cuban salsa, brass and congas, festive`.
2. **La Estación elige la pista** de las carpetas
   `/Users/windocellc/Motor-Escenia/music-cortinas-libre-de-copy/` (la de Richard,
   ignorada por git) y `/Users/windocellc/Motor-Escenia/estacion/recursos/musica-local/`, comparando
   las palabras del estilo con las palabras del nombre del archivo. Gana la que
   comparte más. Si ninguna encaja, usa la que se llama `neutral-…`. Si la
   carpeta está vacía, el video sale sin música y el paso del trabajo dice
   «música: ninguna».
3. **Volumen**: la pista se normaliza una vez (mismo volumen para todas) y en
   el video va **muy por debajo de la voz** (12 %). La voz nunca se tapa
   (candado C-MUSICA-1, con prueba automática).
4. **Interludios**: la IA mete 1 o 2 escenas `interludio` (5 a 8 s) después de
   un momento fuerte. Ahí la voz calla, la música sube al 80 % y pasan 2 o 3
   imágenes. Richard puede agregar o quitar interludios en el editor (parte
   «interludio» + los segundos). Al final del video la música sube 4 s y se
   apaga.
5. La pista se repite en bucle si el video es más largo que ella.

## Cómo se crean las pistas en Suno (lo hace Richard)

Para cada fila de la tabla:

1. En Suno (https://suno.com/create), arriba a la izquierda elige **Avanzado**
   (antes se llamaba «Custom»; «Sencillo» es la caja de una sola frase). Modelo
   **v6**.
2. Activa el interruptor **Instrumental** y deja la **Letra** vacía.
3. En la caja de **Estilo** (estilo de música) pega el texto de la columna
   «Prompt para Suno».
4. En **Título** pega el nombre del archivo (sin `.mp3`), para no perderse.
5. Toca **Crear** (salen 2 versiones). En **Biblioteca**, escucha y descarga la
   mejor: menú **⋯ → Descargar → MP3**.
   Fuente: ayuda oficial de Suno (help.suno.com, «Make a song in Simple Mode»,
   «Can I use my own lyrics?», «How do I download songs?», «Current Models: v6»),
   comprobada el 27 sep 2026.
6. Renombra el archivo EXACTAMENTE como dice la columna «Archivo» y déjalo en
   `/Users/windocellc/Motor-Escenia/estacion/recursos/musica-local/`.

Duración ideal: 2 a 3 minutos (se repite sola). Sin voces, sin coros.
Comprobación: al arrancar, la Estación escribe en su registro «Música de
fondo: N pista(s)»; y en el panel, el paso del trabajo dice «música: archivo».

## Las 50 pistas

### Latinas por época (biografías de artistas)

| #   | Archivo                                             | Prompt para Suno (Style of music)                                                                   | Para qué                                          |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `salsa-1950s-cuban-brass-congas-upbeat.mp3`         | 1950s Cuban salsa, big brass section, congas and timbales, festive dance-floor energy, instrumental | Celia Cruz, Sonora Matancera, La Habana de los 50 |
| 2   | `salsa-1960s-new-york-brass-driving.mp3`            | 1960s New York salsa dura, punchy trumpets and trombones, piano montuno, driving, instrumental      | Fania, Héctor Lavoe, Willie Colón                 |
| 3   | `son-cubano-1940s-tres-guitar-warm.mp3`             | 1940s Cuban son, tres guitar, bongos, upright bass, warm and nostalgic, instrumental                | Infancias en Cuba, Compay Segundo                 |
| 4   | `mambo-1950s-big-band-brass-energetic.mp3`          | 1950s mambo big band, blazing brass, saxophones, energetic, instrumental                            | Pérez Prado, Benny Moré                           |
| 5   | `bolero-1950s-guitar-trio-romantic-melancholic.mp3` | 1950s Latin bolero, guitar trio, soft maracas, romantic and melancholic, instrumental               | Amores, pérdidas, Los Panchos                     |
| 6   | `cha-cha-cha-1950s-flute-violins-playful.mp3`       | 1950s cha-cha-cha charanga, flute and violins, playful and elegant, instrumental                    | Momentos ligeros de los 50                        |
| 7   | `cumbia-1970s-accordion-colombian-upbeat.mp3`       | 1970s Colombian cumbia, accordion, gaita flute, tambora drums, upbeat, instrumental                 | Artistas colombianos, fiestas                     |
| 8   | `vallenato-accordion-colombian-warm.mp3`            | Colombian vallenato, accordion, caja and guacharaca, warm and heartfelt, instrumental               | Diomedes Díaz, Carlos Vives                       |
| 9   | `merengue-1980s-brass-fast-festive.mp3`             | 1980s Dominican merengue, brass, tambora, güira, fast and festive, instrumental                     | Juan Luis Guerra, Wilfrido Vargas                 |
| 10  | `tango-1940s-bandoneon-dramatic.mp3`                | 1940s Argentine tango, bandoneon, violin, piano, dramatic, instrumental                             | Gardel, Piazzolla, Buenos Aires                   |
| 11  | `mariachi-ranchera-brass-guitar-proud.mp3`          | Mexican mariachi ranchera, trumpets, vihuela, guitarrón, proud and emotional, instrumental          | Vicente Fernández, Juan Gabriel                   |
| 12  | `bossa-nova-1960s-nylon-guitar-smooth.mp3`          | 1960s Brazilian bossa nova, nylon guitar, light brushes, smooth and elegant, instrumental           | Brasil, Jobim, elegancia                          |
| 13  | `flamenco-spanish-guitar-passionate.mp3`            | Spanish flamenco, solo nylon guitar, palmas handclaps, passionate, instrumental                     | España, Camarón, Paco de Lucía                    |
| 14  | `latin-jazz-1970s-piano-drums-cool.mp3`             | 1970s Latin jazz, piano, congas, vibraphone, cool and sophisticated, instrumental                   | Tito Puente, Nueva York de noche                  |
| 15  | `reggaeton-2000s-dembow-electronic-modern.mp3`      | 2000s reggaeton, dembow beat, light synths, modern and confident, instrumental, no vocals           | Daddy Yankee, artistas urbanos                    |
| 16  | `latin-pop-1990s-guitar-drums-upbeat.mp3`           | 1990s Latin pop, acoustic guitar, bright percussion, upbeat, instrumental                           | Shakira, Ricky Martin, los 90                     |
| 17  | `bachata-guitar-bongos-romantic.mp3`                | Dominican bachata, requinto guitar, bongos, romantic, instrumental                                  | Romeo Santos, Aventura                            |
| 18  | `latin-ballad-piano-strings-emotional.mp3`          | Latin ballad, piano and strings, emotional and cinematic, instrumental                              | Despedidas, momentos íntimos                      |

### Otras épocas y géneros (biografías internacionales)

| #   | Archivo                                       | Prompt para Suno (Style of music)                                                       | Para qué                        |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------- |
| 19  | `jazz-1930s-big-band-swing-upbeat.mp3`        | 1930s big band swing jazz, brass and clarinet, lively, instrumental                     | Años 30, cabarets, radio        |
| 20  | `jazz-noir-1950s-saxophone-tense.mp3`         | 1950s film-noir jazz, smoky saxophone, brushed drums, upright bass, moody, instrumental | Misterio, noche, crimen         |
| 21  | `blues-1960s-electric-guitar-melancholic.mp3` | 1960s electric blues, gritty guitar, slow shuffle, melancholic, instrumental            | Vidas duras, el Sur de EE.UU.   |
| 22  | `rock-and-roll-1950s-guitar-piano-upbeat.mp3` | 1950s rock and roll, twangy guitar, boogie piano, fun, instrumental                     | Elvis, los 50 en EE.UU.         |
| 23  | `rock-1970s-electric-guitar-drums-bold.mp3`   | 1970s classic rock, electric guitar riffs, big drums, bold, instrumental                | Bandas, giras, rebeldía         |
| 24  | `funk-1970s-bass-brass-groovy.mp3`            | 1970s funk, slap bass, brass stabs, wah guitar, groovy, instrumental                    | Los 70, James Brown, disco-funk |
| 25  | `disco-1970s-strings-bass-glamorous.mp3`      | 1970s disco, lush strings, four-on-the-floor, glamorous, instrumental                   | Studio 54, la fama              |
| 26  | `synthwave-1980s-electronic-retro-neon.mp3`   | 1980s synthwave, retro analog synths, gated drums, neon nostalgia, instrumental         | Los 80, videojuegos, MTV        |
| 27  | `hip-hop-1990s-boom-bap-drums-confident.mp3`  | 1990s boom bap hip hop beat, dusty drums, jazzy sample, confident, instrumental         | Los 90, raperos, barrio         |
| 28  | `folk-acoustic-guitar-harmonica-soft.mp3`     | Acoustic folk, fingerpicked guitar, harmonica, homely and warm, instrumental            | Orígenes humildes, campo        |

### Cine y documental (para cualquier biografía o historia)

| #   | Archivo                                            | Prompt para Suno (Style of music)                                                           | Para qué                              |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| 29  | `neutral-documentary-piano-soft-reflective.mp3`    | Documentary underscore, soft piano, subtle strings, reflective, slow, instrumental          | **La de reserva**: cuando nada encaja |
| 30  | `documentary-strings-orchestral-emotional.mp3`     | Emotional documentary score, warm strings, slow build, cinematic, instrumental              | Momentos de peso                      |
| 31  | `orchestral-triumphant-drums-brass-victory.mp3`    | Epic orchestral trailer, brass, big drums, triumphant, instrumental                         | Triunfos, el gran regreso             |
| 32  | `orchestral-tense-pulse-strings-danger.mp3`        | Tense cinematic underscore, pulsing low strings, ticking percussion, suspense, instrumental | Peligro, exilio, persecución          |
| 33  | `melancholic-strings-piano-loss-slow.mp3`          | Melancholic cello and piano, slow, mournful, cinematic, instrumental                        | Muertes, pérdidas                     |
| 34  | `hopeful-uplifting-strings-piano-bright.mp3`       | Hopeful uplifting cinematic, piano and strings, gentle build, bright, instrumental          | Nuevos comienzos, esperanza           |
| 35  | `ambient-soft-pads-dreamy-calm.mp3`                | Ambient soundscape, soft synth pads, dreamy, very calm, instrumental                        | Reflexión, cierres suaves             |
| 36  | `classical-strings-quartet-elegant-vintage.mp3`    | Classical string quartet, elegant, vintage, chamber music, instrumental                     | Épocas antiguas, aristocracia         |
| 37  | `classical-piano-nocturne-intimate-soft.mp3`       | Solo classical piano nocturne, intimate, tender, slow, instrumental                         | Infancia, intimidad                   |
| 38  | `orchestral-drums-war-tense-conflict.mp3`          | War drums and low brass, orchestral, tense, conflict, instrumental                          | Guerras, dictaduras, revoluciones     |
| 39  | `sad-piano-slow-farewell-tribute.mp3`              | Sad solo piano, slow farewell, tribute, gentle, instrumental                                | Homenajes, finales                    |
| 40  | `inspirational-piano-strings-build-triumphant.mp3` | Inspirational piano with rising strings, building to a triumphant peak, instrumental        | Cierres épicos, legado                |

### Tecnología, IA y software (canal de IA, demos)

| #   | Archivo                                            | Prompt para Suno (Style of music)                                                              | Para qué                          |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| 41  | `neutral-electronic-minimal-soft-curious-tech.mp3` | Minimal electronic, soft synth arpeggios, light percussion, curious, modern tech, instrumental | **La de reserva tech**            |
| 42  | `electronic-upbeat-corporate-optimistic-tech.mp3`  | Upbeat corporate electronic, bright synths, clean drums, optimistic, instrumental              | Demos de producto, lanzamientos   |
| 43  | `lofi-chill-beat-soft-mellow.mp3`                  | Lo-fi chill hip hop beat, mellow keys, vinyl texture, relaxed, instrumental                    | Tutoriales, explicaciones largas  |
| 44  | `electronic-glitch-futuristic-ai-tense.mp3`        | Futuristic glitchy electronic, deep bass, digital textures, slightly tense, instrumental       | IA, futuro, riesgos               |
| 45  | `acoustic-ukulele-claps-friendly-upbeat.mp3`       | Friendly acoustic ukulele, handclaps, whistling, cheerful, instrumental                        | Apps sencillas, tono amable       |
| 46  | `techno-driving-pulse-upbeat-news.mp3`             | Driving techno pulse, energetic, newsroom urgency, instrumental                                | Noticias, novedades rápidas       |
| 47  | `chiptune-8bit-playful-retro-game.mp3`             | 8-bit chiptune, playful, retro video game, upbeat, instrumental                                | Historia de la tecnología, juegos |

### Curiosidades y misterio (Caprichoso TV, más adelante)

| #   | Archivo                                        | Prompt para Suno (Style of music)                                           | Para qué                     |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| 48  | `quirky-pizzicato-marimba-playful-curious.mp3` | Quirky pizzicato strings and marimba, playful, curious, light, instrumental | Datos curiosos, humor ligero |
| 49  | `mystery-theremin-spooky-tense-fun.mp3`        | Spooky mystery, theremin, plucked strings, playful suspense, instrumental   | Misterios, leyendas          |
| 50  | `retro-lounge-1960s-organ-cheeky.mp3`          | 1960s retro lounge, Hammond organ, bossa drums, cheeky, instrumental        | Retro, kitsch, anécdotas     |

## Derechos

Las pistas las genera Richard con su plan de pago de Suno; los términos de
Suno dan uso comercial de lo generado mientras el plan esté activo. Aun así,
YouTube puede reclamar por Content ID alguna pista si se parece a otra: si
pasa, se reemplaza esa pista y ya. Cada video guarda en `creditos.txt` qué
pista usó.
