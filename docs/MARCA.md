# La marca de cada canal en el video

> Pedido por Richard el 30 de septiembre de 2026, al arrancar el canal **Full
> Código** (@FullCodigo, «Tecnología, IA y desarrollo sin rodeos»): _«agrégale al
> video algo como el código, como el logo… ponerlo bien guapo»_.

Un canal **con marca** se reconoce en cualquier cuadro del video. Un canal sin
marca (hoy, Caprichoso TV) sale con el aspecto de siempre. El candado es
**C-MARCA-1** en [CANDADOS.md](CANDADOS.md).

## Qué cambia en un video con marca

| Pieza                | Sin marca                          | Con marca (Full Código)                                                          |
| -------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Colores              | Ámbar (u oro en documentales)      | El verde del logo, con morado de segundo color                                   |
| Letra de los títulos | Inter (o Playfair en documentales) | JetBrains Mono, letra de código                                                  |
| Título al arrancar   | Banda con borde                    | Ventana de terminal: se teclea con el cursor parpadeando                         |
| Rótulos              | Caja con borde a la izquierda      | Comentario de código: `// texto`                                                 |
| Recorte «periodico»  | Recorte de diario viejo            | Ventana `noticias.log` con la fecha real                                         |
| Logo                 | No hay                             | Fijo en una esquina todo el video (derecha arriba en 16:9, izquierda en Shorts)  |
| Marco                | No hay                             | Esquinas de visor y un tinte verde-morado muy suave                              |
| Barra de avance      | Un color                           | Degradado verde a morado                                                         |
| Cierre del largo     | Tarjeta del producto (si hay)      | Logo completo, botón «SUSCRÍBETE» y el @ del canal (5,5 s, con la música arriba) |
| Cierre de los Shorts | Cuadro con ▶                       | El logo del canal en redondo, con nombre y @                                     |
| Miniatura            | Nombre y gancho                    | Lo mismo con letra de código y el logo abajo a la derecha                        |

## Dónde vive cada cosa

- **Qué canal tiene qué marca:** `compartido/marcas.ts` (`MARCAS`, `marcaDeCanal`).
  Ahí están el lema y los dos colores, sacados del propio logo.
- **El logo:** `estacion/recursos/marcas/<carpeta>/logo.png`, cuadrado de 512 px
  con fondo casi negro. El de Full Código es el avatar del canal.
- **Quién decide que un video lleva marca:** la Estación
  (`estacion/src/estacion.ts`): mira la temática del trabajo, de ahí el canal, y
  de ahí la marca. `produccion.ts` copia el logo a la carpeta pública del
  trabajo (`marca/logo.png`) y lo mete en las props (`marca`).
- **Cómo se dibuja:** `estacion/src/remotion/Marca.tsx` (todas las piezas) y
  `TechExplainer.tsx` / `Miniatura.tsx`, que las usan solo si el video trae
  `marca`.
- **Nombre y @ del canal:** Ajustes del panel (`canal_ia_nombre`,
  `canal_ia_usuario`); si están vacíos, valen «Full Código» y «@FullCodigo»
  (`compartido/canales.ts`).

## Ver cómo queda sin producir un video

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/muestra-marca.ts
```

Deja 15 cuadros sueltos (título, rótulo, titular, noticia, frase, cierre, Shorts
y miniatura) en `estacion/out/muestra-marca/`. No gasta nada ni toca el panel.
Con una foto como argumento, la usa en la primera escena y en la miniatura.

## Ponerle marca a otro canal

1. Logo cuadrado en `estacion/recursos/marcas/<canal>/logo.png`.
2. Una entrada nueva en `MARCAS` (`compartido/marcas.ts`) con sus dos colores y
   su lema, y el canal apuntando a ella en `MARCA_DE_CANAL`.
3. `LogoRedondo` (en `Marca.tsx`) recorta la cabeza del logo de Full Código; si
   el logo nuevo tiene otra forma, ese recorte se ajusta.
4. Correr la muestra de arriba y mirar los 15 cuadros.

## La música de un canal de tecnología

Los videos de Full Código piden música electrónica. El catálogo de Richard es
música latina, así que el motor trae **su propia pista**:
`estacion/recursos/musica/electronic-tech-synth-minimal-curious-pulse.mp3`. La
escribe nota por nota `scripts/musica-tech.mjs` (sin muestras ni servicios de
terceros), dura 74 segundos y se repite sin costura. Y una pista ya no se elige
solo por el ánimo: un video de tecnología no puede terminar con una salsa
debajo (**C-MUSICA-2**).

## El separador de canales en el panel

- **Guiones:** arriba, «Todos los canales · Full Código · Caprichoso TV», con
  cuántos hay en cada uno. Cada guion lleva la etiqueta de su canal con color
  (verde Full Código, ámbar Caprichoso TV).
- **Nuevo video:** primero se elige el canal y la lista de temáticas muestra
  solo las de ese canal. Si se entra desde «Guiones» con un canal elegido, ya
  viene puesto.
- **Calendario:** el mismo separador, que se combina con el filtro de red
  social, y la etiqueta del canal en cada publicación.

La pieza es una sola: `src/componentes/FiltroCanal.tsx` y `ChipCanal.tsx`.

## Etiquetas por defecto de Caprichoso TV en YouTube Studio (6 oct 2026)

Richard devolvió el canal a lo que siempre fue, música, y pidió cambiar las etiquetas por
defecto de subida (Configuración → Ajustes de subida → Información básica → Etiquetas), que
venían del uso anterior (IA, Beellon, QRBOTT). Las nuevas, 26 etiquetas y 452 letras
(el tope de YouTube son 500):

```
música latina, historias de música, biografías de artistas, cantantes latinos, música en español, bachata, salsa, reggaetón, música urbana, conciertos, música en vivo, entrevistas a artistas, podcast de música, documental musical, noticias de música, premios de la música, Latin Grammy, Billboard latino, canciones nuevas, lyric video, letra de canciones, curiosidades de artistas, tendencias musicales, artistas latinos, Caprichoso TV, Grupo Kprichoso
```

Son del canal, no de un video: los nombres de artistas van en las etiquetas de cada video, que
escribe el panel al terminar cada producción.
