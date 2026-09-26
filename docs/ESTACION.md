# La Estación — cómo se enciende y qué hace

La Estación es el programa que corre **en la Mac de Richard** y arma los videos.
El panel (escenia.sitios.dev) solo guarda guiones y una cola de trabajos; la
Mac hace lo pesado: voz, clips, render. **Los MP4 se quedan en la Mac.**

## Qué necesita (una sola vez)

| Qué                    | Quién                                          | Cómo se comprueba                |
| ---------------------- | ---------------------------------------------- | -------------------------------- |
| Node 24 y ffmpeg       | ya están en la Mac                             | `node -v` y `ffmpeg -version`    |
| `estacion/.env`        | Richard pega las claves, la IA arma el archivo | la Estación arranca sin quejarse |
| Chrome para renderizar | Remotion lo baja solo la primera vez           | tarda 1–2 min la primera vez     |

Variables de `estacion/.env` (copiar de `estacion/.env.example`). **Ya hay un
`estacion/.env.produccion` armado con el panel en vivo y el secreto correcto;
cuando el sitio exista, la IA lo renombra a `.env`.**

- `PANEL_URL` — `https://escenia.sitios.dev`
- `YAPANEL_DB_TOKEN` — token para consultar la base desde fuera (solo migraciones o revisiones; la Estación normal no lo usa)
- `ESTACION_SECRETO` — el mismo que está en el panel (YaDominios Cloud → variables)
- `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` — la voz de Richard. **Sin
  ellas, la Estación usa la voz de prueba del sistema** (suena robótica pero
  sirve para ver el video completo sin gastar). El video queda marcado «VOZ DE
  PRUEBA» en la esquina.
- `PEXELS_API_KEY` — clips de fondo. Sin ella, fondos de color.
- `FAL_KEY` — imágenes generadas con IA (fal.ai, prepago). Sin ella, esas escenas van con clip.

## Encenderla

**Ya está encendida siempre.** Desde el 25 sep 2026 corre como LaunchAgent de
macOS (`~/Library/LaunchAgents/com.windoce.escenia-estacion.plist`): arranca
sola cuando Richard inicia sesión en la Mac y se reinicia si se cae. Registro
en `estacion/out/estacion.log`.

```bash
cd /Users/windocellc/Motor-Escenia/estacion && tail -20 out/estacion.log
```

Para pararla o volver a arrancarla a mano:

```bash
launchctl bootout gui/$(id -u)/com.windoce.escenia-estacion
```

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.windoce.escenia-estacion.plist
```

Si se cambia la versión de Node (nvm), hay que actualizar la ruta de `node`
dentro del plist. Arrancarla a mano (sin LaunchAgent):

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npm run estacion
```

Qué se ve: «Empaquetando la plantilla de video…», luego «Lista. Esperando
trabajos.» Cada 30 segundos pregunta al panel. Cuando toma un trabajo, imprime
el avance (voz → clips → video) y al final la ruta del MP4 en `estacion/out/t<id>/`.

En el panel, arriba en «Guiones», dice **Estación: conectada** mientras esté
encendida (señal cada 30 s; se da por apagada a los 2 minutos sin señal).

## Probar la plantilla sin panel

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npm run render -- pruebas/guion-ejemplo.json
```

Deja el video en `estacion/out/local-guion-ejemplo/video-16x9.mp4`.

## Ver la plantilla en vivo (para diseñarla)

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npm run studio
```

Abre Remotion Studio en el navegador con la composición `TechExplainer`.

## Qué hace con cada trabajo

1. **Voz.** Una llamada a ElevenLabs por escena (`/with-timestamps`, que
   devuelve el tiempo de cada letra). Se unen con 350 ms de silencio entre
   escenas. El costo se anota en el panel (candado de gasto).
2. **Subtítulos.** `compartido/subtitulos.ts` convierte letras → palabras con
   tiempos, y calcula dónde empieza y termina cada escena.
