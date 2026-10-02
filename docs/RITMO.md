# Ritmo: que el video no aburra

> Pedido por Richard el 2 de octubre de 2026: _«las personas están comentando
> que los videos son aburridos… es muy larga la conversación, y una sola imagen
> o letras sin imágenes… habla de Shakira y no salen imágenes de lo que está
> hablando… la gente desliza y se va»_. Y la meta: _«que nos parezcamos a los
> videos que se editan hoy en CapCut: las imágenes se mueven, cuando una imagen
> entra se produce un sonido, y todo produce una sinergia que engancha»_.

## El diagnóstico (medido, no opinado)

En el video de Prince Royce (guion 6) había **15 imágenes en 410 segundos**:
cada imagen duraba entre 24 y 39 segundos. La voz nombraba a Shakira, a Romeo
Santos, a Karol G, a Tainy, y en pantalla seguía la misma foto o el mismo
titular. Eso es lo que aburre: no la historia, sino la imagen quieta.

La voz tenía 50 pausas de más de 0,3 segundos, de largos muy distintos (de 0,3
a más de 1,5 s), y cada escena se aceleraba o frenaba contando esas pausas. Por
eso «el ritmo no se mantenía».

## El plan y lo que ya quedó hecho

| #   | Qué                                                                                                                              | Estado                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | **Planos**: la imagen cambia dentro de la escena, pegada a la frase que se dice. Nombran a alguien → sale su foto con su nombre  | Hecho (C-RITMO-1)                          |
| 2   | **Cifras en grande**: cuando la voz dice un número, salta en pantalla («15 nominaciones», «0 premios»)                           | Hecho (plano tipo «dato»)                  |
| 3   | **Relleno automático**: donde nada cambiaría en 5 segundos, entra otra imagen del video. Vale también para los guiones viejos    | Hecho                                      |
| 4   | **Movimiento**: cada plano entra de una manera distinta (golpe, de lado, de abajo, acercándose) y se mueve mientras dura         | Hecho                                      |
| 5   | **Sonido en cada corte**: un chasquido o un soplido bajito cada vez que cambia la imagen; un golpe grave en las cifras           | Hecho (efectos propios)                    |
| 6   | **Subtítulos al estilo CapCut**: pocas palabras, borde grueso, y la palabra que se dice salta en color                           | Hecho                                      |
| 7   | **Pausas parejas**: se recortan los silencios largos de la voz y el ritmo se mide sin ellos                                      | Hecho (C-VOZ-6)                            |
| 8   | **Música con bombo**: pista propia de bombo y bajo («tum, pum, pum»), reserva de todo video sin música de su género              | Hecho                                      |
| 9   | **Bachata**: pista propia provisional (requinto, bongó, güira, bajo) hasta que Richard suba una suya                             | Hecho, provisional                         |
| 10  | **Biblioteca de sonidos** en el panel: Richard sube su música y sus efectos, quedan guardados y la Estación los usa sola         | Hecho (C-SONIDOS-1)                        |
| 11  | **Versión nueva** de un guion ya aprobado (para rehacer un video sin perder el anterior)                                         | Hecho                                      |
| 12  | El guionista (la IA) escribe los planos de cada escena en todo guion nuevo                                                       | Hecho (instrucciones nuevas)               |
| 13  | Editar los planos a mano en el panel (hoy se ven, no se editan)                                                                  | Pendiente                                  |
| 14  | Elegir la pista exacta por video con una lista (hoy se elige sola por género; se puede forzar escribiendo su nombre en «Música») | Pendiente                                  |
| 15  | Imágenes divididas (dos fotos a la vez: «Royce contra la Academia»), memes y recortes de video                                   | Pendiente (entra con la biblioteca visual) |

## Cómo funciona un plano

En el guion, cada escena puede traer `visual.planos`. Cada plano dice:

- `frase`: de 2 a 5 palabras **literales** de la narración. El plano entra un
  pelo antes de que la voz las diga (120 milésimas, como corta un editor).
- `tipo`:
  - **foto**: foto real de una persona o un lugar (`busqueda`; `foto_de: lugar`
    si no es una persona). Con `texto`, lleva el nombre rotulado abajo.
  - **dato**: una cifra o frase corta en grande (`texto`).
  - **stock**: un clip de ambiente (`busqueda` en inglés).

La Estación busca cada imagen (fotos por Serper, clips por Pexels), calcula el
momento exacto con los tiempos de las palabras de la voz, y después **rellena**:
si entre dos cambios quedan más de 5 segundos, mete imágenes del propio video
cada 3,8 segundos más o menos. Al terminar dice cuántas imágenes tiene el video
y, si quedó algún tramo quieto de más de 6 segundos, lo avisa.

