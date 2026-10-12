# Monigotes animados: videos de intriga con dibujos que se mueven

Formato pedido por Richard el 11 oct 2026, con la referencia de un reel viral de «señales de que le
gustas» (monigotes de línea blanca sobre negro, un brillo de color, título en rojo y blanco,
subtítulo con la palabra clave en una caja roja, y los dibujos en movimiento; 268 mil me gusta).
Antes ya hacíamos videos con imágenes quietas que se mueven con la cámara; aquí los dibujos se
animan de verdad.

## Las piezas

| Pieza                           | Qué hace                                                                                                                                                                | Costo                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `estacion/src/monigote.ts`      | Dibuja la escena en el estilo fijo (`promptDeMonigote`): línea blanca fina sobre negro, caras simples y expresivas, un solo brillo de color en lo importante, sin texto | 3 ¢ por dibujo (Seedream, `imagenLibre`, sin el estilo de foto realista del motor) |
| `estacion/src/animar-imagen.ts` | Anima el dibujo 5 segundos con Wan 2.2 (5B): vertical 9:16, 720p, 24 cuadros por segundo                                                                                | 15 ¢ por clip                                                                      |
| Candado                         | `ANIMACION_PERMITIDA` en `compartido/modelos.ts`: solo Wan 2.2 5B, el que autorizó Richard el 6 oct 2026 a 15 centavos                                                  | —                                                                                  |

Carpeta de trabajo: `monigotes/` (fuera de git). Cada pedido a fal.ai queda en `pedidos-fal.jsonl` y
su costo en `gastos.txt`.

## Primera prueba (11 oct 2026)

Tema elegido por Richard: «Tres canciones que no debes escuchar después de una ruptura», con tres
canciones de Diomedes Díaz verificadas con fuentes (Publimetro y Telemedellín): «Así me hizo Dios»,
«Sin medir distancias» y «Amarte más no pude», con 5 segundos de cada una. Guion en
`monigotes/prueba-ruptura/guion.txt`, esperando su visto bueno antes de generar la voz.

- Dibujo de prueba `escena-1-cama.png` (3 ¢): el hombre triste en la cama con el celular, la foto
  de pareja brillando en rojo y el radio en la mesa. Queda en el estilo de la referencia.
- Clip `clip-1-cama.mp4` (15 ¢): baja la cabeza, estira la mano hacia el radio, la foto late en rojo.
  En el último segundo el celular desaparece de su mano: se corta el clip un poco antes.
- Un video completo de unos 50 segundos lleva cinco escenas: unos 90 centavos en dibujos y clips.

**Ojo con la música ajena:** 5 segundos de una canción comercial no la hacen libre. Content ID de
YouTube suele reclamar fragmentos cortos: el Short puede quedar sin ganancias o bloqueado en algunos
países. No hay una cantidad de segundos «segura».

## El video completo (11 oct 2026): pedido de Richard

Richard aprobó el guion y pidió el video completo **sin las canciones**: él pega los tres pedacitos
en su editor. «No importa que se gaste un poquito más de crédito, pero hágalo bien.» Los defectos
de la prueba con Wan (el celular desaparecía, las lágrimas se pegaban a la cama) llevaron a:

- **Kling 2.5 Turbo Pro** (0,07 $/s, clips de 5 o 10 s; agregado a `ANIMACION_PERMITIDA`), que
  sigue mejor las instrucciones.
- **Movimientos sencillos**: nada de lágrimas ni objetos nuevos; «el celular nunca sale de su mano».
- **Cada clip se corta 0,15 s antes del final**, donde los modelos pierden objetos.
- **Escenas largas en dos clips encadenados**: el segundo arranca desde el último cuadro del primero.

