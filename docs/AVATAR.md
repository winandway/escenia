# Avatar parlante de Richard — plan

> **Estado: EN PAUSA desde el 29 sep 2026.** Richard pidió guardarlo y hacer
> otras cosas antes. No se genera ni se gasta nada hasta que él diga que se
> retoma. Al retomarlo, volver a leer los precios en fal.ai.

> Pedido por Richard el 28 y 29 sep 2026. Primer avatar: él mismo, con una foto
> suya y su voz clonada (ya lista en ElevenLabs). Primera prueba: un clip de 20
> a 30 segundos. Precios y límites leídos en las páginas oficiales de fal.ai el
> **29 sep 2026**; antes de integrar se vuelven a leer.

## La decisión, en corto

- **Dónde:** fal.ai, la misma cuenta prepago que ya usamos para las imágenes
  (`FAL_KEY`). No hay cuenta nueva ni clave nueva que sacar.
- **Con qué modelo:** **Kling AI Avatar v2 Standard**. Recibe una foto y un
  audio y devuelve el video de la persona hablando, con los labios
  sincronizados. Es el más barato de los que aceptan una foto propia.
- **Dónde sale el avatar en el video:** solo en la escena **«Mi opinión»** (y
  más adelante en el gancho). Nunca en el video entero: sería caro y aburrido.
- **Tope:** 40 segundos de avatar por video. Bloqueado en código.

## Cómo funciona

```
  FOTO de Richard ──┐
  (avatar/richard.jpg)│
                     ├──►  fal.ai · Kling AI Avatar v2  ──►  clip MP4 del avatar
  VOZ de la escena ──┘      (2 a 5 minutos de espera)        (se guarda en caché)
  (ElevenLabs, ya                                                   │
   nivelada y a ritmo)                                               ▼
                                          Video 16:9: presentador al lado del titular
                                          Shorts 9:16: recorte en la cara, a pantalla llena
```

El clip se genera con **el audio final de la escena** (después de nivelar el
volumen y ajustar el ritmo). Así los labios calzan con lo que se oye.

## Precios verificados (fal.ai, 29 sep 2026)

| Modelo                          | Precio por segundo | Clip de 20 s | Clip de 30 s | Fuente                                                         |
| ------------------------------- | ------------------ | ------------ | ------------ | -------------------------------------------------------------- |
| **Kling AI Avatar v2 Standard** | **$0.0562**        | **$1.12**    | **$1.69**    | https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/standard |
| Creatify Aurora (480p)          | $0.07              | $1.40        | $2.10        | https://fal.ai/models/fal-ai/creatify/aurora                   |
| VEED Fabric 1.0 (480p)          | $0.08              | $1.60        | $2.40        | https://fal.ai/models/veed/fabric-1.0                          |
| Kling AI Avatar v2 Pro          | $0.115             | $2.30        | $3.45        | https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/pro      |
| OmniHuman v1.5 (ByteDance)      | $0.16              | $3.20        | $4.80        | https://fal.ai/models/fal-ai/bytedance/omnihuman/v1.5          |
| InfiniTalk                      | $0.20              | $4.00        | $6.00        | https://fal.ai/models/fal-ai/infinitalk                        |

Límites del modelo elegido (de su página): audio de 2 a 60 segundos, máximo
5 MB, en mp3, wav o m4a; foto jpg o png de al menos 300 px por lado.

**Costo en marcha:** un video al día con 30 segundos de avatar son $1.69 al
día, unos $51 al mes. Con el tope de 40 segundos, un video nunca pasa de $2.25
de avatar.

## La foto (lo único que pone Richard)

- De frente, mirando a la cámara, **de los hombros para arriba**.
- Boca cerrada o sonrisa leve. Sin lentes de sol, sin gorra, sin manos en la cara.
- Buena luz en la cara, fondo simple (pared, oficina ordenada).
- Tomada con el celular en horizontal o vertical, da igual. Mínimo 1080 px.
- Se guarda como `richard.jpg` en `/Users/windocellc/Motor-Escenia/avatar/`.
- La foto **no se sube al repositorio** (la carpeta está en `.gitignore`). Sí
  viaja a fal.ai para generar el clip, igual que las fotos de referencia.

## Fases

### Fase 1 — Prueba suelta (un clip de 20 segundos)

1. **Qué es:** un clip de Richard diciendo un texto corto, fuera de cualquier
   video, para juzgar la calidad antes de tocar el motor.
2. **Quién:** Richard pone la foto y da el visto bueno al gasto ($1.12). La IA
   hace todo lo demás.
3. **Qué pasa:** la IA genera el audio con la voz clonada, llama al modelo y
   deja el clip en `estacion/out/avatar-prueba/`.
4. **Cómo se comprueba:** Richard lo mira con esta lista: ¿es mi cara?, ¿los
   labios calzan?, ¿dientes y ojos se ven normales?, ¿parpadea natural?, ¿el
   fondo se queda quieto?
5. **Si no convence:** segunda prueba con OmniHuman v1.5 ($3.20 los 20
   segundos). Necesita su autorización aparte, porque pasa el tope por segundo.

### Fase 2 — Integración en el motor

1. **Candado de gasto** en `compartido/modelos.ts`: lista de avatares
   permitidos con su precio, tope por segundo ($0.06) y tope de 40 segundos por
   video. Un modelo caro configurado por error no corre.
2. **Visual nuevo «presentador»** en el guion y en la plantilla: el clip del
   avatar sin su audio, montado sobre la voz maestra.
3. **Caché** por foto y audio: volver a armar un video no paga dos veces.
4. **Respaldo visible:** si el avatar falla o se acaba el saldo, la escena sale
   como hoy (texto «Mi opinión») y queda escrito en el registro y en los
   créditos. Nunca falla en silencio.
5. **Pruebas en rojo comprobado** del candado, del tope y del respaldo.
6. **Cómo se comprueba:** `npm run verify` en verde y un video de prueba con la
   escena «Mi opinión» hablada por el avatar.

### Fase 3 — Primer video real con avatar

1. El siguiente guion sale con Richard dando su opinión en cámara.
2. En los Shorts, el mismo clip recortado en la cara, a pantalla llena.
3. **Cómo se comprueba:** cuadros del largo y de los Shorts, labios en
   sincronía, costo del trabajo dentro del tope.

### Fase 4 — Después

- Varias fotos de Richard (otra ropa, otro fondo) para que no sea siempre la
  misma toma.
- Avatar también en el gancho de los Shorts de producto.
- Otros presentadores (una presentadora con la voz femenina).

## Riesgos y cómo se cubren

| Riesgo                                  | Cómo se cubre                                                             |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Que se vea artificial                   | Prueba suelta antes de integrar; Richard decide con la lista de la Fase 1 |
| Que el gasto se dispare                 | Tope por segundo y por video en código, más el tope diario del panel      |
| Audio de más de 60 segundos             | La escena «Mi opinión» se parte en dos clips                              |
| fal.ai tarda o falla                    | Respaldo visible: la escena sale como hoy                                 |
| Cambio de precio del modelo             | La tabla de precios vive en el candado y se revisa contra la página       |
| Aviso de contenido sintético en YouTube | Se verifica la regla oficial al integrar y se marca al subir              |

## Qué NO se hace

- No se usa HeyGen ni D-ID: piden cuenta y suscripción aparte. Con fal.ai ya
  tenemos la cuenta, el prepago y el candado.
- No se genera el video entero con avatar.
- No se enciende ningún modelo fuera de la lista sin autorización escrita de
  Richard con el costo por segundo.
