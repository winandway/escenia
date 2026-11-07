# Podcast IA: el estudio del invitado

> Encargo de Gerencia aprobado por Richard el 6 nov 2026 (estudio completo en
> `~/Gerencia/informes/podcast-ia/PODCAST-IA.html`). Piloto: la página está hecha y probada; la voz del
> invitado se enciende con UNA clave de ElevenLabs (ver «La clave», abajo).

## Qué es

Richard entrevista a una IA que cuenta, en primera persona, la historia real de alguien tímido que cedió
su historia por escrito. Episodios de 5 a 8 minutos. No se monta nada después: Richard abre **el estudio**
(una página del panel), lo pone a pantalla completa y lo graba con su grabador de pantalla de siempre.

- **El estudio:** `https://escenia.sitios.dev/podcast` (detrás del inicio de sesión, sin la barra del panel).
- **Las fichas:** `https://escenia.sitios.dev/podcast/fichas` (menú «Podcast IA»).

![El estudio mientras se graba](capturas/podcast-estudio.png)

## Cómo se graba un episodio, paso a paso

1. **Fichas → elige o escribe la ficha** del invitado (nombre, tema de hoy, voz, cómo habla y la historia).
   Una historia real necesita la casilla «Tengo el permiso por escrito de su protagonista».
2. **Abrir el estudio** (o «Grabar con esta ficha» en la tarjeta de la ficha).
3. **Mi cámara** (interruptor): si se enciende, tu cámara sale en el panel de la izquierda y el escenario
   completo queda en la grabación sin montar nada. Si prefieres grabar tu cámara aparte, déjalo apagado: el
   panel queda con un fondo limpio. La preferencia se recuerda.
4. **Pantalla completa** y arranca tu grabador.
5. **Empezar la conversación.** El navegador pide el micrófono la primera vez. El invitado saluda primero.
   Usa audífonos: así el invitado no se oye a sí mismo por los parlantes.
6. Conversa. Arriba a la derecha del invitado se ve su estado: **Escuchando**, **Pensando** o **Hablando**.
   Los controles se esconden solos a los 2,5 segundos (y el puntero del ratón también); al mover el ratón
   vuelven.
7. **Terminar** (o espera: a los 10 minutos el invitado se despide y la conversación se corta sola).

Siempre está a la vista, también en la grabación: «Voz y avatar generados por IA, basados en una historia
real, con permiso de su protagonista». Al subir a YouTube se marca «contenido alterado o sintético: Sí».

## La ficha

| Campo                | Para qué                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Nombre               | Sale en la etiqueta roja del invitado. Puede ser un nombre cambiado.                                           |
| Debajo del nombre    | «Invitado especial» si no se pone otra cosa.                                                                   |
| Tema de hoy          | Sale en la barra de abajo.                                                                                     |
| Voz                  | Del banco de Escenia (neutra, femenina, venezolana, paisa). Nunca la de Richard ni un clon de la persona real. |
| Cómo es y cómo habla | La personalidad (tímido, cálido, se ríe cuando se pone nervioso…).                                             |
| La historia          | Lo ÚNICO que sabe el invitado, en primera persona. Hasta 12.000 letras.                                        |
| Primer mensaje       | Opcional; si no, saluda con su nombre.                                                                         |
| Permiso              | Casilla obligatoria para una historia real. Sin ella la ficha no entra al estudio.                             |

Lo que no está en la historia, el invitado **no lo inventa**: dice con naturalidad «eso prefiero no
contarlo» o «no lo recuerdo bien». Responde corto (2 a 4 frases), en primera persona y en español. Si le
preguntan si es una IA, dice la verdad. Las fichas no se borran: se archivan desde los tres puntos.

**La ficha de ejemplo** («Alma (ejemplo)», la panadera tímida) es ficticia, sirve para probar el estudio y
no se publica: en escena lleva la marca amarilla «Historia de ejemplo (ficticia) · no publicar». Se archiva
cuando llegue la primera historia real.

## Cómo funciona por dentro

- **ElevenLabs Agents** hace todo el circuito de voz: escucha a Richard, el modelo de texto contesta y la voz
  lo dice. No hay un segundo motor de voz.
- `scripts/podcast-agente.ts` crea (o pone al día) **un agente** con Gemini 2.5 Flash (respaldo: Flash-Lite),
  voz `eleven_v3_conversational` (la que sirve para las voces hechas con Voice Design v3), idioma español,
  10 minutos por conversación, una conversación a la vez, **URL firmada obligatoria** y sin recargo por pasar
  el límite de llamadas. Solo se pueden cambiar por conversación el prompt, el primer mensaje y la voz; **el
  modelo de texto no se puede cambiar desde el navegador**.