3. **Clips.** TODAS las escenas llevan clip: primero la búsqueda que escribió
   la IA (`visual.busqueda`), y si no da resultado, las búsquedas de reserva
   por parte del guion (`RESERVA_POR_PARTE` en `visuales.ts`). Los clips se
   guardan en `estacion/cache/clips/` (caché) y el crédito del autor queda en
   `creditos.txt`. Las escenas de tipo «texto» usan el clip difuminado con la
   frase grande al centro.
   3b. **Fotos (biografías).** Las escenas de tipo «foto» buscan en Wikimedia
   Commons (`fotos.ts`) y solo aceptan licencias que permiten uso comercial y
   obras derivadas (CC BY, CC BY-SA, CC0, dominio público; nunca NC ni ND).
   Cada foto deja su crédito y licencia en `creditos.txt`, para pegarlo en la
   descripción del video. Caché en `estacion/cache/clips/fotos/`.
   3c. **Imágenes con IA (`visual.tipo = ia`).** Para momentos de una biografía
   sin foto real. Corre en fal.ai con el único modelo permitido en
   `compartido/modelos.ts` (Seedream 4, ~$0.03 por imagen; tope en código de
   $0.05: nada más caro corre, ni de respaldo). Necesita `FAL_KEY` (cuenta
   PREPAGO) en `estacion/.env`; sin ella, esas escenas van con clip. Cada
   imagen se anota como gasto en el panel y deja en `creditos.txt` la marca
   «contenido sintético»: al subir a YouTube hay que declarar contenido
   alterado o sintético (Fase 3 lo hará sola). Estilo por defecto: ilustración
   editorial, no foto falsa; en época anterior a 1970 sale en blanco y negro.
   3d. **Titulares y recortes (`titular`, `periodico`, `red`).** Se dibujan en la
   plantilla (no gastan nada): titular enorme con golpe y sacudida, recorte
   de periódico con fecha y texto corto que entra con whoosh, y tarjeta de red
   social que sube desde abajo. El texto lo escribe la IA en el guion
   (`visual.titular`, `visual.fecha`, `visual.cuerpo`).
4. **Render.** Remotion (`TechExplainer` para tecnología, `MiniDocumental`
   para biografías: serif, dorado, fotos con movimiento lento y marco;
   1920×1080, 30 fps, H.264): fundido
   entre escenas con «whoosh», rótulos que entran con «pop», subida de tensión
   bajo el título y campana en el cierre. Los efectos de sonido son propios,
   generados con ffmpeg (`estacion/recursos/sfx/`, sin licencia de terceros);
   se pueden reemplazar por otros poniendo archivos con el mismo nombre
   (`whoosh-1.mp3`…, `pop.mp3`, `riser.mp3`, `ding.mp3`, `boom.mp3`) en
   `estacion/recursos/sfx-local/`, que vive solo en la Mac (está en
   `.gitignore`) y gana sobre los del repositorio. El 26 sep 2026 se recortaron
   ahí, a partir del «PACK de SONIDOS 2026» de Richard, los swoosh, el riser,
   el boom, la transición y las campanas (buscando el golpe con
   `silencedetect`, recortando, con fundido y volumen normalizado a −16 LUFS).

**Ojo con el pack de sonidos:** la carpeta `PACK de SONIDOS 2026/` NUNCA va al
repositorio (es público y trae clips con derechos: memes, música, voces).
Los efectos genéricos (swoosh, boom, campanas, teclado) se usan como
ambiente; los memes y la música con derechos quedan para la biblioteca de
la Fase 2, marcados «licencia: otro», y solo entran a un video si Richard lo
confirma en ese video. 5. **Reporte.** Sube al panel el MP4 (por partes de 8 MB, al almacén del
sitio), la voz (MP3) y los subtítulos (JSON), y registra la ruta local del
MP4. En el panel el video se ve y se descarga desde la página del guion.

Para subir un video que ya estaba renderizado antes de que existiera la subida
automática:

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npm run subir-video -- <guion_id> out/t<id>/video-16x9.mp4 --voz-de-prueba
```

Si algo falla, el trabajo queda en «error» con el motivo, y en el panel hay un
botón «Reintentar». Si la Estación se apaga a mitad de un trabajo, el panel lo
devuelve a la cola pasadas 2 horas.

## Licencia de Remotion

Gratis si Windoce tiene 3 personas o menos (contratistas incluidos). Si son
más, hace falta la licencia «Automators» ($0.01 por render, mínimo $100/mes):
https://www.remotion.pro/license. Esta decisión es de Richard.
