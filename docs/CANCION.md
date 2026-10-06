# Formato Canción: Richard canta, y arriba un dibujo a lápiz sigue la letra

> Pedido por Richard el 6 de octubre de 2026, con su canción «Voy recorriendo
> caminos» recién grabada en la puerta de su casa. Sus palabras: _«quiero cantar la
> canción pero en la parte de arriba… una especie de video así como dibujadito con
> lápiz donde yo voy cantando… respetar el lugar de fondo… la idea es la
> naturalidad, hay mucha AI, tenemos que mezclar: mi voz en vivo, la música de
> fondo, el lugar, el sonido en vivo y original, con un video sobre mi cabeza y en
> mi pecho la letra»_.

## Cómo se ve

```
┌──────────────────────────────┐
│██████████████████████████████│  ← papel viejo de borde a borde (30 % de alto): el boceto
│██████ (boceto del verso) ████│    a lápiz de lo que dice ESE verso; cambia con cada
│██████████████████████████████│    verso, «dibujándose» de izquierda a derecha
│                              │
│         (su cara)            │  ← él, entero, con su fondo real (la puerta, la calle)
│                              │
│   Voy recorriendo [caminos]  │  ← la letra sobre su pecho, palabra por palabra;
│                              │    la que canta salta en amarillo
│                              │
└──────────────────────────────┘
```

- **El papel va de borde a borde arriba, bien cuadrado** (el 30 % de alto), y **el video se baja**
  justo hasta que su cabeza queda debajo del papel: se pierde un poco del cuerpo por abajo y
  nunca se tapa la cara. Cuánto bajarlo lo decide el detector de caras de la Mac mirando seis
  cuadros de la toma (`caraDeLaToma`, `bajadaDelVideo`). La letra va debajo del mentón, sobre el
  pecho, grande y en mayúsculas como en los demás verticales (`arribaDeLaLetra`). Lo pidió
  Richard el 6 oct 2026 al ver el primer video: el papel chico y torcido no le gustó.
- **Vertical** (1080×1920), para Shorts, Reels y TikTok. No sale en 16:9 ni se parte en Shorts.
- **Su audio tal cual**: la voz en vivo, el ambiente y, si cantó con la pista sonando en un
  parlante, la pista. El motor **no** pone música ni efectos de corte.
- **Su fondo se queda**: no se busca croma ni se recorta nada. Solo se corta lo mudo de antes
  del primer verso y lo de después del último (él acercándose a la cámara).
- Los primeros segundos, en el papel va el **nombre de la canción** escrito a mano; los últimos,
  **Caprichoso TV · Suscríbete**, también a mano, en una esquina del papel.

## Cómo se usa (dos cosas)

1. Menú **Grabaciones** → subir el video, poner **el nombre de la canción** en «De qué hablas», elegir
   el formato **Canción** y el canal **Caprichoso TV**. Nada más.
2. La Estación lo toma sola: transcribe la letra (ElevenLabs Scribe, 22 centavos la hora), la IA
   arma un plan con **un boceto por verso** (Claude, unos 5 centavos), se dibujan los bocetos
   (Seedream en fal.ai, 3 centavos cada uno: una canción de 3 minutos, unos 25 bocetos, 75
   centavos) y se arma el video. Queda en la página del guion, para descargar.

