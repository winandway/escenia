# Publicidad en Short: el anuncio vertical de un producto, con avatar que habla

> Pedido por Richard el 17 oct 2026: _«una sesión publicitaria… que yo pase cuatro, cinco, seis
> imágenes y que armemos un short con voz… una voz femenina… como un avatar que está hablando. No
> importa que esté fija en la imagen… que no sea muy caro… una carpeta donde van a ir todas las
> imágenes publicitarias, logo, productos, el avatar… se genera un short de 30, 40 segundos donde va a
> vender un producto… para proinshop.com… hacemos un prototipo y dependiendo del prototipo vemos el
> precio y desarrollamos el software»_.

## El prototipo (17 oct 2026): el generador de 1200 W de Pro In Shop

`publicidad/proinshop/trabajo/plan-generador/anuncio.mp4` (29,9 s, vertical). Costó **0,59 $**: la voz
2 centavos y la chica hablando 57 centavos (2 ¢ por segundo).

Cómo se ve: el logo arriba a la izquierda; el texto grande de cada momento en la caja roja de la marca
(«¿SE TE VA LA LUZ?», «1200 W», «MOTOR 3.5 HP · 4 TIEMPOS»…); la foto del producto en una tarjeta que
entra con un golpe y se sigue acercando; las cosas que se pueden encender entran una a una cuando se
dicen; subtítulos al estilo CapCut con la palabra en rojo; la chica hablando abajo a la izquierda (su
mano apunta al producto; ahí YouTube no tapa nada); música con bombo y bajo bajita, un golpe en cada
cambio de foto, y la tarjeta final en blanco con el logo, el Instagram, la web y «¡Pídelo hoy!».

## La carpeta del cliente

```
publicidad/<cliente>/          (fuera de git: es material del cliente)
  logo/        los logos
  productos/   las fotos de cada producto
  avatar/      la persona que habla, en PNG sin fondo
  plan-<producto>.json   lo que dice la voz y en qué palabra entra cada foto y cada texto
  trabajo/<plan>/        la voz, el avatar sin fondo y el anuncio terminado
```

## Cómo se arma (desde estacion/)

```
npx tsx src/publicidad.ts ../publicidad/proinshop/plan-generador.json --paso voz
npx tsx src/publicidad.ts ../publicidad/proinshop/plan-generador.json --paso avatar
npx tsx src/publicidad.ts ../publicidad/proinshop/plan-generador.json --paso armar
```

- **voz:** el texto con la voz femenina de ElevenLabs (o la de Richard); no pasa de 45 s.
- **avatar:** la chica sobre verde parejo → FlashTalk la hace hablar con esa voz (2 ¢/s) → se le quita
  el verde (`croma.ts`) y queda un video transparente. Sin `avatar` en el plan, el anuncio sale sin ella.
- **armar:** cada `frase` del plan tiene que ser literal de lo que dice la voz (las cifras quedan en
  número: «1200 vatios», «12 voltios»). Si una no está, no arma y dice cuál.

Piezas: `estacion/src/publicidad-plan.ts` (plan, tiempos y costo; pruebas en
`pruebas/publicidad.test.ts`), `estacion/src/publicidad.ts` (los pasos),
`estacion/src/remotion/Publicidad.tsx` y `publicidad-diseno.ts` (la plantilla, composición
«Publicidad»).

## En el panel: menú «Publicidad» (desde el 17 oct 2026)

Richard pide el anuncio desde el panel y la Mac lo arma sola. No hace falta escribir ningún plan.

1. En **Imágenes**, una carpeta por cliente con su logo (que el archivo se llame «logo», mejor sin
   fondo), las fotos del producto y la foto de la persona que habla.
2. En **Publicidad**: el nombre, lo que dice la voz (de 30 a 115 palabras; las cifras en número), el
   idioma, la voz del **banco de voces** (cada una con su botón para oírla antes de elegirla), las
   carpetas y la persona que habla (sus miniaturas salen al marcar las carpetas; «Sin persona» también
   vale). Lo escrito se guarda solo mientras se escribe.
3. La Mac lo toma: baja las imágenes, la IA del panel decide qué foto y qué texto grande van en cada
   frase, saca el color de la marca del logo, hace la voz, la persona hablando y el video, y lo sube.
4. En la lista: el video para verlo y el botón para descargarlo, lo que costó, «Armar otra vez» (otro
   plan con las mismas fotos; la voz y la persona ya pagadas se reutilizan) y «Quitar» en los tres
   puntos.

