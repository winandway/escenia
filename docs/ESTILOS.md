# Estilos de video: clásico, ilustrado y neón

> Richard, 5 de octubre de 2026, con capturas de dos videos de otro canal:
> _«estos videos así dibujados, con estas caras, cuando hablamos de tecnología,
> nosotros no lo estamos haciendo… y el otro diseño, así gráfico, tipo neón,
> para explicar cómo funciona algo de mi software… quiero más dinamismo, más
> naturalidad, que la gente se enganche y se quede. Está muy casero todavía.»_

Cada temática tiene su **estilo** (`estilo` en `compartido/tematicas/index.ts`).
La Estación produce el video con el estilo de su temática; no hay que elegirlo
a mano.

| Estilo        | Cómo se ve                                                                            | Temáticas                                                                         |
| ------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **clásico**   | Fotos y clips a pantalla llena, rótulos y cifras en grande (el de Prince Royce)       | Biografías y las demás                                                            |
| **ilustrado** | Las personas salen **dibujadas**, recortadas y con borde de luz, sobre fondo de cómic | Novedades de IA, IA y apps, Noticia de Losupe                                     |
| **neón**      | Sin fotos ni clips: todo se explica con **diagramas de neón** que se van encendiendo  | «Así funciona: explicado con diagramas de neón» (temática nueva, id `explicador`) |

En los dos estilos nuevos, la palabra que se está diciendo va dentro de una
caja de color en los subtítulos.

## Estilo ilustrado

**Qué hace.** De cada foto con rótulo (las únicas de las que se sabe de quién
son) se hace un dibujo: la misma persona, la misma ropa, estilo cómic. Se
recorta la figura y se pone sobre un fondo oscuro con rayos y trama de puntos,
con un borde de luz que cambia de color en cada plano. Los planos «dato» que
vienen después **no tapan la pantalla**: caen como titulares enormes encima del
dibujo, y la persona se queda (da un golpecito, no vuelve a entrar).

**En vertical**, el titular va arriba y la figura debajo. **En horizontal**, la
figura va a un lado y el titular al otro; el nombre, al lado contrario de la figura.

**Cómo se hace por dentro** (`estacion/src/ilustrado.ts`):

1. Se mira la foto, gratis y en la Mac: tiene que haber **una sola cara**. Con
   dos personas, el dibujo se quedaría con una cualquiera y el rótulo diría el
   nombre de la otra (pasó en la primera prueba: «Sam Altman» trajo una foto de
   tres personas en un escenario). Esa foto se queda como foto real.
2. Se dibuja con el modelo de imágenes permitido (Seedream 4 «edit» en fal.ai,
   tres centavos por dibujo; `ilustrarFoto` en `estacion/src/imagenes.ts`). El
   dibujo sale de la foto real: no se inventa a nadie.
3. Se recorta la figura con el motor de macOS (`estacion/src/recorte.ts`). Si
   no se pudo separar del fondo, ese plano sale con la foto real.
4. `repartirFiguras` (`compartido/ilustrado.ts`) decide qué planos llevan
   figura y cuándo «sigue» en pantalla.

**Costo.** Tres centavos por persona distinta, con tope de 24 dibujos por video
(72 centavos como mucho). El dibujo de una misma foto se guarda y no se cobra
dos veces. Sin la clave de fal.ai, el video sale con las fotos reales.

**Qué se le pide al guion.** Lo mismo de siempre (planos con `foto` + `texto`
para las personas, y `dato` para lo que pesa). La temática agrega: después de
mostrar a alguien, uno o dos «dato» de 2 a 4 palabras.

**Qué revisar.** Además de lo de siempre: que cada dibujo se parezca a su foto
(se comparan lado a lado; la IA no reconoce a nadie por la cara, pero sí puede
ver si el dibujo cambió la ropa, el pelo o el gesto de la foto) y que la foto
de origen sea de quien dice el rótulo, por su fuente (C-IMAGEN-6).

## Estilo neón

**Qué hace.** Cada escena es un **diagrama**: arriba, la barra de secciones del
video (por dónde va) y el titular de la escena; en el centro, los objetos de
neón parados en sus baldosas. Antes de que la voz los nombre se ven apagados,
como un plano; cuando la voz dice su frase, se **encienden** (con sonido), y la
flecha que los une se dibuja y le corre un pulso de luz. El último que entró
brilla más. Nada se queda quieto: los objetos flotan, los pulsos corren y la
cámara se acerca despacio.

**Cómo se escribe en el guion** (`visual.tipo`: «diagrama»):

- `visual.titular`: el título de la escena. Con dos puntos, lo de antes sale
  resaltado («El depósito: de dónde sale»). De hasta 20 letras y sin dos puntos
  sale ENORME («TODO CUADRA SOLO»), con la frase de apoyo en `visual.cuerpo`.
- `visual.diagrama.seccion`: la etapa («Ventas», «Depósito»). Arma la barra de arriba.
- `visual.diagrama.nodos`: de 1 a 6 objetos, cada uno con `id`, `icono`,
  `etiqueta`, `nota` (o vacía) y `frase`: de 2 a 5 palabras **literales** de la
  narración, el momento en que se enciende.
- `visual.diagrama.flechas`: `de` → `a`, con los `id`. Se enciende cuando ya
  están sus dos puntas.
- `visual.diagrama.formula`: la idea en una línea («venta → salida → descuento»), o vacía.

