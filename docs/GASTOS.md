# Gastos: cuánto cuesta cada video y qué servicio cobra

Pantalla del panel: menú «Gastos» (grupo de la casa, junto a Estación). Se pidió el 31 de octubre de 2026,
cuando Richard vio en su tarjeta Discover varios cobros de 10 dólares a nombre de «FAL FEATURES LABELS».

## Qué es cada cobro de la tarjeta

| Lo que dice el banco | Qué es                                                                                           | Cómo cobra                                               |
| -------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| FAL FEATURES LABELS  | fal.ai (la empresa se llama Features & Labels): imágenes, la presentadora que habla, animaciones | Prepago: recarga sola de 10 dólares cuando el saldo baja |
| ELEVENLABS.IO        | Las voces                                                                                        | El plan mensual                                          |
| CLOUDFLARE           | Infraestructura                                                                                  | Mensual                                                  |

**Ojo:** la cuenta de fal.ai la comparten Escenia, Beellon y Losupe (y pruebas sueltas). Cada recarga de 10
dólares es de la cuenta entera, no de un video. Para separar cuánto gasta cada proyecto hace falta una
clave de fal.ai propia por proyecto (pendiente: Richard entra a fal.ai en Chrome y desde ahí se crea la
clave «Escenia» y se lee el uso por clave).

## Qué muestra la pantalla

- **El total del mes** gastado por el panel y cuántos videos salieron (guiones con video, anuncios y
  videos del Director).
- **Por servicio**: fal.ai, ElevenLabs y Claude, con cuántas llamadas.
- **Por pieza**: cada guion, anuncio, proyecto del Director o grabación, con lo que puso cada servicio.
- **Por día**.
- Flechas para ir al mes anterior y al siguiente.

## De dónde salen los números

Del libro `gastos` de la base del panel (`fecha`, `servicio`, `detalle`, `costo_usd`). La pieza se deduce del
`detalle` con `piezaDelGasto` (`src/lib/gastos-mes.ts`):

| Detalle anotado                    | Pieza                                 |
| ---------------------------------- | ------------------------------------- |
| `voz guion 13`, `imagen guion 4 …` | Guion N                               |
| `anuncio 1: …`                     | Anuncio N                             |
| `director, trabajo 1: …`           | Director · video N                    |
| `director: encargo 7`              | Director · proyecto N                 |
| `transcripción grabación 1`        | Grabación N                           |
| `plan de anuncio: …`               | Planes de anuncios                    |
| `guion: <título>`                  | Guiones escritos por la IA            |
| `imagen escena N`                  | Imágenes de escenas sin guion anotado |

Si se agrega un gasto nuevo con otro formato de `detalle`, se suma su caso aquí y en la prueba
`pruebas/gastos-mes.test.ts`, o caerá en «Otros».

**Lo que NO está:** el trabajo hecho a mano desde la Mac con scripts sueltos (prototipos de monigotes con
Kling, looks de Maggie con Seedream, anuncios hechos a mano). Esos gastos no pasaron por el libro.
