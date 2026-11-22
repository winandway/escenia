# Formato «Tutorial en bloques» (candado C-BLOQUES-1)

Un tutorial vertical (1080×1920, de 60 a 100 s) que explica una app paso a paso dentro de un **mundo de bloques
propio** (voxel), con las **capturas REALES** de la app en un teléfono 3D. Nació el 22 nov 2026 con el piloto
«Cómo crear tu cuenta en Divoox Driver» (encargo en `encargos/divoox-tutorial-bloques/`, fuera de git), a partir de un
video de referencia que Richard vio (una historia de BlackBerry hecha en 3D de bloques; el estudio está en la carpeta
de la entrega). **El estilo es nuestro:** nada de ningún juego (ni nombres, ni personajes, ni texturas, ni logos).

## Qué tiene el video

| Pieza                                                            | Qué es                                                                                                                                                                                                               | Dónde vive                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Escenas de bloques                                               | Una imagen voxel por escena (Seedream 4, 3 ¢), todas con la misma ficha de estilo (cielo pastel de atardecer, cubos lisos sin textura de píxel, luz suave, desenfoque de maqueta).                                   | `compartido/bloques.ts` (`FICHA_ESTILO_BLOQUES`, `promptEscenaBloques`)                             |
| El personaje fijo                                                | Una hoja de referencia del personaje (3 ¢) y, con ella, cada escena por edición con referencia: sale igual en todo el video.                                                                                         | `promptHojaPersonaje`, `promptEscenaConPersonaje`                                                   |
| Cámara y profundidad                                             | Acercamientos y paneos suaves por puntos (nunca queda quieta); el sujeto recortado con Vision crece un poco más que el fondo.                                                                                        | `estacion/src/remotion/TutorialBloques.tsx` (`vistaDe`), `estacion/herramientas/quitar-fondo.swift` |
| Teléfono 3D                                                      | Un modelo de verdad (three.js con `@remotion/three`): cuerpo de caja redondeada, canto, botones rojos y luz; la captura ENTERA como pantalla, la nueva desliza sobre la anterior como en la app.                     | `estacion/src/remotion/Telefono3D.tsx`                                                              |
| Dedo 3D                                                          | Un dedo de bloques que baja, toca y se va, con la onda en la pantalla y el rótulo «¡TOCA AQUÍ!».                                                                                                                     | `Telefono3D.tsx` (`Dedo`, `RotuloToque`)                                                            |
| Teléfono dentro del dibujo                                       | Si la escena trae un teléfono con la pantalla verde, se encuentra solo y la captura se pega por sus cuatro esquinas (homografía), DEBAJO del «frente» (los dedos y el marco la tapan como a una pantalla de verdad). | `estacion/herramientas/pantalla-verde.py`, `homografia` + `matriz3dCss`                             |
| Lupas                                                            | Un pedazo de la captura en grande, con resaltes que se encienden cuando la voz lo nombra (regla de Richard: capturas enteras, nada de zoom a pantalla completa; para resaltar, una lupa).                            | `Lupa`                                                                                              |
| Rótulo del paso, cubos de progreso, sellos, rótulos de la escena | «PASO / TAREA», cubos que se ponen VERDES al cumplirse, sellos que golpean («CUENTA SEGURA»), rótulos que siguen a su objeto y nunca quedan detrás del teléfono ni fuera de la zona segura.                          | `Chip`, `Progreso`, `Sello`, `Rotulos`                                                              |
| Transiciones de cubos                                            | Cubos que se arman tapando lo de antes y se desarman mostrando lo nuevo (diagonal, centro, lluvia, columnas). Código, gratis.                                                                                        | `Transicion`                                                                                        |
| Subtítulos CapCut                                                | Pocas palabras, borde grueso, la palabra dicha en amarillo y un poco más grande; el margen cubre lo que crece (no se pegan) y el tamaño se ajusta para que el trozo quepa.                                           | `trozosDeSubtitulos`, `margenPalabra`                                                               |
| Portada y cierre                                                 | La portada es el primer cuadro (titular de bloque, logo, remate); el cierre lleva logo, la insignia OFICIAL de Google Play sin tocar con su línea legal, y el remate.                                                | `Portada`, `Cierre`                                                                                 |
| Sonido                                                           | La voz del banco a −14 LUFS, la música 13 dB por debajo (sube al final), un efecto por cada cambio (nunca dos pegados ni encima del nombre de la marca).                                                             | `efectosDelPlan`, `estacion/src/tutorial-bloques.ts mezclar`                                        |

