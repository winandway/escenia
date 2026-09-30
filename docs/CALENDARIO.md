# Calendario de publicaciones

Pantalla: https://escenia.sitios.dev/calendario (menú «Calendario»).
Pedido por Richard el 29 sep 2026: con producción para publicar todos los días,
hacía falta saber a qué hora sale cada video y que dos no salgan juntos.

## Qué hace

La pantalla es **una sola lista** (rehecha el 29 sep 2026: la primera versión,
con pestañas por plataforma y cuadrícula de cuatro semanas, confundía a
Richard en el teléfono).

- **Falta por publicarse:** todo lo que viene, en orden y agrupado por día,
  de todos los canales y plataformas juntos. Solo salen los días que tienen
  algo. Cada video muestra su hora en grande, el título, y debajo el tipo, el
  canal, la plataforma y cómo va («Ya programado» o «Falta programarlo»).
  Se ve al abrir, sin tocar ningún botón.
- **Lo que ya salió no aparece.** Cuenta como «ya salió» lo marcado
  «Publicado» y lo «Programado» cuya hora ya pasó, porque la plataforma lo
  publica sola. Queda plegado al final, en «Ya publicados».
- **Un plan al que se le pasó la fecha** sale arriba en un aviso, para ponerle
  otra fecha o marcar que ya salió.
- **La ficha:** al tocar un video se abre arriba su ficha: copiar el título,
  pegar el enlace, cambiar cómo va, moverlo, o quitarlo (dentro de los tres
  puntos).
- **Sin fecha todavía:** los videos que Escenia ya produjo y no tienen día en
  YouTube. Cada tarjeta trae el próximo hueco libre en el botón. Solo aparece
  si hay alguno.
- **Agregar un video al calendario:** formulario plegado, para cualquier
  video y cualquier plataforma (YouTube, Facebook, Instagram, TikTok).
- **No hay pestañas por plataforma.** La plataforma es una etiqueta de cada
  video. Un Short en Facebook no choca con uno en YouTube.
- **En la página del guion** («Para YouTube») sale cuándo sale cada pieza.

## El enlace y la miniatura

- En la ficha de cada publicación hay una casilla **«Enlace del video»**. Se
  pega el enlace del video ya subido (sirve el de YouTube Studio, el de
  compartir o el de la página del video) y el calendario muestra **la
  miniatura que tiene en YouTube**, en la ficha y en la etiqueta del día.
- El enlace se guarda limpio (`https://youtu.be/…` o
  `https://www.youtube.com/shorts/…`) y queda el botón «Abrir en YouTube».
- Al guardar un enlace, lo que estaba «Agendado» pasa a «Programado».
- Solo se aceptan enlaces `https` de la plataforma de esa publicación.
- Mientras no haya enlace (y en Facebook, Instagram y TikTok, que no dan la
  miniatura por enlace) se muestra **la miniatura que armó Escenia** para ese
  video.
- En una base que ya existía, la columna se agregó a mano una sola vez:
  `ALTER TABLE calendario ADD COLUMN enlace TEXT NOT NULL DEFAULT ''` (hecho
  en vivo el 29 sep 2026). El canario la vigila.

## Las reglas (se cambian en la misma pantalla)

| Regla                      | Valor de arranque        |
| -------------------------- | ------------------------ |
| Horas de los Shorts        | 12:00 p. m. y 7:00 p. m. |
| Horas de los videos largos | 4:00 p. m.               |
| Separación mínima          | 3 horas                  |
| Zona horaria               | Este de EE. UU.          |

Cuántas horas tiene un tipo es su máximo por día. Las horas de arranque salen
de la investigación de Shorts ([YOUTUBE-SHORTS.md](YOUTUBE-SHORTS.md)): uno o
dos Shorts por día, separados varias horas.

## Lo que el calendario NO deja hacer (C-CALENDARIO-1)

Dentro del mismo canal y la misma plataforma:

1. Dos publicaciones a la misma hora.
2. Dos publicaciones a menos de la separación mínima (también de un día para otro).
3. Más publicaciones por día que horas tiene ese tipo.
4. Un Short antes que su video completo (el cierre invita a verlo).
5. Agendar en un día o una hora que ya pasó (salvo anotar algo que «ya salió»).

Cuando rechaza, dice con qué video choca y cuál es el próximo hueco libre.

**Un plan se frena; un hecho se anota.** Las reglas frenan lo que todavía es un
plan («Agendado»), que es donde se puede elegir otra hora. Lo que ya está
«Programado» en la plataforma o ya «Publicado» es un hecho: se anota tal como
está y, si quedó pegado a otra publicación, el calendario lo avisa («Ojo: queda
a menos de 3 horas de…»). Richard programa a veces dos videos a 15 minutos o
tres Shorts el mismo día; el calendario tiene que mostrar la verdad.

## Cómo está hecho

- Tabla `calendario` (en `schema.sql`). `fecha` y `hora` van en el reloj de
  Richard (la zona de las reglas), igual que se escriben en YouTube Studio.
  `hora` vacía = falta ponerla. `guion_id` vacío = video hecho fuera.
- Lógica pura y probada: `compartido/calendario.ts` (`revisarHueco`,
  `proximoHueco`, `huecosDelDia`, `repartir`).
- Base: `src/lib/calendario.ts` (`agendar` es la única puerta de escritura).
- Pantallas: `src/app/calendario/`.
- Reglas en la tabla `ajustes`: `calendario_horas_short`,
  `calendario_horas_largo`, `calendario_separacion_min`, `calendario_zona`.
- El calendario **no publica nada**: es el plan. Richard programa el video en
  la plataforma con esa fecha y marca «Ya lo programé».

## Cargar el calendario desde la Mac

`scripts/calendario-remoto.ts` escribe en el calendario en vivo pasando por la
misma puerta que el panel (`agendar`), con un plan en JSON:

```bash
cd /Users/windocellc/Motor-Escenia && estacion/node_modules/.bin/tsx scripts/calendario-remoto.ts < plan.json
```

El 29 sep 2026 se cargó así el arranque: 13 videos ya publicados en Caprichoso
TV (Karol G, Celia Cruz y Bad Bunny) con la hora real y el enlace, leídos de
la página pública del canal con `yt-dlp`, y el video completo de Luis Miguel
en el primer hueco libre.

## Cómo se comprueba

- `npx vitest run pruebas/calendario.test.ts` (20 pruebas).
- El canario https://escenia.sitios.dev/datos/salud dice `calendario: ok`.
- En pantalla: agendar dos videos del mismo canal a la misma hora tiene que
  dar el aviso en rojo con el próximo hueco libre.