Desde la Mac, sin navegador:

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/subir-grabacion.ts /ruta/al/video.MOV --tema "Voy recorriendo caminos" --formato cancion --canal caprichoso-tv
```

## Ideas para que la gente se enganche (las que se discutieron el 6 oct 2026)

- **El dibujo cuenta la letra al pie de la letra.** «Caminos que no tienen final» es la carretera
  vista desde el parabrisas; «ella a mi lado» son dos muñequitos en el carro; «ni casas de lujo
  ni carro veloz» es una mansión y un carro tachados y un corazón chiquito; «te dejo volar» es un
  muñequito soltando un pajarito. La gente se queda para ver qué dibuja el siguiente verso.
- **Letra que se canta sola.** La palabra que suena salta en amarillo: el video se entiende sin
  sonido (así se mira la mitad de los Shorts) y la gente canta encima.
- **El gancho es el primer verso, no una portada.** Él arranca cantando desde el primer cuadro;
  el título va en el papel, chiquito, sin tapar nada.
- **Un solo plano suyo, real.** Nada de cortes ni zoom: la naturalidad es lo que diferencia este
  video de los hechos con IA. Lo «producido» está solo en el papel.
- **El coro como clímax.** Cada repetición del coro lleva un boceto distinto (otro ángulo, otro
  gesto): el que ya vio el video una vez vuelve a mirar.
- **Cerrar con el canal escrito a mano**, como una firma, no con una pantalla negra.

## Lo que Richard corrigió al ver el primer video (6 oct 2026) y quedó como regla

- **Nada de alas.** «Te dejo volar» salió como un angelito, como si ella se hubiera muerto. Irse,
  dejar ir, volar o decir adiós se dibuja con una maleta, un avión, un helicóptero, un bus o un
  carro alejándose; nunca alas, ángeles ni fantasmas. (Regla en el plan.)
- **Su gorra.** El muñequito que lo representa a él lleva, en más o menos una de cada dos escenas,
  la gorra con la bandera de Estados Unidos. (Regla en el plan.)
- **El aviso de suscribirse.** La última escena deja la mitad derecha del papel en blanco, y ahí
  va, dibujado a mano, «¿Te gustó?», el botón «Suscríbete» con su campanita, el nombre del canal
  y una flecha (`AvisoSuscribete` en la plantilla).
- **Dos manos.** Un boceto salió con tres manos (una en el pecho, una abierta y otra suelta). El plan
  pide decir dónde va cada mano y «exactly two hands». Si se cuela una de más, se corrige el prompt
  de esa escena en el guion y se vuelve a producir: los demás bocetos no cambian (están guardados
  por prompt).
- **Movimiento.** Un boceto que habla de un camino o de un carro «avanza»: la cámara entra hacia
  el fondo del dibujo durante todo el verso, con un balanceo chiquito, como si se fuera por la
  carretera (`movimiento: "avance"`). Los demás, un acercamiento lento. Que el muñequito o el carro
  se muevan DE VERDAD necesita un modelo de video (ver abajo).

## Próximo plan (lo dejó Richard el 6 oct 2026, para que no se olvide)

1. **Escenas animadas de verdad.** Al armar el video, dos o tres escenas cortas (las más
   importantes: el coro, por ejemplo) pasan por Wan 2.2 en fal.ai (quince centavos por clip de
   cinco segundos; autorizado ese día con ese modelo y esa cantidad). Tope de 3 clips por video en
   el código. Los demás bocetos siguen con movimiento de cámara.
2. **Karaoke.** Suena su pista (la de Sonidos), la letra va saliendo palabra por palabra y arriba
   corre el video de bocetos, para que la gente cante encima. Él no sale en cámara.

## Animar los bocetos de verdad (precios leídos el 6 oct 2026)

Hacer que el carro recorra el camino o que el muñequito camine es pasar el boceto por un modelo
de imagen a video. Precios leídos en fal.ai el 6 oct 2026:

| Modelo                       | Precio                                   | Qué da                        |
| ---------------------------- | ---------------------------------------- | ----------------------------- |
| Wan 2.2 (5B), imagen a video | 15 centavos por video                    | hasta 5 s, 720p, 24 cuadros/s |
| LTX Video 13B destilado      | 4 centavos por segundo (8 con detalle)   | 5 s ≈ 20 centavos             |
| Kling 2.5 Turbo estándar     | 21 centavos por 5 s, 4,2 por segundo más | el de mejor movimiento        |

La regla global manda: un modelo que pasa de 5 centavos por pieza solo se enciende con la
autorización escrita de Richard y con su tope. El 6 oct 2026 autorizó Wan 2.2 a 15 centavos
para dos o tres escenas por canción (las más importantes), con tope de 3 clips por video en el
código y dentro del tope diario. Hasta que se construya, los bocetos siguen con movimiento de cámara.

## Lo que pasa por dentro

```
panel /grabaciones (formato cancion) ──▶ tabla `grabaciones`
  Estación: baja el video ──▶ saca el audio ──▶ transcribe (la letra, con tiempos)
            ──▶ pide el plan al panel: una escena por verso, `visual.tipo` «ia» con la escena en inglés
  panel: la IA arma el plan ──▶ guion APROBADO + trabajo
  Estación: corta lo mudo (voz e imagen igual) ──▶ dibuja un boceto por verso (promptDeBoceto)
            ──▶ composición «Cancion» (Remotion, 1080×1920) ──▶ sube el video 9:16
```

| Qué                                                  | Dónde                                           |
| ---------------------------------------------------- | ----------------------------------------------- |
| El formato en la lista y su nombre                   | `compartido/tematicas/index.ts` (`cancion`)     |
| El estilo a lápiz del boceto y los momentos (entero) | `compartido/cancion.ts`                         |
| Las reglas que se le dan a la IA para el plan        | `src/lib/plan-grabacion.ts`                     |
| Su imagen entera, sin croma, a 1920 de alto          | `estacion/src/grabaciones.ts` (`cancion`)       |
| Sin música, sin efectos, sin clips; render vertical  | `estacion/src/produccion.ts` (`cancion`)        |
| La plantilla (papel, bocetos, letra)                 | `estacion/src/remotion/Cancion.tsx`             |
| El boceto con el estilo a lápiz                      | `estacion/src/imagenes.ts` (`boceto`)           |
| Prueba                                               | `pruebas/formato-cancion.test.ts` (C-CANCION-1) |

## Lo que falta (en orden)

- **La pista debajo de su voz, alineada.** Si cantó con la pista sonando, ya va en su audio. Poner
  la pista limpia alineada con su canto (cruzando el audio) es la siguiente pieza.
- **Elegir un trozo.** Hoy sale la toma completa; falta decir «de tal verso a tal verso» para un
  Short de un minuto.
- **La letra escrita por él.** Hoy la letra sale de la transcripción (muy buena en la primera
  prueba, pero puede equivocar una palabra); una casilla para pegar la letra y alinearla.
- Un boceto que se **anime** (trazos que aparecen) en vez del barrido.