- Al tocar «Empezar», el panel (`POST /datos/podcast/conversaciones`) revisa los dos topes, pide a ElevenLabs
  una **URL firmada** para esa conversación y le da al navegador la URL, el prompt (hecho SOLO con la ficha,
  `construirPrompt` en `compartido/podcast.ts`), el primer mensaje y la voz. **La clave nunca sale del
  servidor.** Al terminar, `POST /datos/podcast/conversaciones/<id>/fin` cuenta los segundos con el reloj del
  panel y anota el costo en Gastos.
- El navegador usa el SDK oficial `@elevenlabs/client` (WebSocket). Sus worklets de audio se sirven desde el
  panel (`public/podcast/worklets/`, copias exactas del paquete) para no abrir la política de seguridad.
- Solo `/podcast` puede usar el micrófono y la cámara y conectarse a `wss://api.elevenlabs.io`
  (`next.config.ts`); el resto del panel sigue cerrado.
- El robot es la imagen que mandó Richard (`public/podcast/robot.webp`) con la cara dibujada encima en SVG,
  en las mismas coordenadas: se apagan los ojos pintados y se dibujan unos que parpadean, la boca es una onda
  de luz que sigue las frecuencias de su voz (`getOutputByteFrequencyData`), los aros de los oídos laten con
  el volumen y el cuerpo respira. Pensando, mira hacia arriba con tres puntos en la boca.
- El escenario (16:9, medido en `cqw`) sigue la dirección de arte de
  `capturas/podcast-referencia-escenario-1.webp` y `-2.webp`, construido en CSS y SVG.
- Tablas `podcast_fichas` y `podcast_conversaciones` (en `schema.sql`, se crean solas al publicar).
  Ajustes: `podcast_minutos_dia` (tope), `podcast_agente_id`, `podcast_voces` (los ids del banco, sin la voz
  de Richard), `podcast_elevenlabs_clave` y `podcast_error` (la última falla, para el canario).
- **Canario:** pieza `podcast` en `/datos/salud`: `apagado` sin clave o sin agente, `error` si la última
  conversación no se pudo abrir (clave revocada, agente borrado, sin minutos), `ok` si no.

## Cuánto cuesta

