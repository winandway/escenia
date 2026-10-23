# Locución sobre un video ya editado

Richard, 23 oct 2026, con el video de quince años de una niña: «ya está editado, no hay que editar el
video, solo hay que grabarle la voz. Y la voz que le va a grabar es la voz mía… que la voz no vaya tan
rápido, que respete las comas… un pianito de fondo bien suavecito».

## Qué hace

1. Graba cada párrafo con la voz elegida (la de Richard por defecto) con ElevenLabs Multilingual v2,
   el modelo con el que se entrenó su clon (con Eleven v3 la voz de un clon profesional pierde
   parecido, según ElevenLabs). Cada párrafo lleva el texto de sus vecinos para que la entonación siga.
   Lo ya grabado no se vuelve a pagar (10 centavos por cada mil letras).
2. Si la voz, leída con calma, no cabe en el video, **estira el video parejo** (cada foto dura un poco
   más; las transiciones se suavizan mezclando cuadros) en vez de acelerar la voz. Hasta un 35 %.
3. Pone cada párrafo en su sitio: el primero en `inicio_ms`, y lo que sobra se reparte parejo entre las
   pausas (entre `pausa_min_ms` y `pausa_max_ms`). Un párrafo con `desde_ms` no entra antes de ese
   momento del video original (por ejemplo, «¡Felices quince años!» sobre la tarjeta final).
4. Debajo va la música (por defecto el piano suave propio del motor,
   `estacion/recursos/musica/piano-ballad-soft-gentle-emotional.mp3`, hecho nota por nota con
   `node scripts/musica-propia.mjs`): entra y sale con desvanecido y baja sola cuando habla la voz.
5. Deja el video con la voz (la imagen sin volver a codificar si no hubo que estirarla) y una versión
   liviana a 720p para WhatsApp.

## Cómo se usa

El material de estos encargos es de personas reales (fotos, nombres, fechas): va en
`encargos/<nombre>/`, que git ignora, nunca en el repositorio público.

`encargos/<nombre>/plan.json`:

| Campo                                            | Para qué                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `video`                                          | El video ya editado.                                                                      |
| `voz`, `modelo`                                  | `richard` y `eleven_multilingual_v2` por defecto.                                         |
| `ajustes`                                        | `estabilidad` (0,38), `parecido` (0,85), `estilo` (0,35), `velocidad` (0,95 = con calma). |
| `musica`, `musica_volumen`                       | La pista de fondo y su volumen cuando la voz calla (0,3).                                 |
| `inicio_ms`, `margen_final_ms`                   | Cuándo empieza a hablar y cuánto aire queda al final.                                     |
| `partes`                                         | Un párrafo por pieza; `desde_ms` opcional (hora del video original).                      |
| `estirar_video`, `pausa_ideal_ms`, `estirar_max` | Si se estira el video cuando la voz no cabe.                                              |
| `salida`                                         | El nombre del video con voz.                                                              |

Desde `estacion/`:

- `npx tsx src/locucion.ts ../encargos/<nombre>/plan.json --muestra 1`: graba solo el párrafo 1 y dice
  cuántas letras por segundo lee (para calcular si cabe antes de grabar todo).
- `npx tsx src/locucion.ts ../encargos/<nombre>/plan.json`: todo.

Las pruebas están en `pruebas/locucion.test.ts` (reparto de pausas, hora fija, estiramiento con tope).

## Primer encargo: los quince años de Naylibeth (23 oct 2026)

Video de 3 min 6 s con fotos de la niña desde bebé (una cada 2,5 s). El texto de Richard (2.502 letras,
nueve párrafos) leído con calma (velocidad 0,95, unas 12 letras por segundo) dura 3 min 23 s de voz.
El video se estiró parejo ×1,174 (queda en 3 min 38 s), con 1,3 s de pausa entre párrafos, y
«¡Felices quince años!» entra cuando aparece del todo la tarjeta final del video (segundo 180,6 del
original). Voz: 22 centavos.

Lo que se aprendió: el estiramiento tiene que contar con la hora fija del último párrafo (la primera
mezcla dejó todas las pausas en medio segundo); y el piano a 0,3 sonaba casi tan fuerte como la voz en
las pausas: quedó en 0,09.
