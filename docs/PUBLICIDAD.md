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
