# Portadas de impacto: las miniaturas que se llevan el clic

> Richard, 2 de octubre de 2026: _«dame una miniatura llamativa, algo que la
> gente dé clic cuando la vea»_. Y después: _«faltan las miniaturas de los
> videos verticales, que estén al lado de su título… sin las miniaturas va a
> ser difícil que esos videos tengan vida… es una de las partes más
> importantes para nosotros en el canal»_.

Cada video sale con **una miniatura por pieza**: una horizontal (1280 × 720)
para el video largo y una vertical (1080 × 1920) para cada Short. Las arma la
Estación sola, al terminar el video, sin gastar. En el panel, cada una aparece
**al lado del título de su pieza**, con su botón «Descargar miniatura».

## Qué dice YouTube (leído en su ayuda oficial el 2 oct 2026)

- **Un Short sí puede llevar una imagen propia de miniatura**, pero solo se
  sube desde **YouTube Studio en la computadora** (en el detalle del Short,
  «Subir archivo»). Desde el teléfono solo se puede elegir un cuadro del video.
- Medidas para Shorts: proporción 9:16, alto mínimo de 640 puntos. Peso máximo
  desde la computadora: 50 MB. Las nuestras salen de 1080 × 1920 y pesan
  alrededor de 1 MB.
- Fuentes: https://support.google.com/youtube/answer/72431 (miniaturas) y
  https://support.google.com/youtube/answer/10343433 (crear Shorts).

## La receta (tres cosas que se leen en un segundo y en chiquito)

1. **La cara**, recortada de su foto, grande, con borde blanco.
2. **Una cifra o una palabra enorme** en amarillo, con lo que cuenta debajo
   («15 / NOMINACIONES», «NUNCA / HA GANADO»).
3. **El remate** en una caja roja inclinada («CERO PREMIOS»), con la palabra
   del golpe en amarillo.

Arriba va una etiqueta con el nombre de quien se ve. En la horizontal, el texto
va a la izquierda y la persona a la derecha. En la vertical, todo el texto va
arriba y la persona debajo: nada le tapa la cara.

Reglas: cinco o seis palabras en total; nada de frases; el cero se escribe
«CERO» (el número se confunde con la letra O); lo que dice la miniatura tiene
que ser **algo que esa pieza cuenta**. Cada Short lleva un texto distinto.

## El diseño de hoy (rehecho el 5 oct 2026)

Richard, al ver las dos miniaturas de su primer video con el formato Presentador
(solo letras sobre rayos morados, y él no aparecía): _«tienen un fondo feo… no
es un diseño decente, no es serio, no es de enganche, no es para un viral. La
miniatura conforma el 60 o 70 % de que la gente le dé clic»_.

- **El fondo** ya no son rayos sobre morado. Es casi negro, con un **panel
  inclinado de color** detrás de la persona (azul eléctrico en Full Código, rojo
  en Caprichoso TV), una trama de puntos, el filo del panel en el color de
  acento y una **luz fuerte** detrás de la cabeza. Sin persona, el panel y la
  luz siguen ahí: nunca queda un fondo vacío.
- **En un video con presentador, la persona de la portada es Richard**, sacado
  de su propia grabación ya sin fondo. Se miran catorce momentos de la pieza y
  se elige el de **gesto más abierto** (una mano levantada, un dedo señalando)
  entre los que tienen su cara a la vista; el Short no repite el momento del
  video largo. Para elegirlo a mano: `cuadroSeg` (los segundos) en
  `portadas.json`.
- **Una palabra TACHADA**: en la línea del medio, la palabra entre virgulillas
  sale con una raya roja encima («LA IA ~GRATIS~»). Sirve cuando el golpe es que
  algo se termina, se prohíbe o se pierde.
- **Las marcas en pastillas**: hasta tres nombres que la gente reconoce
  («ChatGPT», «Gemini») en pastillas blancas debajo del titular. La IA las manda
  en `marcas`; a mano, `chips` en `portadas.json`.
- **El texto tiene que sonar como lo diría una persona.** El primer intento de
  la IA fue «CERO / IA GRATIS», que no se entiende; ahora se le pide un titular
  que se lea de corrido («SE ACABÓ / LA IA GRATIS / PAGAS O VES ANUNCIOS») y lo
  grande puede ser dos palabras cortas.
- Los colores por canal están en `COLORES` (`estacion/src/portadas.ts`); el
  dibujo, en `estacion/src/remotion/Portada.tsx`. Candado C-PORTADA-2.

## Cómo salen solas

1. Al terminar un video, el panel escribe los textos de YouTube. Con ellos
   escribe el texto de cada miniatura (`portada` en la publicación del guion:
   `grande`, `linea`, `remate` y `persona`, la del largo y la de cada Short).
