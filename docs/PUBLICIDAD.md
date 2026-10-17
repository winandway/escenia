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

## Lo que cuesta cada anuncio

| Con qué                                   | 30 segundos |
| ----------------------------------------- | ----------- |
| Voz femenina + chica hablando (FlashTalk) | unos 0,62 $ |
| Voz femenina + la chica quieta (foto)     | unos 0,02 $ |
| El texto escrito por la IA (si se pide)   | unos 0,03 $ |

## Lo que falta para que sea parte del panel

1. Un menú «Publicidad» en el panel: el cliente, sus carpetas de Imágenes (ya existe la biblioteca), el
   producto, el texto (escrito a mano o por la IA a partir de las fotos y los datos del producto), la
   voz y el avatar; y el botón «Generar».
2. Que la Estación tome esos pedidos como hoy toma los comerciales y suba el anuncio con su miniatura.
3. La IA escribe el plan (las frases literales y qué foto va en cada una) a partir del texto.
4. El precio de venta lo decide Richard al ver el prototipo.
