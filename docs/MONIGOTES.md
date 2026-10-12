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

## Lo que falta para el primer video

1. El visto bueno de Richard al guion.
2. Los tres fragmentos de 5 segundos de las canciones.
3. La voz, los cuatro dibujos que faltan y sus clips, y armarlo con títulos y subtítulos en el
   estilo de la referencia (rojo y blanco, caja roja en la palabra clave).