La herramienta de punta a punta es `estacion/src/monigotes.ts` con un plan JSON
(`monigotes/<proyecto>/plan.json`: título en dos líneas, marca, y por parte el texto, el dibujo, el
brillo, el movimiento y, si va, la canción). Pasos: `--paso voz` (la narración con un silencio de 5 s
después de cada canción), `--paso dibujos`, `--paso animar` (`--parte N` para repetir una) y
`--paso armar` (Remotion, composición `Monigotes`: título arriba en rojo y blanco con la letra Anton,
subtítulos de hasta 3 palabras con la más larga en caja roja, el nombre de la canción en cada hueco y
la marca del canal abajo en rojo). Pruebas: `pruebas/monigotes.test.ts`.

Voz de esta prueba: 68,5 s, con los huecos de canción en 21,8–27,1 s, 37,0–42,4 s y 56,9–62,3 s.
Se corrigió un dibujo: el reloj digital marcaba «0:00» y el texto dice «las dos de la mañana»; se
cambió por un reloj de agujas.

### Resultado (11 oct 2026)

`monigotes/prueba-ruptura/tres-canciones-prohibidas.mp4`: 68,5 s, 1080×1920, con la miniatura
`portada-tres-canciones.png` (portada de impacto con `avatar-portada.ts --foto-entera`) y los
textos de YouTube en `textos-youtube.md`. Sin las canciones: los huecos de 5 s quedan en 21,8–27,1 s,
37,0–42,4 s y 56,9–62,3 s, con el nombre de cada canción en pantalla.

Lo que se repitió por defectos, mirado cuadro por cuadro: la escena 1 (le salía del celular una
burbuja roja con letras sin sentido), la escena 2 (las «notas musicales» salían como un enjambre de
puntitos; en la versión buena quedan unas pocas notas que flotan hacia la foto, se aceptó porque la
escena trata de una canción) y el dibujo 3 (reloj digital con «0:00»). Y en el armado: el título se
partía en tres líneas (`tamanoDeLinea` lo deja en una por línea), el título y la marca se montaban
sobre el dibujo (sombra negra arriba y abajo), los subtítulos tapaban la cara del hombre en la cama
(se bajaron, cerca de la marca) y el final quedaba en negro (la composición dura justo lo que la voz
y la última escena no se apaga).

**Costo exacto:** el video, 5,44 $ (clips de Kling 5,25; dibujos 0,15; voz 0,04). Con lo que se
repitió y la prueba con Wan, 7,72 $ en total.

**Reglas que quedan:** en los movimientos nada de lágrimas, partículas ni objetos nuevos; decir que
el objeto que tiene en la mano no se suelta; si hay un radio en el dibujo, Kling tiende a ponerle
notas musicales; revisar cada clip cuadro por cuadro antes de armar.

## Lo que falta para el primer video

Hecho. Richard pega los tres pedacitos de canción en su editor y lo sube.

## Cómo le fue y la plantilla nueva (12 oct 2026)

El Short «3 canciones de Diomedes que NO debes poner después de una ruptura» (subido el 12 oct) llevaba
**1.132 vistas en 48 horas y 761 en la última hora** (captura de YouTube Studio de Richard), muy por
encima del resto del canal. Richard pegó en su editor un pedacito del video de cada canción, y vio
dos cosas que se arreglaron en la plantilla (`ZONA` en `Monigotes.tsx`, candado C-MONIGOTES-1):

- **La marca quedaba tapada** por el nombre del canal y el título que YouTube pone abajo en los Shorts.
  Ahora los subtítulos van en 1370 px y la marca en 1500 px: todo el texto por encima del 85 % del alto.
- **No había dónde poner el video de la canción.** Primero se probó un recuadro grande en el centro con el
  dibujo oscurecido, y Richard lo rechazó: «no le podemos quitar ese protagonismo al muñequito». Queda
  así: en cada hueco el dibujo sigue igual, sin oscurecer, y aparece un **recuadro 16:9 PEQUEÑO con
  borde rojo arriba a la izquierda, debajo del título: x 40, y 470, 400 × 225 px** (en un video de
  1080 × 1920), con el nombre del artista debajo. Richard pega ahí el video de la canción. El nombre de
  la canción va abajo, en el sitio de los subtítulos. Muestra:
  `monigotes/prueba-ruptura/muestra-recuadro-cancion.png`.

