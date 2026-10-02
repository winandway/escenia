---
name: formato-escenia
description: El formato de video que le gustó a Richard (2 oct 2026, video de Prince Royce) y que es el de TODOS los videos de Escenia de ahora en adelante. Úsalo siempre que haya que hacer, rehacer, revisar o corregir un video en Motor Escenia: escribir un guion, ponerle planos, producirlo, revisar cuadros, cambiar una foto o la música, o entregar. También cuando Richard diga "hazme un video", "otro como el de Prince Royce", "el formato", "está aburrido", "ponle más imágenes" o "cámbiale la música".
---

# Formato Escenia: el video que no aburre

> Richard, 2 de octubre de 2026, al ver el video de Prince Royce rehecho:
> _«está hermoso el video… quiero que este formato sea el de todo el resto de
> videos que vayamos a hacer de ahora en adelante»_.

Antes, la gente comentaba que los videos aburrían: 15 imágenes en 7 minutos.
El formato que quedó tiene **una imagen nueva cada 3 segundos**, con sonido en
cada corte. Esto es lo que hay que cumplir en cada video. El detalle técnico
está en `docs/RITMO.md` y los candados en `docs/CANDADOS.md` (C-RITMO-1,
C-VOZ-6, C-SONIDOS-1, C-IMAGEN-6, C-ENTREGA-2).

## Las diez reglas del formato

1. **Ninguna imagen dura más de 5 segundos.** Meta: un cambio cada 3 o 4.
2. **Lo que se nombra, se muestra.** Si la voz dice «Shakira», sale Shakira en
   ese instante, con su nombre rotulado. Nunca se habla de alguien sin mostrarlo.
3. **Las cifras saltan en grande** («15 nominaciones», «0 premios»).
4. **Cada cambio de imagen suena**: un chasquido o un soplido bajito; un golpe
   grave en las cifras.
5. **Todo se mueve**: cada plano entra de una manera distinta y sigue
   moviéndose mientras dura.
6. **Subtítulos como en CapCut**: pocas palabras, borde grueso, y la palabra que
   se dice salta en color.
7. **La voz va pareja**: pausas recortadas al mismo largo y velocidad pedida
   desde el origen. Los primeros 3 segundos son imagen y voz, sin portada.
8. **La música es del mundo del video.** Una historia de bachata lleva bachata.
   Si Richard subió una pista de ese género en **Sonidos**, esa es la que va.
   Sin pista del género, va el bombo y bajo. Nada de electrónica con melodía.
9. **La foto con rótulo es de quien dice el rótulo**, comprobado por su fuente.
10. **El final no queda en negro**: cierra con el canal y «SUSCRÍBETE».

## Cómo se hace un video en este formato

### 1. El guion lleva planos

Cada escena con narración trae `visual.planos`: uno por frase o idea (cada 8 a
12 palabras). Cada plano tiene:

- `frase`: de 2 a 5 palabras **literales y seguidas** de la narración. Si no
  es literal, el plano no entra donde debe.
- `tipo`: `foto` (persona, lugar, disco, evento), `dato` (cifra en grande) o
  `stock` (clip de ambiente, búsqueda en inglés).
- `busqueda`: nombre real más algo que la distinga («Romeo Santos Aventura
  2002»). **Nunca la misma búsqueda dos veces** en un guion.
- `texto`: en `foto` de persona, el nombre que se rotula; en `dato`, la cifra
  con su unidad en 2 a 4 palabras.
- `foto_de: "lugar"` cuando la foto no es de una persona.

El guionista del panel ya los escribe solo en los guiones nuevos. Para ponerlos
o corregirlos a mano en un borrador: `scripts/guion-remoto.ts` (campo `planos`
por escena). Antes de guardar, comprobar que cada `frase` está en la narración
y en orden.

**Con rótulo solo van personas conocidas** cuya foto se pueda confirmar. Si
el video nombra a cinco artistas poco conocidos, mejor un `dato` («5 discos
nominados») que cinco fotos dudosas.

### 2. Para rehacer un video ya aprobado

Un guion aprobado no se toca. Se crea una **versión nueva** (botón en el panel
o `scripts/version-remota.ts <guion>`), se le ponen los planos y se aprueba.
Aprobar desde la Mac (`scripts/aprobar-remoto.ts`) solo cuando Richard lo
ordena; la opinión es la suya, tal como la escribió. Al entregar la versión
nueva, sacar la vieja del calendario: `scripts/sacar-del-calendario.ts <guion viejo>`.

### 3. Mientras produce, leer lo que dice la Estación

En `estacion/out/estacion.log`:

