# Apple rechazó Escenia por «spam» (pautas 4.3 y 4.2.6) — 3 nov 2026

## Qué pasó

- **Cuándo:** 3 de noviembre de 2026, 11:58 de la mañana (hora de Miami). Lo avisó el gerente de correo.
- **Qué:** la versión 1.0 (compilación 3), envío `92bb3212-16db-40be-b4f9-4c4f51b991bb`, enviado el 31 de octubre.
- **Estado en App Store Connect:** versión `REJECTED`, envío «Problemas sin resolver». El motivo solo se ve en la
  página de App Review (la API no lo trae); se leyó desde el Chrome de Richard.
- **El mismo minuto** Apple rechazó también Divoox (las tres apps), FinTwin, QRbott, Mercatren y Ferremateriales
  Bley. Beellon también figura rechazada y Kipuu no se ha enviado. Todo indica una revisión de la cuenta completa
  de Windoce LLC, no solo de Escenia.

## Qué dice Apple (resumen)

Pautas **4.3 (Spam)** y **4.2.6 (servicios que generan apps)**. Dice que la app parece caer en uno o más de estos
casos:

1. **4.3(a):** duplica contenido o funciones que ya están en la App Store.
2. **4.3(b):** no se distingue de lo que ya abunda, o es una variante oportunista de una categoría o de una app
   popular.
3. **4.2.6:** está hecha con una plantilla comercial o un servicio que genera apps, y no la envía el dueño del
   contenido.

Y da dos caminos:

- **Si algo de eso aplica:** no reenviar hasta hacer cambios importantes. Reenviar sin mejoras sustanciales
  vuelve a ser rechazado, y puede sumar otros problemas.
- **Si creemos que no aplica:** NO reenviar. Responder el mensaje contestando nueve preguntas: qué hace la app
  y qué problema resuelve; quién la usa; qué hueco del mercado llena; qué pruebas beta se hicieron y qué se
  cambió por ellas; si es parte de una familia de apps de la cuenta; si podría ser una función dentro de otra
  app de la cuenta; si comparte código con otras apps de la cuenta o con terceros; y si se hizo para un cliente.

La pauta oficial (leída el 3 nov 2026 en la página de Apple) termina la sección 4.3 con: «Repeated submissions
of this kind may lead to removal from the Apple Developer Program». O sea: insistir puede costar la cuenta
entera, con las diez apps.

## El diagnóstico de Escenia

**El problema de fondo es Beellon.** En la misma cuenta hay dos apps de la misma categoría (Foto y video) que
hacen anuncios en video con inteligencia artificial:

| App                        | Subtítulo en la tienda       | Categoría    |
| -------------------------- | ---------------------------- | ------------ |
| Escenia: AI Video Ads      | Ads with a talking presenter | Foto y video |
| Beellon: AI Video & Images | Create ads, videos and music | Foto y video |

Para Apple eso es justo el caso 4.3(a), y la pregunta 6 lo dice sin rodeos: «¿esto podría ser una función dentro
de otra app de tu cuenta?». La respuesta honesta es **sí**: desde el 27 de octubre el plan escrito es que el
Director de Escenia se venda **como extensión dentro de Beellon** (memoria «Escenia como producto en Beellon» y
`planes/ESCENIA-COMO-PRODUCTO.md`). Responder que no sería mentirle a Apple, y responder que sí es darle la razón.

Lo de 4.2.6 (apps hechas para clientes) no es de Escenia: Escenia es producto propio de Windoce. Pero en la
cuenta está **Ferremateriales Bley**, que es la app de un cliente publicada por Windoce. Eso es exactamente lo
que prohíbe 4.2.6 y puede ser lo que encendió la revisión de toda la cuenta. Lo tiene que ver la sesión de Bley
con la Gerencia.

## La recomendación (decisión de Richard)

**No reenviar Escenia como app aparte. El Director pasa a vivir dentro de Beellon.**

- Escenia sigue funcionando como hasta hoy para Richard: el panel en la web y la app por TestFlight (la prueba
  pública ya está aprobada y no depende de la tienda).
- La versión 1.0 rechazada se deja quieta: no se reenvía, no se responde con argumentos que no se sostienen y no
  se cancela nada.
- El Director para clientes se construye dentro de Beellon, en la sesión de Beellon (regla de un proyecto por
  sesión). Así la cuenta tiene una sola app de video con IA y deja de parecer una familia de clones.
