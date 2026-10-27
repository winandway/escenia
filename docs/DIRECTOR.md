# El Director: el chat que arma los anuncios

> Pedido por Richard el 27 de octubre de 2026: que el cliente escriba lo que quiere y le salga el
> video, como lo vive él. Decisión del producto en el documento privado de `planes/` (una app en la
> nube que se instala, no un programa de escritorio). Esta es la primera parte, para Richard.

## Qué es

Un chat dentro del panel (menú **Director**). Richard le cuenta qué quiere vender, le sube las fotos, y
el Director le propone el anuncio en una **tarjeta**: el precio arriba, el texto entero que va a decir la
voz, la voz, la persona que habla y las carpetas de fotos. Debajo, dos botones: **Aprobar y hacer el
video** (con el precio escrito en el botón) y **Cambiar algo**. Los cambios se piden con palabras y la
tarjeta nueva reemplaza la anterior.

Al aprobar, el pedido entra a la misma fila del menú Publicidad: la Mac lo toma, lo arma y el video
aparece en la misma tarjeta, con el botón de descargar. El encargo también se ve en Publicidad.

## Cómo se usa

1. **Director → Encargo nuevo.** Cada encargo trae su carpeta de fotos («Encargo 3»): lo que se sube en
   el chat cae ahí.
2. **Escribir lo que se quiere** (o tocar un atajo: «Un producto con mis fotos», «Con una persona que
   habla», «Mi app con capturas»), y **Subir fotos** si hacen falta. En la computadora, Enter manda.
3. El Director mira las fotos si no sabe qué muestran, decide el texto, la voz y la persona, y deja la
   tarjeta. Si le falta algo imprescindible (cómo se compra), lo pregunta una vez.
4. **Aprobar** o **Cambiar algo**. Nada se gasta en voz ni en persona hasta aprobar.

Lo que se escribe no se pierde: el cuadro se guarda solo y vuelve si se cierra la ventana. Si la IA no
responde, el mensaje queda guardado y sale el botón «Pedirle que responda».

## Lo que sabe hacer

1. **Anuncio con fotos**: el anuncio vertical de 12 a 45 segundos de Publicidad (fotos en tarjetas,
   textos grandes, subtítulos, música, una voz del banco y, si se quiere, una persona que habla).
2. **Prueba en vivo con el video del cliente** (segunda parte, 27 oct 2026): se sube el video en el chat;
   la Mac lo mira y arma unas hojas con un cuadro cada pocos segundos y su hora; el Director las ve y
   propone cada frase en el segundo en que pasa lo que dice. El video va entero, sin un solo corte, con
   su sonido, títulos grandes arriba, la persona en un círculo abajo si se quiere, y la tarjeta final con
   la última frase. Hasta 120 segundos. Es lo mismo que la prueba del agua de Pro In Shop.
3. **Locución sobre un video ya editado**: se sube el video y se le da el texto (o se le pide que lo
   escriba); la voz (la de Richard, si no se pide otra) va con calma, por párrafos, con un piano suave
   debajo. El video no se toca; si la voz no cabe, se estira un poco en vez de acelerar la voz. Lo mismo
   que los quince años.

Lo que todavía no: crear una persona nueva ni videos largos. El Director lo dice y se hace a mano.

### Los videos en el chat

- «Subir fotos o videos» acepta MP4, MOV y los demás formatos del teléfono, hasta 2 GB, por partes de 8
  MB con reintentos (un corte de internet no obliga a empezar de cero).
- Arriba del chat sale cada video con su estado: «la Mac lo está mirando…» y después «0:20 · el Director
  ya lo puede ver». La Mac pregunta cada diez segundos, aunque esté armando otro video.
- El Director no propone nada con un video que no ha mirado; si se le pide antes, dice que espera.

## Cuánto cuesta

- La conversación: la IA del panel (el modelo de Ajustes), unos pocos centavos por respuesta. Se ve en el
  encabezado del encargo («la conversación lleva …») y cuenta para el tope de gasto del día.
- El anuncio con fotos: el precio de la tarjeta (sin persona, unos 11 centavos; con persona, de 60
  centavos a un dólar, según lo largo). Es el mismo cálculo que usa Publicidad.
- La prueba en vivo: la voz (10 centavos cada mil letras) y, si va persona, dos centavos por segundo de
  voz. Sin persona, unos 5 centavos; con persona, la del agua (casi dos minutos) salió en unos 2 dólares.
- La locución: solo la voz; un minuto de texto, unos 8 centavos.
- Mirar un video: gratis (lo hace la Mac). Que el Director lo vea: unos centavos de la conversación.

## Cómo funciona por dentro

- Tablas `director_encargos`, `director_mensajes` y `director_propuestas` (en `schema.sql`).
- `src/lib/director.ts`: guardar mensajes, revisar y guardar propuestas, aprobar (solo el botón) y la
  vuelta de la IA (`responderDirector`, hasta seis vueltas, cada una pregunta al tope antes de salir).
- `src/lib/director-prompt.ts`: las reglas del Director (las que aprendimos haciendo anuncios), sus dos
  herramientas y lo que tiene a mano en cada vuelta (las carpetas con sus fotos y cómo van sus
  propuestas). La memoria son los últimos 30 mensajes.
- Ruta `/datos/director/[id]` (mensaje nuevo o «responde otra vez»); acepta la sesión de Richard o el
  secreto de la Estación. Pantallas en `src/app/director/`.
- Videos del chat: tabla `director_videos`, subida en `/datos/director/[id]/videos` (iniciar, `parte`,
  `terminar`); la Mac los toma en `/datos/estacion/director/videos/*` y los mira en
  `estacion/src/director.ts` (ffprobe, ffmpeg y sharp para las hojas).
- Trabajos para la Mac: tabla `director_trabajos` (una por propuesta), rutas
  `/datos/estacion/director/trabajos/*`; los planes salen de `estacion/src/director-plan.ts` y se arman
  con `publicidad.ts` (prueba en vivo) y `armarLocucion` de `locucion.ts`. El resultado se entrega por
  partes y se sirve en `/datos/archivos/director/trabajos/...`.
- Lo que comparten el panel y la Mac (formatos, precios y revisiones): `compartido/director.ts`.
- Candados C-DIRECTOR-1, 2 y 3 en `docs/CANDADOS.md`; pruebas en `pruebas/director.test.ts` y
  `pruebas/director-videos.test.ts`.

## Lo que sigue

1. ~~La locución y la prueba en vivo desde el chat~~ (hecho, 27 oct 2026).
2. El taller en la nube (la Estación en un contenedor), las cuentas de cliente y los créditos prepago.
3. La extensión en Beellon (en su propia sesión) y el MCP para agencias.
