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
│  ┌────────────────────────┐  │  ← papel viejo, un poco torcido: el boceto a lápiz
│  │   (boceto del verso)   │  │    de lo que dice ESE verso; cambia con cada verso,
│  └────────────────────────┘  │    «dibujándose» de izquierda a derecha
│                              │
│         (su cara)            │  ← él, entero, con su fondo real (la puerta, la calle)
│                              │
│   Voy recorriendo [caminos]  │  ← la letra sobre su pecho, palabra por palabra;
│                              │    la que canta salta en amarillo
│                              │
└──────────────────────────────┘
```

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