**Siguiente en la serie** (guion en `monigotes/rey-del-despecho/guion.txt`, esperando su visto bueno):
la misma fórmula con Darío Gómez, el Rey del Despecho: «Así se le canta al despecho», «La
corazonada» y «Corazón resentido» (temas verificados en La República).

## Cuántos subir y qué pide YouTube para pagar (12 oct 2026)

- **No hay una cifra oficial de cuántos Shorts subir.** Recomendación nuestra (opinión, no regla de
  YouTube): uno de este formato al día, a la misma hora, durante dos a cuatro semanas, más dos o tres
  videos de Richard en vivo por semana, y medir cada uno a las 48 horas.
- **Requisitos para ganar con anuncios por la vía de Shorts** (según AIR Media-Tech, Newscast Studio
  y PPC Land, que citan el Centro de Ayuda): 1.000 suscriptores y 10 millones de vistas de Shorts en
  los últimos 90 días; la otra vía es 1.000 suscriptores y 4.000 horas de videos largos en 12 meses.
  Desde febrero de 2027 subiría a 20 millones de vistas en 90 días (lo dijo un vicepresidente de
  YouTube; todavía no está en el texto oficial). Se confirma en la pestaña «Ganar» de YouTube Studio.
- **Costo:** 5,44 $ por video con Kling 2.5 Turbo Pro; uno al día son unos 165 $ al mes. Con Kling 2.5
  Turbo Standard (0,042 $/s) bajaría a unos 3,30 $ por video, pero hay que probar primero si la calidad
  aguanta.

## Segundo video: Darío Gómez, el Rey del Despecho (12 oct 2026)

`monigotes/rey-del-despecho/tres-canciones-prohibidas-dario-gomez.mp4` (71,4 s), miniatura
`portada-dario-gomez.png`, textos en `textos-youtube.md`. Ya con la plantilla nueva (recuadro pequeño
arriba a la izquierda). Huecos: 22,5 s, 39,2 s y 60,6 s. Gancho cambiado a pedido de Richard: «Y la
tercera te va a sorprender».

**Costo exacto:** el video, 5,47 $ (clips 5,25; dibujos 0,18; voz 0,04). Con todo lo que se repitió,
9,18 $.

Lo que salió mal y cómo se arregló (todo mirado cuadro por cuadro antes de armar):

- **Dibujo de la ventana:** la ventana con el hombre flotaba arriba a la izquierda (donde va el recuadro
  de la canción) y el poste parecía una llave. Regla nueva en `promptDeMonigote`: esquina de arriba a
  la izquierda vacía.
- **Escena del banco:** el hombre se volvía azul entero y le salían chispitas. Se repitió diciendo que
  «solo brilla la pantalla; él sigue siendo un dibujo blanco»; al final del segundo clip quedaban unas
  motas y se recortó el clip a 6 s (el armado lo estira un poco).
- **Escena de las flores, segunda mitad:** dos veces él agarró el ramo aunque la instrucción decía lo
  contrario (el clip arrancaba con su mano junto a las flores). Se cambió la idea: un dibujo nuevo con
  ella sola con el ramo y él alejándose de espaldas. La primera versión de ese dibujo la puso tan abajo
  que los subtítulos le tapaban la cara. Regla nueva: las caras van en la franja del medio (entre 35 %
  y 60 % del alto), nunca en el tercio de abajo.
- **El nombre largo de una canción** se partía en dos líneas y pisaba la marca: `tamanoDeTarjeta` lo deja
  en una línea.
- **Error de la herramienta:** `animar-imagen.ts` ignoraba `--modelo` y animó una vez con Wan (15 ¢
  perdidos). Ahora usa el modelo pedido y revienta con uno desconocido antes de gastar.

**Lo que se aprende para la serie:** Kling tiende a poner partículas cerca de las luces (motas, chispas,
polillas); si el texto pide que dos personajes NO se toquen y el clip arranca con sus manos cerca, igual
se tocan: mejor un dibujo donde ya estén lejos.