Si la foto de la persona no tiene fondo, sale recortada de cuerpo entero abajo a la izquierda (como en el
prototipo). Si trae su fondo, sale hablando dentro de un recuadro redondeado del color de la marca.

Antes de gastar, el panel calcula el anuncio entero (plan, voz y persona) contra el tope diario.

**Primer anuncio hecho desde el panel (17 oct 2026):** el generador de Pro In Shop con la voz venezolana
y la chica hablando, 29,9 s, en 7 minutos de punta a punta. Costó **0,6277 $**: plan 0,0115 $ + voz
0,0422 $ + persona 0,574 $. El color de la marca salió solo del logo.

Piezas: `compartido/publicidad.ts` (el pedido, el plan de la IA y el costo estimado),
`src/lib/publicidades.ts` y `src/lib/publicidad-ia.ts` (la fila y la IA), `src/app/publicidad/` (la
página), las rutas `/datos/publicidades` y `/datos/estacion/publicidades/*`,
`estacion/src/publicidades.ts` (la vuelta de la Mac) y `src/componentes/BancoDeVoces.tsx`.

## El banco de voces

Las tres voces: la de Richard (clonada), la femenina de catálogo y la **venezolana** (chica joven de
Caracas, diseñada en ElevenLabs el 17 oct 2026; se lee con el modelo v3). El banco sale en Publicidad,
Comerciales y Nuevo video. Las muestras viven en el almacén del panel (`voces/<voz>.mp3`) y se rehacen
con `npx tsx src/muestras-voces.ts` desde `estacion/` (unos 2 centavos por voz).

## Anuncio largo con capturas: la bienvenida de QRBott (21 oct 2026)

Richard pidió un anuncio vertical de unos 90 segundos que se le manda al cliente cuando pide más
información: la chica venezolana explica todas las herramientas de QRBott una detrás de otra, con las
capturas del sistema bien de cerca, y cierra con las tres opciones para conocerlo («responde 1, 2 o 3»)
y la garantía de 30 días. El guion es el de Richard (el PDF «tomas del video de 90 segundos»).

Material en `publicidad/qrbott/` (fuera de git): `capturas/` (sacadas del PDF en su calidad original con
`pdfimages -j`), `avatar/` (la foto original, su recorte y las poses), `logo/`, `plan-bienvenida.json`.

Lo que el plan admite ahora (todo opcional; el anuncio de Pro In Shop sigue igual):

| Campo                          | Para qué                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `partes`                       | La voz por partes: cada una se hace y se guarda aparte; rehacer una sola no cambia las otras ni obliga a pagar de nuevo la persona de las demás.                                                                   |
| `maximo_seg`, `cola_ms`        | Lo largo que puede durar la voz (110 s aquí) y cuánto queda la tarjeta final.                                                                                                                                      |
| `tema: "oscuro"`               | Marcas con logo claro: el logo va sobre oscuro y el cierre también.                                                                                                                                                |
| momento `enfoque`              | La zona de la captura que se ve de cerca (fracciones de 0 a 1). La cámara viaja desde la imagen entera, o desde la zona anterior si es la misma captura.                                                           |
| momento `persona`              | Desde ese momento habla esa foto, de `medio` cuerpo (abajo a la izquierda) o de `cuerpo` completo (al centro, sin tarjeta). Cada tramo es su propio video de FlashTalk con su pedazo de voz; ninguno pasa de 35 s. |
| momento `sin_tarjeta`          | Ese momento va sin captura (la persona de cuerpo completo ocupa la pantalla).                                                                                                                                      |
| momento `sonido`               | El efecto de ese momento (caja registradora, cámara, teclado, reloj…), de `recursos/sfx*`.                                                                                                                         |
| momento `cifra`                | Un número que sube como contador (la utilidad neta).                                                                                                                                                               |
| momento `oscurecer`, `entrada` | La captura baja a oscuro («mientras tú duermes»); la tarjeta entra con golpe o barriendo de lado.                                                                                                                  |

Pasos (desde `estacion/`): `--paso voz`, `--paso verdes` (deja las figuras sobre verde para revisarlas
antes de pagar), `--paso avatar` y `--paso armar`.

