# Fase 3: subir a YouTube en privado, UTM y métricas

> Plan de docs/ANALISIS.md: la Mac sube el video **en privado** (hasta que Google apruebe la
> auditoría, todo lo que sube la API queda privado igual) y Richard lo hace público o lo programa
> en YouTube Studio, que es su revisión final. Construido el 8 nov 2026. Candado C-YOUTUBE-1.

## Qué hace

| Comando (desde la raíz)                                                            | Qué hace                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estacion/node_modules/.bin/tsx scripts/subir-youtube.ts --guion 20 --pieza largo` | Sube el largo del guion 20 en privado, con su título, descripción, palabras clave, la marca de contenido sintético y su miniatura. Anota el enlace en el calendario. |
| `… --pieza short-2`                                                                | Lo mismo con el Short 2 (su título del panel, con «#Shorts»).                                                                                                        |
| `… --prueba`                                                                       | Muestra lo que se mandaría, sin subir nada (no necesita la llave).                                                                                                   |
| `estacion/node_modules/.bin/tsx scripts/metricas-youtube.ts`                       | Vistas, me gusta y comentarios de todos los videos con enlace en el calendario. No escribe en la base: guarda `estacion/cache/metricas-youtube.json`.                |
| `estacion/node_modules/.bin/tsx scripts/autorizar-youtube.ts <cliente.json>`       | Una sola vez: le da permiso a la Mac para subir. Guarda la llave en `~/.config/motor-escenia/youtube.json` (600).                                                    |

- **Solo guiones aprobados**, y nunca un comercial (es del cliente, no va a nuestros canales).
- **No sube dos veces la misma pieza** (registro en `estacion/cache/youtube-subidos.json`); para
  repetir a propósito, `--otra-vez`.
- **Categoría**: Full Código → Ciencia y tecnología (28); Caprichoso TV → Música (10).
- **Contenido sintético**: siempre marcado (`status.containsSyntheticMedia`), porque las imágenes
  y la voz salen de la IA. YouTube lo pide y no desmonetiza.
- **Miniatura**: la portada de impacto de esa pieza (`portada-largo.png`, `portada-short-N.png`).
  Los Shorts no admiten miniatura por la API: se avisa y se sigue.

## UTM: saber cuánto vende cada video

Cada enlace de la descripción sale con `utm_source=youtube`, `utm_medium=video`,
`utm_campaign=escenia-g<guion>` y `utm_content=largo` o `short-N` (`compartido/utm.ts`). Los
enlaces de YouTube y los que ya traen UTM no se tocan. En la analítica del sitio (QRBott,
Losupe, Beellon) se filtra por campaña para ver qué trajo cada video.

## Lo que hace falta para la primera subida (Richard, una sola vez)

1. En Google Cloud, el proyecto **Escenia** (el de docs/AUDITORIA-YOUTUBE.md) con «YouTube Data
   API v3» activada.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth → App de escritorio**, nombre
   «Escenia Mac». Descargar el JSON.
3. Dejar ese archivo en Descargas y nada más. **La Estación lo ve sola** (mira cada 10 minutos,
   C-YOUTUBE-2), lo guarda en `~/.config/motor-escenia/youtube-cliente.json`, abre el navegador de
   la Mac y espera hasta 6 horas a que Richard elija la cuenta del canal y toque «Permitir». Si
   nadie toca, lo vuelve a abrir una hora después. Con la llave guardada no se vuelve a pedir ni se
   mira Descargas. (A mano, si hiciera falta: `scripts/autorizar-youtube.ts`.)
   Si macOS no deja que la Estación lea Descargas, el aviso queda en su registro y la IA copia el
   archivo a `~/.config/motor-escenia/youtube-cliente.json`, que la Estación también mira.

Mientras la pantalla de consentimiento esté «en prueba», Google vence el permiso a los 7 días:
hay que pasarla a «En producción» (no necesita revisión para uso propio) para que no se venza.

## Las piezas

| Qué                                            | Dónde                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| UTM                                            | `compartido/utm.ts`                                                       |
| Subida, miniatura, métricas, permiso           | `estacion/src/youtube.ts`                                                 |
| Comandos                                       | `scripts/subir-youtube.ts`, `metricas-youtube.ts`, `autorizar-youtube.ts` |
| Pruebas (todo simulado, nada le pega a Google) | `pruebas/youtube.test.ts`                                                 |

## Lo que falta

- Un botón «Subir a YouTube en privado» en la página del guion (hoy es un comando de la Mac).
- Ver las métricas en el panel (hoy en la Mac, para no escribir en la base a cada rato).
