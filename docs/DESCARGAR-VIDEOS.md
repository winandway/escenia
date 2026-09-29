# Bajar un video de YouTube a la Mac

Para tener un video como archivo (verlo sin internet, revisarlo cuadro por
cuadro, usarlo de referencia). Queda en
`/Users/windocellc/Motor-Escenia/descargas/`, que **no sube al repositorio**.

## El prompt (se pega en la sesión de Motor Escenia)

```
INICIO DEL PROMPT
Baja este video de YouTube a la carpeta descargas del proyecto con
scripts/descargar-video.sh y dime el nombre del archivo, cuánto dura y cuánto
pesa: <pega aquí el enlace completo del video>
FINAL DEL PROMPT PARA Claude (sesión de Motor Escenia)
```

## A mano

```bash
cd /Users/windocellc/Motor-Escenia && bash scripts/descargar-video.sh "https://youtu.be/XXXXXXXXXXX"
```

## Qué hace

- Baja el video en MP4 hasta 1080p, con video H.264 y audio AAC (lo abren
  CapCut, QuickTime, Premiere y el resto sin convertir).
- Lo guarda con el título del video y su código entre corchetes.
- Necesita `yt-dlp` (ya está instalado en la Mac; si falta: `brew install yt-dlp`).

## Ojo

Un video de otro canal tiene dueño. Bajarlo para verlo o estudiarlo no toca tu
canal; **publicarlo tal cual sí**: YouTube reconoce el video y la música, y el
reclamo cae sobre el canal que lo sube.