- Si Richard quiere, se le responde a Apple una nota corta y honesta (abajo, «Respuesta corta») para dejar
  constancia de que la app no se va a reenviar y que la función se une a Beellon. No es obligatoria.

**Por qué:** cada reenvío sin un cambio de fondo es otro rechazo 4.3 en la ficha de la cuenta, y Apple avisa que
la repetición puede sacar a Windoce del programa de desarrolladores. Escenia como app aparte no vale ese riesgo:
lo que la hace valiosa (el Director) sobrevive entero dentro de Beellon.

## La línea común de la cuenta y Escenia (3 nov 2026, tarde)

Gerencia dejó una línea común para que todas las apps contesten igual (APPLE-4.3-LINEA-COMUN, en la carpeta de
Gerencia), y Richard dio el sí para mandar hoy las respuestas de la cuenta. Escenia **no puede usar tal cual la
respuesta común a la pregunta 6** («no, ninguna otra app de la cuenta hace lo mismo»): Beellon sí hace anuncios en
video con IA. La regla de esa misma línea común es que todo sea verdad y se pueda comprobar. Por eso Escenia
espera la decisión de Richard: contestar hoy con la respuesta honesta de abajo (la 6 dice que sí podría vivir en
Beellon), o no contestar y pasar el Director a Beellon. Hasta su respuesta no se manda nada.

## Respuesta corta (si Richard elige la recomendación)

> Thank you for the review. We agree that Escenia's functionality overlaps with another app on our account,
> Beellon. We will not resubmit Escenia as a standalone app; its AI Director feature will be consolidated into
> Beellon in a future update. We appreciate your guidance.

## Respuesta completa (solo si Richard decide defender Escenia como app aparte)

No se recomienda. Si aun así se quiere intentar, esta es la respuesta honesta a las nueve preguntas. Ojo con la
6: la verdad es que la función podría vivir en Beellon, y no se puede contestar otra cosa.

> 1. Escenia turns a short conversation with an AI "Director" into a finished vertical video ad. The business
>    owner describes what they sell and adds photos or a short video; the Director reviews the material, asks for
>    anything missing, and proposes one ad on a card with the script, the voice, the presenter and the exact price.
>    Nothing is produced or charged until the owner taps Approve. The finished ad appears on the same card, ready to
>    save or share. It solves the cost and skill barrier of producing short-form video ads for small businesses.
> 2. Owners of small businesses in the United States (shops, restaurants, service providers, coffee shops,
>    hardware stores) who sell through Instagram, TikTok and WhatsApp and have no time or budget for an editor.
> 3. Existing AI video apps ask the user to write prompts and edit timelines. Escenia works as a conversation with a
>    director that reviews the owner's own photos and videos, shows the price before spending anything, and requires
>    explicit human approval before producing, which avoids wasted generations and surprise costs.
> 4. Internal testing by our team on TestFlight (internal group) and in the web version since October 2026, plus a
>    public TestFlight group approved on November 1. Changes applied from that feedback, all in build 8: the chat was
>    redesigned as a messaging conversation; the proposal card now shows the presenter's photo; the logo became
>    optional; the Director now asks for missing material before proposing an ad; and in-app support cases with
>    screenshots were added.
> 5. It is a standalone product by Windoce LLC. Our account also publishes Beellon, an AI video and image creator.
> 6. Yes. The AI Director could be offered inside Beellon. It was built first as Escenia to validate the
>    conversational workflow with real businesses.
> 7. No business logic or content is shared with other apps on our account. The app uses standard frameworks (Expo
>    and React Native) and a few small in-house interface conventions (language selector, password field, draft
>    saving) that our team follows in all its apps.
> 8. No shared codebase, SDK or content library beyond standard frameworks. AI services are called from our own
>    server; the app does not embed a third-party template.
> 9. No. Escenia is Windoce LLC's own product, concept and branding.

## Qué se hizo y qué no (3 nov 2026)

- Se leyó el motivo completo en App Store Connect y se confirmaron las pautas en la página oficial de Apple.
- Se listaron las apps de la cuenta con su categoría para el diagnóstico.
- **No se respondió a Apple, no se reenvió y no se canceló nada.** Responder es hablar en nombre de Richard y
  decidir el producto: eso espera su «sí».
- Se avisó a la Gerencia (bitácora) y al gerente de correo, porque el rechazo parece de la cuenta entera.
