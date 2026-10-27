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

## Lo que sabe hacer y lo que no (todavía)

- Sí: el anuncio vertical de 12 a 45 segundos de Publicidad (fotos en tarjetas, textos grandes,
  subtítulos, música, una voz del banco y, si se quiere, una persona que habla).
- No, desde el chat: el video real del cliente de fondo, crear una persona nueva, la voz del dueño sobre
  un video ya editado, ni videos largos. El Director lo dice y Richard lo hace a mano mientras tanto.
  Son las partes que siguen.

## Cuánto cuesta

- La conversación: la IA del panel (el modelo de Ajustes), unos pocos centavos por respuesta. Se ve en el
  encabezado del encargo («la conversación lleva …») y cuenta para el tope de gasto del día.
- El anuncio: el precio de la tarjeta (sin persona, unos 11 centavos; con persona, de 60 centavos a un
  dólar, según lo largo). Es el mismo cálculo que usa Publicidad.

## Cómo funciona por dentro

- Tablas `director_encargos`, `director_mensajes` y `director_propuestas` (en `schema.sql`).
- `src/lib/director.ts`: guardar mensajes, revisar y guardar propuestas, aprobar (solo el botón) y la
  vuelta de la IA (`responderDirector`, hasta seis vueltas, cada una pregunta al tope antes de salir).
- `src/lib/director-prompt.ts`: las reglas del Director (las que aprendimos haciendo anuncios), sus dos
  herramientas y lo que tiene a mano en cada vuelta (las carpetas con sus fotos y cómo van sus
  propuestas). La memoria son los últimos 30 mensajes.
- Ruta `/datos/director/[id]` (mensaje nuevo o «responde otra vez»); acepta la sesión de Richard o el
  secreto de la Estación. Pantallas en `src/app/director/`.
- Candado C-DIRECTOR-1 en `docs/CANDADOS.md`; pruebas en `pruebas/director.test.ts`.

## Lo que sigue

1. Que el Director haga también la locución sobre un video y el anuncio con el video real de fondo.
2. El taller en la nube (la Estación en un contenedor), las cuentas de cliente y los créditos prepago.
3. La extensión en Beellon (en su propia sesión) y el MCP para agencias.