Las reglas están en `compartido/planos.ts` (los tiempos), `estacion/src/planos.ts`
(las imágenes) y `estacion/src/remotion/Planos.tsx` (cómo se dibujan).

## La biblioteca de sonidos

En el panel, **Sonidos**. Richard sube:

- **Música de fondo**, con su género (bachata, salsa, ritmo con bombo…). El
  género es la palabra con que la Estación elige la pista para cada video. Su
  música le gana siempre a la pista propia del motor del mismo género.
- **Efectos de sonido**, diciendo para qué se usan: cambio de imagen, paso de
  escena, golpe de titular, subida del arranque, campana del cierre.

Cada sonido pide de dónde salió (propio o hecho con IA, con licencia, o libre).
**No hay opción para canciones comerciales**: YouTube las reconoce y el video
deja de monetizar (ya pasó con un Short de vallenato).

Antes de cada producción, la Estación baja lo nuevo a la Mac
(`estacion/recursos/musica-panel` y `sfx-panel`) y aparta lo que Richard quitó.
«Quitar» nunca borra: el sonido deja de usarse y queda guardado.

## Los sonidos propios del motor

Escritos nota por nota, sin muestras ni servicios de terceros (son nuestros, por
eso sí van en el repositorio):

- `scripts/sfx-propios.mjs` → `corte-1` a `corte-5` (chasquido, soplidos, toque
  grave, obturador) y `boom` (el golpe de las cifras).
- `scripts/musica-propia.mjs` → `beat-kick-bass-driving-pulse-neutral.mp3` (el
  bombo) y `bachata-guitar-requinto-bongos-guira-romantic-warm.mp3` (la bachata
  provisional).
- `scripts/musica-tech.mjs` → la electrónica de antes (sigue en el catálogo).

Para cambiarlos se edita el archivo y se vuelve a correr:

```bash
cd /Users/windocellc/Motor-Escenia && node scripts/sfx-propios.mjs && node scripts/musica-propia.mjs
```

## Revisar cuadros sin renderizar el video entero

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/cuadros.ts 26 5,12.5,40
```

Saca esos segundos del trabajo 26 como imágenes en `out/t26/cuadros/`. Con
`--short 2` salen del Short 2.

## Rehacer un video ya aprobado

1. En el panel, en la página del guion: **Crear versión nueva** (o desde la Mac,
   `scripts/version-remota.ts <guion>`). Queda un borrador con el mismo texto y
   la misma opinión.
2. Se corrige lo que haga falta (los planos, la música) y se aprueba.
3. La versión anterior no se toca. Sus piezas se sacan de «Sin fecha todavía»
   con `estacion/node_modules/.bin/tsx scripts/sacar-del-calendario.ts <guion viejo>`
   (no se borran: quedan en «Fuera de la lista»).

## Cambiar una foto de un video ya armado

Al revisar los cuadros puede salir una foto que no sirve (un letrero de otro
canal, un dibujo, alguien que no es). Se cambia sin producir de nuevo:

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/cambiar-foto.ts 27 web-fb24bfc277836b5b.jpg "Romeo Santos concierto 2024"
```

Eso busca otra foto y la pone en todos los sitios donde salía la vieja (con
`--usar otra.jpg` reutiliza una que el video ya tiene; con `--lugar`, la foto
nueva es de un sitio). Después se vuelve a armar con la misma voz
(`rearmar.ts`) y se sube (`scripts/reintentar-remoto.ts`).

## El final del video

La última imagen se queda hasta el último cuadro (antes, la cola con música
quedaba en negro). En los canales sin marca propia aparece encima «SUSCRÍBETE»,
el nombre del canal y su @. En Full Código sale el cierre de la marca.

## Cambiar la música de un video ya armado

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/cambiar-musica.ts 27 "Dominican bachata, romantic guitar, bongos and güira"
```

Baja lo último de Sonidos, elige la pista por ese estilo (la de Richard del
género gana siempre) y la deja lista. Después se vuelve a armar con
`rearmar.ts` y se sube con `scripts/reintentar-remoto.ts`.

## El formato quedó como norma

Richard aprobó este formato el 2 de octubre de 2026 para todos los videos. La
receta completa (reglas, pasos, revisión y correcciones) está en el skill del
proyecto: `.claude/skills/formato-escenia/SKILL.md`.