**Quitar el fondo sin costo:** si la foto de la persona no es transparente, la Mac le quita el fondo con
su propio reconocimiento (`estacion/herramientas/quitar-fondo.swift`, Vision) y limpia el borde. Si la
foto traía el «tablero de cuadritos» pintado (no es transparencia de verdad), lo reconoce y borra lo que
quedó de él pegado a la persona (C-FONDO-3). Las poses nuevas (señalando, mostrando el número uno) salen
de la misma foto con Seedream edit (3 ¢ cada una).

**La portada de WhatsApp:** el primer cuadro ya trae el título completo y la persona quieta (WhatsApp lo
usa de miniatura).

## La tarjeta de saldo y el diseño «pizarra» (QRBott, 23 oct 2026)

Richard pidió el video de la tarjeta de saldo «como lo que ya estamos haciendo pero los fondos los vamos
a ir cambiando», la chica con el moño amarrado, otra ropa y las piernas un poco más gorditas, las
capturas «bien centradas en la pantalla del teléfono de forma vertical», y ella a un lado, unas veces
corta y otras alta, señalando la pantalla, y a veces de espaldas «como cuando uno está apuntando a una
pizarra».

- **`diseno: "pizarra"`**: un teléfono grande (660×1240) dibujado (marco oscuro, la isla y la hora arriba) con la captura
  entera y centrada en su pantalla. Va del lado contrario a la persona y cruza la pantalla deslizándose
  cuando ella cambia de lado; sin nadie, se queda al centro. Cada captura nueva entra subiendo un poco,
  como al cambiar de pantalla en una app. Nunca se acerca.
- **Ella va delante del teléfono y puede taparle un pedazo** (Richard, al ver la primera prueba con el
  teléfono más chico: «estirar un poquito más la pantalla… que el cuerpo de ella quede por arriba como si
  fuese una pizarra… eso no importa»). Su mano entra 110 px sobre el teléfono; la de espaldas, 170 px.
- **momento `persona.lado`** (`izquierda` o `derecha`): de qué lado está ella. La foto se voltea sola para
  que su mano apunte al teléfono (`apunta` dice hacia dónde apunta en la foto original; por defecto, a la
  derecha). `encuadre: "medio"` es la corta (880 px de alto) y `"cuerpo"` la alta (1300 px).
- **momento `persona.quieta`**: una foto quieta que no habla, para la pose de espaldas señalando la
  pantalla. Se mece despacio, respira, y un destello del color de la marca late donde su dedo toca el
  teléfono. No paga avatar; la voz sigue sonando como si explicara de cara a la pizarra.
- **Capturas de computadora**: una pantalla ancha no cabe derecha en un teléfono. Se recorta antes la
  parte que importa en una imagen aparte (la ventana de cobro, el recibo, el menú de la izquierda), entera.
- **Paso `cuadros`**: `npx tsx src/publicidad.ts <plan> --paso cuadros --en 0,300,900` deja cuadros
  sueltos (sin armar el video) en la carpeta de trabajo. Con todas las personas marcadas `quieta` en una
  copia del plan, se revisa la composición entera antes de pagar el avatar.

Plan `publicidad/qrbott/plan-tarjeta.json`, pantallas y recortes en `publicidad/qrbott/tarjeta/pantallas/`,
poses en `publicidad/qrbott/avatar/tarjeta-*.png` (cuatro con Seedream, 12 ¢). Candado C-PIZARRA-1.

## Cada anuncio con su armonía y su portada: el video de Cashea (QRBott, 22 oct 2026)

Richard: «todos los videos salen iguales… da la sensación de que ese video uno ya lo vio». Desde ese
día cada anuncio lleva su propia armonía y una portada en el primer cuadro:

- **`paleta`**: el fondo en degradado de dos colores con su dibujo (`puntos`, `lineas` o `ninguno`),
  en vez del verde y negro de siempre.
- **`portada`**: una o dos líneas de título grandes (la segunda en el color de la marca) y una etiqueta
  arriba a la derecha, quietas desde el cuadro 0 hasta `hasta_ms`: WhatsApp y las redes usan ese cuadro
  de miniatura.
- **El look de la persona**: la misma cara, otra ropa y otro peinado, hechos con Seedream edit desde su
  foto de referencia (3 ¢ por pose).
- **Otra música** y otro `acento`.
- En el diseño «teléfono», la tarjeta toma la forma de cada pantalla: una alta (celular) a la derecha,
  una ancha (computadora) arriba a lo ancho; siempre entera.