Todo sale de un **plan** (`PlanTutorialBloques` en `compartido/bloques.ts`): las escenas, sus capturas, lupas, toques
y rótulos con sus segundos. El plan se arma desde los tiempos de la voz (`momentoDe`): si la voz cambia, todo cae en
su sitio.

## Cómo se hace otro tutorial (receta)

1. **Guion por bloques** (un bloque por paso). Se escribe en `scripts/voz.mts` del encargo; cada bloque se graba
   aparte con la voz del banco y se guarda por su texto: cambiar un bloque cuesta solo ese bloque (1 a 3 ¢).
2. **Capturas** en `public/pantallas/` a 780×1600 (`scripts/preparar-capturas.py`: las recorta, tapa datos personales
   y marca los HUECOS de las pantallas que faltan). Antes de usar una, se mira que no traiga datos de una persona real.
3. **Escenas**: una por bloque (`scripts/escenas.ts`). Las que tienen al personaje salen de su hoja. Se mira cada una
   antes de seguir: nada de figuras de juguete con cabeza amarilla ni letras inventadas (se vuelve a pedir, o la cámara
   la deja fuera con `limites`).
4. **Pantallas verdes y recortes** (gratis): `python3 -I estacion/herramientas/pantalla-verde.py <escena.png> <id>-pantalla.json <id>-frente.png`
   y `swift estacion/herramientas/quitar-fondo.swift <escena.png> <id>-sujeto.png`.
5. **Plan**: `scripts/plan.mts` (desde `estacion/`: `npx tsx ../encargos/<encargo>/scripts/plan.mts`). Imprime el
   ritmo (ningún tramo de más de 5 s) y los huecos que quedan.
6. **Revisar y armar** (desde `estacion/`):
   - `npx tsx src/tutorial-bloques.ts <carpeta> cuadros 0,12,30` → cuadros sueltos para mirar;
   - `npx tsx src/tutorial-bloques.ts <carpeta> zona` → tiene que decir «Zona segura: bien»;
   - `npx tsx src/tutorial-bloques.ts <carpeta> video` → el video mudo (unos 25 min para 95 s);
   - `npx tsx src/tutorial-bloques.ts <carpeta> mezclar` → las dos entregas (la de publicar y la «(WhatsApp)»);
   - `npx tsx src/tutorial-bloques.ts <carpeta> hoja <mp4> 2` y `… control <mp4>` → hoja de cuadros y
     transcripción de control (que diga el guion, en orden).

## Cuánto cuesta un video

| Qué                                                                        | Cuánto                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Hoja del personaje (una vez por personaje; se reutiliza en los siguientes) | 3 ¢                                                         |
| Escenas de bloques (12 a 14, a 3 ¢)                                        | 36 a 42 ¢                                                   |
| Voz por bloques (unos 1.350 caracteres a 0,10 $ el millar)                 | 13 a 14 ¢                                                   |
| Transcripción de control                                                   | menos de 1 ¢                                                |
| Teléfono 3D, dedo, transiciones, cámara, recortes, música y efectos        | 0                                                           |
| **Total por video**                                                        | **unos 50 a 60 ¢** (por debajo del dólar que pidió Richard) |

Si se reutilizan escenas de un tutorial a otro (la plaza, el camino, la oficina), baja a 25–35 ¢.

## Lo que viene después (propuesto, no hecho)

- **Mundo 3D completo en código** (`@remotion/three`): el conductor y la moto hechos de cajas, para que cada video
  cueste solo la voz. Ya está la base (el teléfono y el dedo son 3D de verdad); lo que falta es modelar los personajes
  y los escenarios. Hasta que se vea igual de bien que las escenas de Seedream, se queda la mezcla.
- **En el panel**: un tipo de video «Tutorial en bloques» en el Director, que pida las capturas y el guion por pasos,
  muestre el precio en la tarjeta (C-DIRECTOR-1) y mande el plan a la Estación. Es grande: va en su propia meta.

## Candado C-BLOQUES-1

- `nombresProhibidosEn` / `asegurarSinJuegos`: ningún pedido de imagen puede nombrar un juego ni una marca de bloques
  (revienta antes de gastar). Probado en rojo quitando «lego» de la lista.
- `homografia`: cada esquina de la captura cae en su esquina de la pantalla.
- `margenPalabra`: la palabra que crece no se come el espacio (Ica, «DEDICIEMBRE»). Probado en rojo con 12 px.
- `revisarRitmo`, `efectosDelPlan`, `momentoDe`, `cambiosDelPlan`: el ritmo, los efectos y los tiempos atados a la voz.
- Prueba: `pruebas/bloques.test.ts`. Además, en cada video: el candado de la zona segura (`tutorial-bloques.ts zona`).
