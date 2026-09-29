# Calendario de publicaciones

Pantalla: https://escenia.sitios.dev/calendario (menú «Calendario»).
Pedido por Richard el 29 sep 2026: con producción para publicar todos los días,
hacía falta saber a qué hora sale cada video y que dos no salgan juntos.

## Qué hace

- **Por agendar:** todo lo que la Estación ya produjo y no tiene fecha (el
  video largo y sus Shorts, con el título de YouTube). Cada tarjeta trae el
  próximo hueco libre en el botón: un toque y queda agendado. «Agendar los N»
  reparte todo de una vez.
- **Elegir otro día u hora:** dos toques, el día y la hora. Las horas ocupadas
  salen tachadas y dicen por qué. «Otra hora» deja escribir una hora distinta.
- **Calendario:** cuatro semanas. Cada publicación es una etiqueta con su hora,
  su tipo y su color: ámbar = agendado aquí, azul = ya programado en la
  plataforma, verde = ya salió. Al tocarla se abre su ficha: copiar el título,
  cambiar el estado, moverla, o quitarla (dentro de los tres puntos).
- **Plataformas y canales:** YouTube, Facebook, Instagram y TikTok; Caprichoso
  TV y Canal de IA. Cada combinación lleva su propio calendario: un Short en
  Facebook no choca con uno en YouTube.
- **Videos hechos fuera de Escenia:** se agregan con el formulario de abajo y
  ocupan su hueco igual.
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

## Cómo se comprueba

- `npx vitest run pruebas/calendario.test.ts` (20 pruebas).
- El canario https://escenia.sitios.dev/datos/salud dice `calendario: ok`.
- En pantalla: agendar dos videos del mismo canal a la misma hora tiene que
  dar el aviso en rojo con el próximo hueco libre.