Registro para no repetir:

| Anuncio                         | Paleta                               | Acento  | Look de la chica                                           | Música            |
| ------------------------------- | ------------------------------------ | ------- | ---------------------------------------------------------- | ----------------- |
| Bienvenida QRBott (21 oct)      | verde y negro (sin paleta)           | #2ED66E | gorra de Venezuela, franela blanca, jeans                  | bombo y bajo      |
| Vende desde el celular (22 oct) | verde y negro (sin paleta)           | #2ED66E | la misma                                                   | bombo y bajo      |
| Cashea (22 oct)                 | morado #3b1470 → #12052a, líneas     | #A855F7 | sin gorra, pelo suelto, blusa lila, jeans blancos          | electrónica tech  |
| Tarjeta de saldo (23 oct)       | azul noche #0b2a4a → #030d1c, puntos | #F5B83D | moño alto, blusa mostaza, pantalón crema ancho, más curvas | salsa con metales |

## Comercial «Vende desde el celular» y el diseño «teléfono» (QRBott, 22 oct 2026)

**Lo que dijo Richard de la versión dos (abajo):** «se salían de la pantalla y el cliente no lo veía; el
último quedó mal hecho». Se quedó con la versión uno. Regla desde ese día: **cada pantalla se presenta
entera**; la chica habla de esa pantalla y sigue. El diseño «pantalla» no se vuelve a usar salvo que él
lo pida sabiendo esto.

Para las pantallas de celular (verticales) está el diseño `"telefono"`: la pantalla entera en una tarjeta
alta a la derecha (655×1115, con las esquinas redondeadas), quieta, que entra creciendo hasta su tamaño
y nunca más grande; la chica de medio cuerpo abajo a la izquierda, de cuerpo completo al empezar y al
cerrar; los subtítulos debajo de la tarjeta. La prueba «C-PUBLICIDAD-ENTERA» comprueba que cualquier
pantalla cabe completa en la tarjeta.

El comercial (guion de Richard acortado para que no tenga baches, 25 partes, ~1 min 55 s): plan
`publicidad/qrbott/plan-vende-celular.json`, pantallas en `publicidad/qrbott/celular/pantallas/`. Para
que vaya «violento», la voz se lleva a 13,5 letras por segundo (`letras_por_segundo`; los documentales
van a 11,6) y la pausa entre partes es de 120 ms (`pausa_ms`).

## Versión dos: las capturas a pantalla completa (QRBott, 21 oct 2026) — NO GUSTÓ

Richard se quedó con la primera versión y pidió otra igual donde el protagonista sea el software: la
captura ocupa toda la pantalla y hace su acercamiento, y la chica se mueve alrededor: grande al empezar,
solo la cabecita en un círculo abajo, de medio cuerpo señalando hacia la captura, pequeña de cuerpo
completo, o fuera de la pantalla; entra, sale y cambia de lado.

**No costó nada nuevo:** usa la misma voz y los mismos quince videos de la chica de la primera versión
(`trabajo_de: "plan-bienvenida"` en `plan-bienvenida-v2.json`; los momentos con `persona` son los mismos).
Lo que cambia por momento es `vista_persona` (`grande`, `cuerpo`, `medio`, `cabeza` u `oculta`, y el
`lado`) y el `enfoque`, pensado en vertical: la zona tiene la forma de la pantalla y su tamaño decide el
acercamiento. El video sale como `plan-bienvenida-v2.mp4` en la carpeta de trabajo de la primera.

Para la cabecita, la Mac busca dónde está la cara en cada pose (`estacion/herramientas/cara.swift`,
Vision, gratis) y la centra en el círculo. Los subtítulos van del lado contrario a la persona.

## Lo que cuesta cada anuncio

| Con qué                                       | 30 segundos | 45 segundos |
| --------------------------------------------- | ----------- | ----------- |
| Voz venezolana + persona hablando (FlashTalk) | unos 0,65 $ | unos 0,97 $ |
| Voz + sin persona                             | unos 0,05 $ | unos 0,06 $ |

Incluye el plan de la IA del panel (1 o 2 centavos). El prototipo costó 0,5951 $ con la voz femenina y
0,6152 $ con la venezolana (voz 0,0422 $ + persona 0,573 $).

## Lo que falta

1. El precio de venta lo decide Richard.
2. Que la IA escriba también el texto a partir de las fotos y los datos del producto (hoy lo escribe él).