Los íconos que existen (`ICONOS_DIAGRAMA`): persona, vendedor, tienda, producto,
deposito, dinero, factura, carrito, servidor, datos, telefono, computadora,
nube, camion, banco, grafica, candado, engranaje, casa, edificio, ia, reloj,
correo, tarjeta, alerta, listo. Para agregar uno: se dibuja en
`estacion/src/remotion/IconosNeon.tsx` y se suma a `ICONOS_DIAGRAMA` (una
prueba exige que las dos listas sean iguales).

La escena de opinión no es un diagrama: sale como una lámina con «Mi opinión» y
unas barras de sonido que se mueven.

**Para hacer un video de neón.** En el panel, «Nuevo video», temática **«Así
funciona: explicado con diagramas de neón»**. En el contexto se pega la
explicación real del proceso (los pasos, quién hace qué, los nombres de las
pantallas): la IA solo dibuja lo que está ahí.

Ejemplo completo de guion: `estacion/ejemplos/guion-neon.json` (la venta y el
depósito, el ejemplo que dio Richard).

## Neón con personajes (formato `mixto`)

Pedido por Richard el 5 oct 2026, mirando el formulario de Grabaciones: _«quiero
una cuarta opción donde mezclamos el neón con las imágenes de los personajes
que yo vaya nombrando»_.

- **Cada escena es una de dos cosas.** Si en ese tramo se nombra a una
  **persona**, la escena lleva planos: la persona **dibujada** (la misma figura
  del Cómic) y los datos que se dicen de ella como titulares. Si no se nombra a
  nadie, la escena es un **diagrama** de neón. Una empresa o un producto no es
  una persona.
- **Todo va sobre el fondo de neón.** La figura dibujada no lleva el fondo de
  cómic: va sobre la rejilla morada, con un foco y un borde de los colores del
  neón. Mientras nadie ha sido nombrado, la escena muestra la lámina de neón
  con su titular.
- **Nada real entra.** No se buscan clips ni fotos de fondo. Las fotos de las
  personas se buscan solo para dibujarlas; la que no se pudo dibujar (no hay
  clave de fal.ai, o en la foto hay más de una cara) **no sale**: una foto real
  rompería el neón. Ese tramo se queda con la lámina.
- Cuesta lo mismo que el Cómic: tres centavos por persona dibujada, con el
  mismo tope de 24 por video.
- Las reglas que recibe la IA al armar el plan de una grabación están en
  `REGLAS_POR_FORMATO.mixto` (`src/lib/plan-grabacion.ts`). Las temáticas de
  «Nuevo video» todavía no lo usan: hoy se elige al subir una grabación.
- En el código: `esDeNeon(estilo)` (sin fotos ni clips reales) y
  `dibujaPersonas(estilo)` (figuras) en `compartido/tematicas`;
  `dejarSoloFiguras` en `compartido/ilustrado.ts`; `PlanoIlustrado` recibe
  `neon` para cambiar el fondo.

## Ver los estilos sin producir un video

Cuadros y clips cortos de muestra (sin voz; el ilustrado cuesta tres centavos
la primera vez):

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/muestra-estilos.ts --video
```

Quedan en `estacion/out/muestra-estilos/`. Con `--solo neon` o `--solo
ilustrado` sale uno solo.

Un video entero desde un guion en JSON, con la voz de prueba de la Mac (gratis):

```bash
cd /Users/windocellc/Motor-Escenia/estacion && ELEVENLABS_API_KEY= npx tsx src/render-local.ts ejemplos/guion-neon.json TechExplainer neon
```

```bash
cd /Users/windocellc/Motor-Escenia/estacion && ELEVENLABS_API_KEY= npx tsx src/render-local.ts ejemplos/guion-ilustrado.json TechExplainer ilustrado
```

## Lo que NO hay que tocar (C-ESTILOS-1)

- **El diagrama no lleva campos opcionales en el guion.** El formato que se le
  exige a la IA admite 24 opcionales en total (límite de la API, leído en su
  documentación el 5 oct 2026) y el guion ya lleva 16. Con uno de más, la IA
  devuelve error y no se puede escribir **ningún** guion. Lo que no aplica va vacío.
- **No dibujar fotos con más de una cara.**
- **No subir el tope de dibujos** sin que Richard lo apruebe con el costo por escrito.
- **No usar un modelo de imagen que no esté en `IMAGENES_PERMITIDAS`.**

## Lo que falta (está en PENDIENTES)

- Varias personas dibujadas juntas en un mismo plano (el «tres contra uno» de la portada del ejemplo).
- Barras de «vida» y otros marcadores de juego encima de la figura.
- Editar el diagrama a mano en el panel (hoy se ve, no se edita).
- Diagramas con capturas reales de la pantalla del software dentro de un objeto.

## Las piezas

| Qué                                   | Dónde                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Estilo de cada temática               | `compartido/tematicas/index.ts` (`estilo`, `estiloDeTematica`)               |
| Forma del diagrama en el guion        | `compartido/guion.ts` (`esquemaDiagrama`, `ICONOS_DIAGRAMA`)                 |
| Tiempos y numeración de los diagramas | `compartido/diagrama.ts`                                                     |
| Quién lleva figura dibujada           | `compartido/ilustrado.ts`                                                    |
| Dibujar y recortar                    | `estacion/src/ilustrado.ts`, `imagenes.ts` (`ilustrarFoto`), `recorte.ts`    |
| El dibujo del diagrama                | `estacion/src/remotion/Diagrama.tsx`, `IconosNeon.tsx`, `diagrama-sitios.ts` |
| El dibujo de la figura                | `estacion/src/remotion/Ilustrado.tsx` (se usa desde `Planos.tsx`)            |
| Reglas para la IA                     | `src/lib/prompt.ts` («diagrama») y las reglas de cada temática               |
| Pruebas                               | `pruebas/estilos.test.ts`                                                    |