2. La Estación recibe esos textos, los guarda en `out/t<trabajo>/portadas.json`
   y arma las miniaturas (`estacion/src/portadas.ts`):
   - Busca la foto de `persona` entre las fotos **con rótulo** del video (las
     únicas de las que se sabe de quién son): primero en las escenas de esa
     pieza, después en el resto del video, y si no, la del protagonista.
     **Nunca pone a otra persona.**
   - Recorta a la persona (`estacion/herramientas/recortar.swift`, el recorte
     de sujeto de macOS) y mira las caras del recorte. Solo sirve si hay **una
     sola cara** (una foto de grupo no dice quién es), si es un recorte de
     verdad (una carátula de disco entera se descarta) y si la cara no queda
     borrosa.
   - Coloca la cara siempre del mismo tamaño y en el mismo sitio, y el cuerpo
     hasta el borde de abajo (`encuadre` en `compartido/portada.ts`).
   - Si no hay persona que recortar (un video de tecnología sin fotos con
     nombre), la miniatura va con una foto del video de fondo, oscurecida.
   - Prefiere no repetir la misma foto en dos miniaturas del mismo video.
3. Las sube al panel como la miniatura de cada pieza.

Full Código lleva sus colores (morado y verde); los demás canales, rojo y amarillo.

## Volver a armarlas a mano

Todas, con los textos guardados (se pueden editar en `out/t<trabajo>/portadas.json`):

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/portadas.ts 27 --guion 8
```

Solo unas piezas: `--solo short-2,short-4`. Sin `--guion` no se suben: quedan
en `out/t27/portada-<pieza>.png` para mirarlas.

Una sola, eligiendo la foto y cada palabra (así se hizo la del video largo de
Prince Royce, con el trofeo tachado):

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/portada.ts 27 --foto web-b0f0de3fdf0554ad.jpg --etiqueta "PRINCE ROYCE" --cifra 15 --linea NOMINACIONES --remate "*CERO* PREMIOS" --objeto web-3ca740db57aa9151.jpg --tachado --mostrar 0.62 --guion 8
```

| Opción                      | Para qué                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `--pieza short-2`           | La miniatura vertical de ese Short (sin esto, la horizontal del video largo)               |
| `--foto`                    | La foto de la persona (se recorta sola, sin fondo)                                         |
| `--etiqueta`                | El nombre, arriba, en chico                                                                |
| `--cifra` y `--linea`       | Lo enorme y lo que cuenta                                                                  |
| `--remate`                  | La caja roja. La palabra entre asteriscos sale en amarillo                                 |
| `--objeto` y `--tachado`    | Un objeto en un disco claro, con la señal de prohibido (solo en la horizontal)             |
| `--mostrar 0.62`            | Enseña solo la parte de arriba del objeto (la base de aquel trofeo traía la placa de otro) |
| `--acercar 1.2`             | Agranda a la persona                                                                       |
| `--color`, `--color-oscuro` | El fondo (por defecto, rojo sobre casi negro)                                              |
| `--acento`                  | El color de lo enorme (por defecto, amarillo)                                              |
| `--guion 8`                 | La sube al panel                                                                           |

## Qué revisar antes de avisar

Se miran TODAS (una hoja con las verticales juntas ayuda):

- La palabra tachada o la fuerte tiene que estar en la miniatura: si la IA escribe una
  línea más larga que el tope, el recorte quita el relleno, nunca esa palabra; y si no
  cabe, la línea va entera y más chica (candado C-PORTADA-3).
- La foto es de quien dice la etiqueta. Sale de una foto con rótulo del video,
  que ya se cotejó con su fuente (C-IMAGEN-6): la IA no reconoce a nadie por la cara.
- El recorte no trae letras, logos ni el nombre de otra persona.
- Las tres líneas se leen seguidas y dicen algo que esa pieza cuenta.
- Nada tapa la cara y se lee en chiquito.

## Dónde las encuentra Richard

En el panel, en la página del guion, sección **Para YouTube**: al lado del
título del video y del título de cada Short está su miniatura, con el botón
**Descargar miniatura**. En el calendario, cada pieza muestra la suya (un Short
sin miniatura propia muestra la del video largo; el largo nunca muestra la de
un Short).

Qué miniatura vale para cada pieza lo decide `miniaturasPorPieza`
(`compartido/portada.ts`): la portada de impacto más nueva de esa pieza; si no
hay, la miniatura automática (el título sobre una foto), que sigue saliendo en
cada producción porque es la que usa el cierre de los Shorts.

## Las piezas

- `compartido/portada.ts`: el texto, qué foto sirve, dónde va la cara, cuál
  miniatura es de cada pieza. Pruebas en `pruebas/portada.test.ts`.
- `estacion/src/remotion/Portada.tsx`: el dibujo (composiciones `Portada` y
  `PortadaVertical`).
- `estacion/src/portadas.ts`: las arma todas. `estacion/src/portada.ts`: una a mano.
- `src/lib/publicacion.ts`: la IA escribe el texto de cada una.
- Candado: C-PORTADA-1 en `docs/CANDADOS.md`.
