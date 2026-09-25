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
- `ESTACION_SECRETO` — el mismo que está en el panel (YaDominios Cloud → variables)
- `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` — la voz de Richard. **Sin
  ellas, la Estación usa la voz de prueba del sistema** (suena robótica pero
  sirve para ver el video completo sin gastar). El video queda marcado «VOZ DE
  PRUEBA» en la esquina.
- `PEXELS_API_KEY` — clips de fondo. Sin ella, fondos de color.

## Encenderla

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
3. **Clips.** Para cada escena con `visual.tipo = stock`, busca en Pexels con
   `visual.busqueda`, baja el clip a `estacion/cache/public/clips/` (caché) y
   guarda el crédito del autor en `creditos.txt`.
4. **Render.** Remotion (`TechExplainer`, 1920×1080, 30 fps, H.264).
5. **Reporte.** Sube al panel la voz (MP3) y los subtítulos (JSON) — pesan
   poco — y registra la ruta local del MP4.

Si algo falla, el trabajo queda en «error» con el motivo, y en el panel hay un
botón «Reintentar». Si la Estación se apaga a mitad de un trabajo, el panel lo
devuelve a la cola pasadas 2 horas.

## Licencia de Remotion

Gratis si Windoce tiene 3 personas o menos (contratistas incluidos). Si son
más, hace falta la licencia «Automators» ($0.01 por render, mínimo $100/mes):
https://www.remotion.pro/license. Esta decisión es de Richard.