Fuentes leídas el 6 nov 2026: [precios de ElevenAgents](https://elevenlabs.io/pricing/agents),
[modelos de texto en Agents](https://elevenlabs.io/docs/eleven-agents/customization/llm) y
[cómo se cobra Agents](https://elevenlabs.io/docs/help-center/product/eleven-agents/how-much-does-eleven-agents-cost.md).

- **Minutos de conversación:** el plan Creator (22 dólares al mes) **incluye 275 minutos de Agents al mes**.
  Pasados esos, 8 centavos el minuto (solo si hay saldo de pago por uso; sin él, ElevenLabs se detiene).
  Se cuenta el tiempo conectado; los silencios de más de 10 segundos se cobran al 5 %.
- **Modelo de texto:** aparte, al precio de Google más un 10 % (precio regional de Vertex): Gemini 2.5 Flash
  a 0,33 dólares por millón de tokens de entrada y 2,75 por millón de salida. Con unas dos respuestas por
  minuto, cerca de medio centavo por minuto (lo descuenta ElevenLabs de los créditos).
- **Un episodio de 8 minutos:** 8 × 0,08 = 64 centavos de minutos + unos 4 centavos de texto = **68 centavos
  a precio de lista**. Dentro de los 275 minutos del plan, solo se paga el texto: **unos 2 a 4 centavos**. Con
  el plan alcanzan unos 34 episodios de 8 minutos al mes.
- El robot es nuestro: 0 dólares. Nada de avatares que cobran por minuto.

En Gastos se anota cada conversación a precio de lista (`podcast: conversación N (ficha M, X min)`), igual
que las voces: sirve para ver el uso, aunque los minutos del plan ya estén pagados.

## Los candados (C-PODCAST-1)

1. **Tope de minutos por día** en la base (`podcast_minutos_dia`, 60 por defecto; se cambia en Fichas, de 0
   a 240). Cada conversación abierta cuenta como 10 minutos: solo se abre si caben 10 más. Sin un número
   válido el tope es cero.
2. **10 minutos por conversación**, en el agente (`max_duration_seconds`) y en la cuenta del panel.
3. **El tope de gasto del día** (Ajustes) también se pregunta antes de abrir.
4. Una pestaña cerrada de golpe deja la conversación abierta: la siguiente la cierra contando los 10 minutos
   completos. Nunca se cuenta de menos.
5. **Solo la ficha:** el prompt lleva la historia entre marcas y las reglas de no inventar; la historia no
   puede cerrar el bloque para meter reglas nuevas.
6. Solo corren Gemini 2.5 Flash y Flash-Lite (`LLM_AGENTE_PERMITIDOS` en `compartido/modelos.ts`); el
   navegador no puede cambiar el modelo; una conversación a la vez; sin recargo por ráfagas.
7. Una historia real sin el permiso confirmado no entra al estudio. La voz de Richard no puede ser la del
   invitado.

Pruebas: `pruebas/podcast.test.ts`, `pruebas/podcast-rutas.test.ts` (ElevenLabs simulado con msw) y
`pruebas/podcast-estudio.test.tsx`.

## La clave (lo único que falta)

La clave de ElevenLabs que hay en la Mac (`ELEVENLABS_API_KEY`) solo sirve para texto a voz: con ella
ElevenLabs responde 401 a todo lo de Agents. Hace falta **una clave nueva**, creada por Richard:

| Casilla en ElevenLabs (Developers → API Keys → Create API Key) | Valor                     |
| -------------------------------------------------------------- | ------------------------- |
| Name                                                           | `Escenia podcast agentes` |
| Expire After                                                   | Never                     |
| Restrict Key                                                   | Encendido                 |
| ElevenAgents (en la API: `convai_read` y `convai_write`)       | Write (incluye leer)      |
| Text to Speech (`text_to_speech`)                              | Access                    |
| Voices (`voices_read`)                                         | Read                      |
| Todo lo demás                                                  | No Access                 |

**Destino:** Richard la pega UNA vez en el chat de la sesión; la sesión la guarda en
`~/.config/motor-escenia/elevenlabs-agentes` (carpeta 700, archivo 600) y no se la vuelve a pedir.

**El paso de la IA después** (desde la raíz del proyecto):

```bash
cd /Users/windocellc/Motor-Escenia && estacion/node_modules/.bin/tsx scripts/podcast-agente.ts
```

El script crea el agente, prueba la misma URL firmada que pide el panel y guarda en la base del panel (por la
API de YaDominios, con `YAPANEL_DB_TOKEN`) el id del agente, las voces del banco y la clave. Si se prefiere
que la clave no viva en la base, se corre con `--sin-clave-en-base` y se pone como variable
`ELEVENLABS_AGENTES_KEY` en YaDominios Cloud → sitio `escenia` → Variables de entorno (las variables solo se
cargan en el panel: no hay API para eso). La variable manda sobre la base. Con `--prueba` el script solo
muestra la configuración, sin tocar nada.

**Cómo se comprueba:** `https://escenia.sitios.dev/datos/salud` muestra `podcast: ok`; en el estudio el
botón «Empezar la conversación» se enciende y el invitado saluda.

## Fase 2 (solo diseño): invitados que son otras IAs

La idea: hoy viene ChatGPT, mañana Claude, después Hermes, cada uno respondiendo de verdad con su modelo.

- **Mismo motor.** ElevenLabs Agents ya trae modelos de OpenAI (GPT), de Anthropic (Claude) y de Google, y
  un «LLM propio» para cualquier servicio compatible con la API de OpenAI (por ahí entra Hermes, el modelo
  abierto de Nous Research, alojado en un proveedor como OpenRouter). No hace falta otro circuito de voz.
- **Un agente por modelo, no un modelo elegido desde el navegador.** El permiso de cambiar el modelo por
  conversación sigue apagado (si no, cualquier pedido podría elegir el modelo más caro). El script crea un
  agente por modelo de una lista cerrada con su precio (una tabla nueva en `compartido/modelos.ts`, igual que
  `LLM_AGENTE_PERMITIDOS`), y el panel firma la URL del agente que corresponde a la ficha. Los modelos caros
  (los Opus, los GPT grandes) quedan fuera salvo autorización de Richard con el precio por escrito.
- **La ficha tiene un tipo:** `historia` (lo de hoy) o `ia`. En la de tipo `ia`, el prompt no trae una
  historia: le dice que es ese modelo, que responda como sí mismo, corto y en español, que no se haga pasar
  por una persona y que diga «no lo sé» cuando no sepa. La leyenda cambia a «Voz y avatar generados por IA;
  las respuestas son del modelo X, en vivo».
- **El avatar:** el mismo robot con otro color de luz por invitado (verde, naranja, morado) y su nombre en la
  etiqueta. Sin logos de las empresas.
- **Costos:** los minutos son los mismos (8 centavos o los del plan); cambia el texto según el modelo. Un
  Claude Sonnet o un GPT medianos cuestan centavos por episodio; se muestra el precio en la ficha antes de
  grabar. Hermes por OpenRouter necesita una cuenta prepago más (decisión de Richard).
- **Qué falta para hacerlo:** la tabla de modelos con precio, el tipo de ficha, el mapa modelo → agente en la
  base, el color del robot y la leyenda por tipo. Sin cuentas nuevas para GPT, Claude y Gemini (van dentro de
  ElevenLabs); para Hermes, la cuenta del proveedor.