- `ritmo escena N: ×…` → si varias escenas llegan a ×1.25, la voz salió lenta.
- `planos escena N: X de Y · … sin su frase` → una `frase` no era literal.
- `ritmo visual: N imágenes en M s` → debe dar una cada 3 s, más o menos. Si
  dice **«OJO: tramos quietos»**, esa escena se quedó sin imágenes: arreglarla.
- `música: …` → comprobar que es la pista correcta (la de Richard, si la subió).

### 4. Revisar ANTES de avisar (no se puede oír; sí se puede ver)

Nunca se le dice a Richard «listo» sin esto:

1. **Todas las fotos, en hojas de contacto**, en el orden del video. Buscar:
   letreros de otros canales («MIX 2025», «ENTREVISTA EXCLUSIVA»), dibujos de
   fans, marcas de agua, gente que no es de la historia, logos de otra empresa.
2. **Cada foto con rótulo, contra su fuente**: en
   `estacion/cache/fotos-web/consultas.json` está la página de donde salió. La
   dirección de la foto o de la página tiene que nombrar a la persona, o la
   imagen misma traer su nombre (una portada de disco). **La IA no reconoce a
   nadie por la cara**: si la fuente no lo confirma, la foto se cambia.
3. **Cuadros sueltos** del principio, de dos o tres escenas, de la opinión y
   del final: `npx tsx src/cuadros.ts <trabajo> 1,5,60,…` (desde `estacion/`).
   Y dos o tres de un Short (`--short 1`).
4. **Los textos de YouTube**: título y títulos de los Shorts, en español
   neutro y sin prometer lo que el video no cuenta.

### 5. Corregir sin producir de nuevo (misma voz, sin gastar)

Desde `estacion/`:

| Qué                           | Con qué                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| Cambiar una foto              | `npx tsx src/cambiar-foto.ts <trabajo> <foto.jpg> "<búsqueda nueva>"` |
| Usar otra foto que ya tiene   | `npx tsx src/cambiar-foto.ts <trabajo> <foto.jpg> --usar <otra.jpg>`  |
| Cambiar la música             | `npx tsx src/cambiar-musica.ts <trabajo> "<estilo en inglés>"`        |
| Música un poco más alta       | lo mismo, con `--nivel 1.25` al final (tope fijo: nunca tapa la voz)  |
| Volver a armar todo           | `npx tsx src/rearmar.ts <trabajo>`                                    |
| Terminar solo lo que se cortó | `npx tsx src/rearmar.ts <trabajo> --solo-shorts 4`                    |
| Subir la versión corregida    | `estacion/node_modules/.bin/tsx scripts/reintentar-remoto.ts <guion>` |

`rearmar.ts` recibe el número del **trabajo** (la carpeta `out/t27`);
`reintentar-remoto.ts`, el del **guion**. Armar un video de 6 minutos tarda
unos 12; el comando se lanza en segundo plano.

### 6. La miniatura llamativa

La automática es solo un respaldo. Cada video lleva su **portada de impacto**:
la cara recortada, una cifra enorme y un remate en caja roja, con datos que el
video cuenta. Se arma con `npx tsx src/portada.ts <trabajo> …` (desde
`estacion/`), se mira, y con `--guion <guion>` se sube. Receta y opciones en
`docs/PORTADA.md`.

### 7. Entregar y contarlo

- El video queda en el panel, en la página del guion, para que Richard lo
  descargue. Él lo sube y lo programa.
- El reporte se escribe para ser **escuchado** (sin enlaces, rutas ni códigos),
  corto, y termina con «Esperando por ti».
- Lo que no se pudo comprobar se dice. En especial el sonido: lo que la IA
  sintetiza (música, efectos) se presenta como provisional.

## Lo que NO se hace

- No volver a una imagen por escena, ni a titulares quietos de medio minuto.
- No subir `QUIETO_MAXIMO_MS` para «pasar» un video con pocas imágenes.
- No rotular una foto cuya fuente no nombra a la persona.
- No usar una canción comercial de fondo: YouTube la detecta y no monetiza.
- No borrar archivos ni usar nada que dispare una tarjeta de «Aceptar».
- No avisar «listo» sin haber visto los cuadros.

## El caso que sirve de modelo

Video de Prince Royce contra los Latin Grammy (guion 8, trabajo 27, canal
Caprichoso TV): 146 imágenes en 391 segundos, 120 planos escritos a mano más el
relleno automático, bachata instrumental de Richard, cuatro Shorts. Sus planos
están en el guion 8 del panel: son el ejemplo de cómo repartirlos.
